"""Authentication routes for user registration, login, and profile."""
from datetime import timedelta
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from config import settings
from models import get_db
from models.role import Role, UserRole
from models.user import Profile, User
from utils.auth import (
    create_access_token,
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


@router.get("/login-page", response_class=HTMLResponse)
async def login_page() -> HTMLResponse:
        """Simple backend login page for manual authentication testing."""
        return HTMLResponse(
                """
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Backend Login</title>
    <style>
        body { font-family: Segoe UI, Arial, sans-serif; background:#f5f7fb; margin:0; }
        .wrap { max-width:420px; margin:60px auto; background:#fff; border:1px solid #dfe3eb; border-radius:12px; padding:24px; }
        h1 { margin:0 0 8px; font-size:22px; }
        p { margin:0 0 18px; color:#555; font-size:14px; }
        label { display:block; margin:10px 0 6px; font-size:14px; }
        input { width:100%; padding:10px; border:1px solid #c8d0dd; border-radius:8px; box-sizing:border-box; }
        button { margin-top:14px; width:100%; padding:10px; border:0; background:#0d6efd; color:#fff; border-radius:8px; cursor:pointer; }
        pre { margin-top:14px; background:#0b1020; color:#d6e2ff; padding:10px; border-radius:8px; overflow:auto; font-size:12px; }
        .err { margin-top:10px; color:#b00020; font-size:13px; }
    </style>
</head>
<body>
    <div class="wrap">
        <h1>Backend Login</h1>
        <p>Posts to /api/auth/login and stores token in localStorage.</p>
        <form id="loginForm">
            <label for="email">Email</label>
            <input id="email" type="email" required />
            <label for="password">Password</label>
            <input id="password" type="password" required />
            <button type="submit">Login</button>
        </form>
        <div id="error" class="err"></div>
        <pre id="result" hidden></pre>
    </div>
    <script>
        const form = document.getElementById('loginForm');
        const error = document.getElementById('error');
        const result = document.getElementById('result');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            error.textContent = '';
            result.hidden = true;
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Login failed');
                }
                localStorage.setItem('token', data.access_token);
                result.hidden = false;
                result.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                error.textContent = err.message || 'Login failed';
            }
        });
    </script>
</body>
</html>
                """
        )


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
    token_type: str = "bearer"


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

    roles, _ = get_user_roles_and_permissions(user)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {"access_token": access_token, "token_type": "bearer"}


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
