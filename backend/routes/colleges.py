"""
API routes for managing colleges (Multi-College support)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import get_db
from models.college import College
from utils.schemas import CollegeCreate, CollegeResponse
from utils.auth import get_current_active_user, is_admin

router = APIRouter(prefix="/colleges", tags=["Colleges"])


@router.post("/", response_model=CollegeResponse, status_code=status.HTTP_201_CREATED)
async def create_college(
    college_in: CollegeCreate,
    db: Session = Depends(get_db),
    admin_user = Depends(is_admin)
):
    """Create a new college (Admin only)"""
    # Check for existing code
    existing = db.query(College).filter(College.code == college_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="College code already exists")

    college = College(
        name=college_in.name,
        code=college_in.code,
        address=college_in.address
    )

    db.add(college)
    db.commit()
    db.refresh(college)

    return CollegeResponse.from_orm(college)


@router.get("/", response_model=List[CollegeResponse])
async def list_colleges(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """List all colleges"""
    colleges = db.query(College).order_by(College.name.asc()).all()
    return [CollegeResponse.from_orm(c) for c in colleges]


@router.get("/{college_id}", response_model=CollegeResponse)
async def get_college(
    college_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get college by ID"""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    return CollegeResponse.from_orm(college)
