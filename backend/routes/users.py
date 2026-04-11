"""User management routes with RBAC protection."""
from datetime import date, timedelta
from uuid import UUID

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models import get_db
from models.role import Role, UserRole
from models.token_limit import UserDailyTokenUsage, UserTokenLimit
from models.user import User
from utils.auth import get_current_admin_user, get_user_roles_and_permissions, get_password_hash
from config import settings

router = APIRouter(prefix="/api/users", tags=["Users"])


class UserCreateRequest(BaseModel):
    """Request body for admin user creation."""

    email: str
    password: str = Field(..., min_length=6, max_length=100)
    roles: list[str] = Field(default_factory=lambda: ["student"])


class TokenLimitUpdateRequest(BaseModel):
    """Request to update one user's daily token limit."""

    daily_token_limit: int = Field(..., ge=1, le=1_000_000)


class BulkTokenLimitUpdateRequest(BaseModel):
    """Request to update daily token limit for all users."""

    daily_token_limit: int = Field(..., ge=1, le=1_000_000)


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


@router.get("/token-limits")
async def list_user_token_limits(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """List all users with daily token limit and today's usage (admin-only)."""
    users = db.query(User).all()
    today = date.today()

    data = []
    for user in users:
        limit_row = db.query(UserTokenLimit).filter(UserTokenLimit.user_id == user.id).first()
        usage_row = (
            db.query(UserDailyTokenUsage)
            .filter(
                UserDailyTokenUsage.user_id == user.id,
                UserDailyTokenUsage.usage_date == today,
            )
            .first()
        )
        roles, _ = get_user_roles_and_permissions(user)
        daily_limit = int(limit_row.daily_token_limit) if limit_row else int(settings.DEFAULT_DAILY_TOKEN_LIMIT)
        daily_used = int(usage_row.tokens_used) if usage_row else 0

        data.append(
            {
                "user_id": str(user.id),
                "email": user.email,
                "roles": roles,
                "daily_token_limit": daily_limit,
                "today_used_tokens": daily_used,
                "today_remaining_tokens": max(0, daily_limit - daily_used),
            }
        )

    return {"users": data, "total": len(data), "usage_date": today.isoformat()}


@router.put("/{user_id}/token-limit")
async def update_user_token_limit(
    user_id: str,
    payload: TokenLimitUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Set a daily token limit for a target user (admin-only)."""
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    limit_row = db.query(UserTokenLimit).filter(UserTokenLimit.user_id == target_user_id).first()
    if not limit_row:
        limit_row = UserTokenLimit(user_id=target_user_id)
        db.add(limit_row)

    limit_row.daily_token_limit = int(payload.daily_token_limit)
    limit_row.updated_by = admin_user.id
    db.commit()
    db.refresh(limit_row)

    return {
        "user_id": str(target_user_id),
        "daily_token_limit": int(limit_row.daily_token_limit),
        "updated_by": str(admin_user.id),
        "updated_at": limit_row.updated_at.isoformat() if limit_row.updated_at else None,
    }


@router.put("/token-limits/bulk")
async def bulk_update_user_token_limits(
    payload: BulkTokenLimitUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
):
    """Set one daily token limit value for all users (admin-only)."""
    users = db.query(User).all()
    if not users:
        return {
            "updated_users": 0,
            "daily_token_limit": int(payload.daily_token_limit),
            "updated_by": str(admin_user.id),
        }

    limits_by_user = {
        str(limit.user_id): limit
        for limit in db.query(UserTokenLimit).all()
    }

    for user in users:
        key = str(user.id)
        limit_row = limits_by_user.get(key)
        if not limit_row:
            limit_row = UserTokenLimit(user_id=user.id)
            db.add(limit_row)

        limit_row.daily_token_limit = int(payload.daily_token_limit)
        limit_row.updated_by = admin_user.id

    db.commit()

    return {
        "updated_users": len(users),
        "daily_token_limit": int(payload.daily_token_limit),
        "updated_by": str(admin_user.id),
    }


@router.get("/{user_id}/token-usage")
async def get_user_token_usage(
    user_id: str,
    days: int = 7,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Get daily token usage trend for one user (admin-only)."""
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    if days < 1 or days > 90:
        raise HTTPException(status_code=400, detail="days must be between 1 and 90")

    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    start_date = date.today() - timedelta(days=days - 1)
    usage_rows = (
        db.query(UserDailyTokenUsage)
        .filter(
            UserDailyTokenUsage.user_id == target_user_id,
            UserDailyTokenUsage.usage_date >= start_date,
        )
        .order_by(UserDailyTokenUsage.usage_date.asc())
        .all()
    )

    return {
        "user_id": str(target_user_id),
        "email": user.email,
        "days": days,
        "usage": [
            {
                "usage_date": row.usage_date.isoformat(),
                "tokens_used": int(row.tokens_used),
                "request_count": int(row.request_count),
            }
            for row in usage_rows
        ],
    }
