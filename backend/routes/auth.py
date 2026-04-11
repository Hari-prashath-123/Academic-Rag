"""Authentication routes for user registration, login, and profile."""
from datetime import timedelta
from typing import Optional
import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from config import settings
from models import get_db
from models.role import Role, UserRole
from models.user import Profile, User
from utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_current_user_access,
    get_password_hash,
    get_user_roles_and_permissions,
    needs_password_rehash,
    verify_password,
)


def validate_email(email: str) -> str:
    """Permissive email validation that accepts .local domains."""
    # Simple regex: at least one char, @, domain name, . and extension
    pattern = r'^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError('Invalid email format')
    return email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
accounts_router = APIRouter(prefix="/api/accounts", tags=["Accounts Authentication"])


@router.get("/login-page")
async def login_page() -> RedirectResponse:
    """Redirect login-page requests to the Django admin login screen."""
    return RedirectResponse(url="/admin/login/?next=/admin/", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


class RegisterRequest(BaseModel):
    """Request body for user registration."""

    email: str
    password: str = Field(..., min_length=6, max_length=100)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    default_role: str = "student"

    @field_validator('email')
    def validate_email_field(cls, v):
        return validate_email(v)


class LoginRequest(BaseModel):
    """Request body for login."""

    email: str
    password: str

    @field_validator('email')
    def validate_email_field(cls, v):
        return validate_email(v)


class TokenResponse(BaseModel):
    """JWT response payload."""

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token exchange request body."""

    refresh: str


class MeResponse(BaseModel):
    """Authenticated user profile and access details."""

    id: str
    email: str
    profile: dict
    roles: list[str]
    permissions: list[str]


def _get_or_create_role(db: Session, role_name: str) -> Role:
    """Fetch role by name or create it if missing."""
    normalized_name = role_name.strip().lower()
    role = db.query(Role).filter(Role.name == normalized_name).first()
    if role:
        return role

    role = Role(name=normalized_name, description=f"Default role: {normalized_name}")
    db.add(role)
    db.flush()
    return role


def _build_token_response(user: User) -> dict:
    """Return a fresh access/refresh token pair for a user."""
    roles, _ = get_user_roles_and_permissions(user)

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "roles": roles,
    }

    access_token = create_access_token(
        data=token_payload,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data=token_payload)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user, hash password, and assign a default role."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    role = _get_or_create_role(db, user_data.default_role or "student")

    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
    )
    db.add(new_user)
    db.flush()

    db.add(UserRole(user_id=new_user.id, role_id=role.id))

    db.add(
        Profile(
            user_id=new_user.id,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            avatar_url=user_data.avatar_url,
            phone=user_data.phone,
        )
    )

    db.commit()
    db.refresh(new_user)

    roles, permissions = get_user_roles_and_permissions(new_user)
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "roles": roles,
        "permissions": permissions,
    }


@router.post("/login", response_model=TokenResponse)
async def login(user_data: LoginRequest, db: Session = Depends(get_db)):
    """Verify credentials and return a JWT containing user id and roles."""
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if needs_password_rehash(user.password_hash):
        user.password_hash = get_password_hash(user_data.password)
        db.add(user)
        db.commit()
        db.refresh(user)

    return _build_token_response(user)


@router.post("/token", response_model=TokenResponse)
async def issue_token(user_data: LoginRequest, db: Session = Depends(get_db)):
    """Compatibility alias for login using token endpoint naming."""
    return await login(user_data=user_data, db=db)


@router.post("/token/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Issue a new token pair from a valid refresh token."""
    decoded = decode_access_token(payload.refresh, expected_token_type="refresh")
    user_id = decoded.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return _build_token_response(user)


@router.get("/me", response_model=MeResponse)
async def get_current_user_profile(user_access: dict = Depends(get_current_user_access)):
    """Protected route returning current user profile and permissions."""
    current_user: User = user_access["user"]
    profile = current_user.profile

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "profile": {
            "first_name": profile.first_name if profile else None,
            "last_name": profile.last_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "phone": profile.phone if profile else None,
        },
        "roles": user_access["roles"],
        "permissions": user_access["permissions"],
    }


@accounts_router.post("/token", response_model=TokenResponse)
@accounts_router.post("/token/", response_model=TokenResponse)
async def accounts_issue_token(user_data: LoginRequest, db: Session = Depends(get_db)):
    """Django/DRF-style token endpoint alias."""
    return await issue_token(user_data=user_data, db=db)


@accounts_router.post("/token/refresh", response_model=TokenResponse)
@accounts_router.post("/token/refresh/", response_model=TokenResponse)
async def accounts_refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Django/DRF-style refresh endpoint alias."""
    return await refresh_token(payload=payload, db=db)


@accounts_router.get("/me", response_model=MeResponse)
@accounts_router.get("/me/", response_model=MeResponse)
async def accounts_get_current_user_profile(user_access: dict = Depends(get_current_user_access)):
    """Django/DRF-style me endpoint alias."""
    return await get_current_user_profile(user_access=user_access)
