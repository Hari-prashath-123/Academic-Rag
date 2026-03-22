"""Advisor-student mapping routes (admin feature)."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import get_db
from models.advisor_mapping import AdvisorStudentMapping
from models.user import User
from utils.auth import get_current_admin_user, get_current_faculty_or_admin_user, get_user_roles_and_permissions

router = APIRouter(prefix="/api/advisor-mappings", tags=["Advisor Mapping"])


class AdvisorMappingCreateRequest(BaseModel):
    advisor_id: str
    student_ids: list[str]


@router.get("/")
async def list_mappings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """List all advisor-to-student mappings (admin-only)."""
    mappings = db.query(AdvisorStudentMapping).all()
    data = []
    for mapping in mappings:
        data.append(
            {
                "id": str(mapping.id),
                "advisor": {
                    "id": str(mapping.advisor.id),
                    "email": mapping.advisor.email,
                },
                "student": {
                    "id": str(mapping.student.id),
                    "email": mapping.student.email,
                },
                "assigned_at": mapping.assigned_at.isoformat() if mapping.assigned_at else None,
            }
        )

    return {"mappings": data, "total": len(data)}


@router.post("/assign", status_code=status.HTTP_201_CREATED)
async def assign_students_to_advisor(
    payload: AdvisorMappingCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Assign multiple students to one advisor (admin-only)."""
    advisor = db.query(User).filter(User.id == UUID(payload.advisor_id)).first()
    if advisor is None:
        raise HTTPException(status_code=404, detail="Advisor user not found")

    advisor_roles, _ = get_user_roles_and_permissions(advisor)
    # Accept 'faculty' or 'advisor' or 'admin' as valid advisor roles
    if not any(r in ("faculty", "advisor", "admin") for r in advisor_roles):
        raise HTTPException(status_code=400, detail="Selected advisor must have faculty/advisor/admin role")

    created = []
    skipped = []

    for student_id in payload.student_ids:
        student = db.query(User).filter(User.id == UUID(student_id)).first()
        if student is None:
            skipped.append({"student_id": student_id, "reason": "User not found"})
            continue

        student_roles, _ = get_user_roles_and_permissions(student)
        if "student" not in student_roles:
            skipped.append({"student_id": student_id, "reason": "User is not a student"})
            continue

        existing = (
            db.query(AdvisorStudentMapping)
            .filter(
                AdvisorStudentMapping.advisor_id == advisor.id,
                AdvisorStudentMapping.student_id == student.id,
            )
            .first()
        )
        if existing:
            skipped.append({"student_id": student_id, "reason": "Already assigned"})
            continue

        mapping = AdvisorStudentMapping(advisor_id=advisor.id, student_id=student.id)
        db.add(mapping)
        db.flush()
        created.append(
            {
                "id": str(mapping.id),
                "advisor_id": str(mapping.advisor_id),
                "student_id": str(mapping.student_id),
            }
        )

    db.commit()

    return {
        "advisor_id": payload.advisor_id,
        "created": created,
        "skipped": skipped,
    }


@router.get("/advisor/{advisor_id}/students")
async def get_students_for_advisor(
    advisor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_faculty_or_admin_user),
):
    """Return students mapped to a specific advisor (faculty can view self, admin can view all)."""
    advisor_uuid = UUID(advisor_id)
    current_roles, _ = get_user_roles_and_permissions(current_user)
    if "admin" not in current_roles and current_user.id != advisor_uuid:
        raise HTTPException(status_code=403, detail="You can view only your own advisees")

    mappings = db.query(AdvisorStudentMapping).filter(AdvisorStudentMapping.advisor_id == advisor_uuid).all()
    return {
        "advisor_id": advisor_id,
        "students": [
            {
                "mapping_id": str(mapping.id),
                "student_id": str(mapping.student.id),
                "student_email": mapping.student.email,
            }
            for mapping in mappings
        ],
    }


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Delete an advisor-student mapping (admin-only)."""
    mapping = db.query(AdvisorStudentMapping).filter(AdvisorStudentMapping.id == UUID(mapping_id)).first()
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.delete(mapping)
    db.commit()
    return None
