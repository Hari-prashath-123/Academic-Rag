"""Course and course-material routes for course-wise uploads."""
import os
import shutil
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from models import get_db
from models.course_material import Course, CourseMaterial, MaterialType
from models.user import User
from utils.auth import get_current_active_user, get_current_admin_user, get_current_faculty_or_admin_user

router = APIRouter(prefix="/api/course-materials", tags=["Course Materials"])


class CourseCreateRequest(BaseModel):
    code: str
    name: str
    semester: str | None = None


@router.post("/courses", status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_faculty_or_admin_user),
):
    """Create a course (admin/faculty/advisor)."""
    normalized_code = payload.code.strip().upper()
    existing = db.query(Course).filter(Course.code == normalized_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")

    course = Course(
        code=normalized_code,
        name=payload.name.strip(),
        semester=payload.semester.strip() if payload.semester else None,
        created_by=current_user.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return {
        "id": str(course.id),
        "code": course.code,
        "name": course.name,
        "semester": course.semester,
    }


@router.get("/courses")
async def list_courses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """List all courses for material upload filtering."""
    courses = db.query(Course).order_by(Course.code.asc()).all()
    return {
        "courses": [
            {
                "id": str(course.id),
                "code": course.code,
                "name": course.name,
                "semester": course.semester,
            }
            for course in courses
        ],
        "total": len(courses),
    }


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    title: str = Form(...),
    material_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_faculty_or_admin_user),
):
    """Upload course-wise material (pdf/notes/question paper). Available to faculty/admin/advisor."""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        # Normalize material_type to lowercase
        material_type_lower = material_type.lower().strip()
        try:
            material_type_enum = MaterialType(material_type_lower)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid material type: {material_type}")


        course = db.query(Course).filter(Course.id == UUID(course_id)).first()
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail="File exceeds max upload size")

        material_dir = os.path.join(settings.UPLOAD_FOLDER, "course_materials", course.code)
        os.makedirs(material_dir, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_name = file.filename.replace(" ", "_")
        saved_name = f"{timestamp}_{safe_name}"
        file_path = os.path.join(material_dir, saved_name)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        material = CourseMaterial(
            course_id=course.id,
            title=title.strip(),
            material_type=material_type_enum,
            file_path=file_path,
            file_size=file_size,
            uploaded_by=current_user.id,
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        return {
            "id": str(material.id),
            "course_id": str(material.course_id),
            "title": material.title,
            "material_type": material.material_type.value,
            "file_path": material.file_path,
            "file_size": material.file_size,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Upload failed: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.get("/")
async def list_materials(
    course_id: str | None = None,
    material_type: MaterialType | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """List course materials, optionally filtered by course and type."""
    query = db.query(CourseMaterial).filter(CourseMaterial.is_deleted.is_(False))

    if course_id:
        query = query.filter(CourseMaterial.course_id == UUID(course_id))
    if material_type:
        query = query.filter(CourseMaterial.material_type == material_type)

    rows = query.order_by(CourseMaterial.uploaded_at.desc()).all()
    return {
        "materials": [
            {
                "id": str(row.id),
                "course": {
                    "id": str(row.course.id),
                    "code": row.course.code,
                    "name": row.course.name,
                },
                "title": row.title,
                "material_type": row.material_type.value,
                "file_path": row.file_path,
                "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
            }
            for row in rows
        ],
        "total": len(rows),
    }
