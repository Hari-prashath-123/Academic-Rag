"""User management routes with RBAC protection."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models import get_db
from models.role import Role, UserRole
from models.user import User
from utils.auth import get_current_admin_user, get_user_roles_and_permissions, get_password_hash

router = APIRouter(prefix="/api/users", tags=["Users"])


class UserCreateRequest(BaseModel):
    """Request body for admin user creation."""

    email: str
    password: str = Field(..., min_length=6, max_length=100)
    roles: list[str] = Field(default_factory=lambda: ["student"])


@router.get("/")
async def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """List all users, optionally filtered by role."""
    users = db.query(User).all()

    data = []
    for user in users:
        roles, permissions = get_user_roles_and_permissions(user)
        if role and role not in roles:
            continue

        data.append(
            {
                "id": str(user.id),
                "email": user.email,
                "roles": roles,
                "permissions": permissions,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )

    return {"users": data, "total": len(data)}


@router.get("/faculty")
async def list_faculty_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """List users with faculty role for advisor mapping UI."""
    users = db.query(User).all()
    faculty = []
    for user in users:
        roles, _ = get_user_roles_and_permissions(user)
        if "faculty" in roles:
            faculty.append({"id": str(user.id), "email": user.email, "roles": roles})
    return {"faculty": faculty, "total": len(faculty)}


@router.get("/students")
async def list_student_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """List users with student role for advisor mapping UI."""
    users = db.query(User).all()
    students = []
    for user in users:
        roles, _ = get_user_roles_and_permissions(user)
        if "student" in roles:
            students.append({"id": str(user.id), "email": user.email, "roles": roles})
    return {"students": students, "total": len(students)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Create a new user (admin-only)."""
    normalized_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(email=normalized_email, password_hash=get_password_hash(payload.password))
    db.add(new_user)
    db.flush()

    assigned_roles = []
    for role_name in {r.strip().lower() for r in payload.roles if r.strip()}:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role is None:
            role = Role(name=role_name, description=f"Auto-created role: {role_name}")
            db.add(role)
            db.flush()
        db.add(UserRole(user_id=new_user.id, role_id=role.id))
        assigned_roles.append(role_name)

    db.commit()
    db.refresh(new_user)

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "roles": sorted(assigned_roles),
    }
