"""
OBE (Outcome-Based Education) analytics routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import get_db
from models.user import User
from models.mark import Mark
from utils.schemas import (
    MarkCreate,
    MarkResponse,
    COAttainmentRequest,
    COAttainmentResponse,
    BloomMappingResponse,
    OBEReportRequest
)
from utils.auth import get_current_active_user, is_faculty_or_admin
from services.obe_analytics import OBEAnalytics

router = APIRouter(prefix="/obe", tags=["OBE Analytics"])

@router.post("/marks", response_model=MarkResponse, status_code=status.HTTP_201_CREATED)
async def add_marks(
    mark_data: MarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Add marks for a student (Faculty/Admin only)
    
    - **student_id**: Student's user ID
    - **subject**: Subject name
    - **assessment_type**: Type of assessment (CIA1, CIA2, SAA1, SAA2, etc.)
    - **marks_obtained**: Marks scored by student
    - **max_marks**: Maximum marks for assessment
    - **co_mapping**: Mapping to Course Outcomes (optional)
    - **bloom_level**: Bloom's taxonomy level (optional)
    """
    new_mark = Mark(
        student_id=mark_data.student_id,
        subject=mark_data.subject,
        assessment_type=mark_data.assessment_type,
        assessment_name=mark_data.assessment_name,
        marks_obtained=mark_data.marks_obtained,
        max_marks=mark_data.max_marks,
        co_mapping=mark_data.co_mapping,
        bloom_level=mark_data.bloom_level,
        unit=mark_data.unit,
        question_number=mark_data.question_number,
        semester=mark_data.semester,
        academic_year=mark_data.academic_year,
        recorded_by=current_user.id
    )
    
    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)
    
    return new_mark.to_dict()

@router.get("/marks", response_model=list[MarkResponse])
async def get_marks(
    student_id: Optional[int] = None,
    subject: Optional[str] = None,
    semester: Optional[str] = None,
    academic_year: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get marks with optional filters
    
    Students can only see their own marks.
    Faculty/Admin can see all marks.
    """
    query = db.query(Mark)
    
    # Students can only see their own marks
    if current_user.role.value == "student":
        query = query.filter(Mark.student_id == current_user.id)
    elif student_id:
        query = query.filter(Mark.student_id == student_id)
    
    # Apply other filters
    if subject:
        query = query.filter(Mark.subject == subject)
    if semester:
        query = query.filter(Mark.semester == semester)
    if academic_year:
        query = query.filter(Mark.academic_year == academic_year)
    
    marks = query.offset(skip).limit(limit).all()
    
    return [mark.to_dict() for mark in marks]

@router.post("/co-attainment")
async def get_co_attainment(
    request: COAttainmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Calculate CO (Course Outcome) attainment for a subject
    
    Requires faculty or admin role
    
    Returns:
    - CO-wise attainment percentages
    - Overall attainment
    - Pass percentage
    - Student statistics
    """
    analytics = OBEAnalytics()
    
    result = analytics.calculate_co_attainment(
        db=db,
        subject=request.subject,
        semester=request.semester,
        academic_year=request.academic_year
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/bloom-mapping")
async def get_bloom_mapping(
    request: COAttainmentRequest,  # Reuse same request schema
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Get Bloom's taxonomy level distribution for a subject
    
    Requires faculty or admin role
    
    Returns:
    - Bloom's level distribution
    - Question count by level
    - Marks distribution
    """
    analytics = OBEAnalytics()
    
    result = analytics.calculate_bloom_mapping(
        db=db,
        subject=request.subject,
        semester=request.semester,
        academic_year=request.academic_year
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.post("/generate-report")
async def generate_obe_report(
    request: OBEReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Generate comprehensive OBE report
    
    Requires faculty or admin role
    
    - **report_type**: comprehensive, co_attainment, or bloom_analysis
    
    Returns complete analytics report with:
    - CO attainment
    - Bloom's taxonomy distribution
    - Assessment distribution
    - Unit-wise analysis
    """
    analytics = OBEAnalytics()
    
    report = analytics.generate_obe_report(
        db=db,
        subject=request.subject,
        semester=request.semester,
        academic_year=request.academic_year,
        report_type=request.report_type
    )
    
    return report

@router.get("/student-performance/{student_id}")
async def get_student_performance(
    student_id: int,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get individual student performance analysis
    
    Students can only view their own performance.
    Faculty/Admin can view any student's performance.
    """
    # Authorization check
    if current_user.role.value == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other students' performance"
        )
    
    analytics = OBEAnalytics()
    
    result = analytics.get_student_performance(
        db=db,
        student_id=student_id,
        subject=subject
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@router.get("/subjects")
async def get_subjects_with_marks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of subjects with marks data
    """
    subjects = db.query(Mark.subject).distinct().all()
    
    return {
        "subjects": [subject[0] for subject in subjects if subject[0]]
    }

@router.delete("/marks/{mark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mark(
    mark_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(is_faculty_or_admin)
):
    """
    Delete a mark entry (Faculty/Admin only)
    """
    mark = db.query(Mark).filter(Mark.id == mark_id).first()
    
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    
    db.delete(mark)
    db.commit()
    
    return None
