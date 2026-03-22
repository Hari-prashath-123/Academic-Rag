"""Authentication utilities for JWT tokens, password hashing, and RBAC guards."""
from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.orm import Session

import bcrypt

from config import settings
from models import get_db
from models.user import User

# Password hashing context
password_hash = PasswordHash.recommended()

# Security scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against argon2 hashes and legacy bcrypt hashes."""
    if not hashed_password:
        return False

    try:
        return password_hash.verify(plain_password, hashed_password)
    except UnknownHashError:
        # Backward compatibility for legacy bcrypt hashes stored before pwdlib migration.
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        return False


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return password_hash.hash(password)


def needs_password_rehash(hashed_password: str) -> bool:
    """Return True when the stored hash should be upgraded to current scheme."""
    if not hashed_password:
        return False
    return hashed_password.startswith(("$2a$", "$2b$", "$2y$"))


def get_user_roles_and_permissions(user: User) -> tuple[list[str], list[str]]:
    """Build role and permission lists from RBAC relationships."""
    roles = sorted({assignment.role.name for assignment in user.user_roles if assignment.role is not None})
    permissions = sorted(
        {
            permission.permission_name
            for assignment in user.user_roles
            if assignment.role is not None
            for permission in assignment.role.permissions
        }
    )
    return roles, permissions


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Dict:
    """Decode and verify a JWT access token."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT token."""
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


def get_current_user_access(current_user: User = Depends(get_current_user)) -> Dict:
    """Get current user plus resolved roles and permissions."""
    roles, permissions = get_user_roles_and_permissions(current_user)
    return {
        "user": current_user,
        "roles": roles,
        "permissions": permissions,
    }


def require_roles(allowed_roles: list[str]):
    """Dependency factory to protect endpoints by role names."""

    def role_checker(user_access: Dict = Depends(get_current_user_access)) -> Dict:
        current_roles = set(user_access["roles"])
        if not current_roles.intersection(set(allowed_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(sorted(set(allowed_roles)))}",
            )
        return user_access

    return role_checker


def require_permissions(required_permissions: list[str]):
    """Dependency factory to protect endpoints by permission names."""

    def permission_checker(user_access: Dict = Depends(get_current_user_access)) -> Dict:
        current_permissions = set(user_access["permissions"])
        if not set(required_permissions).issubset(current_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Missing required permissions: "
                    f"{', '.join(sorted(set(required_permissions) - current_permissions))}"
                ),
            )
        return user_access

    return permission_checker


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Backward-compatible alias for protected dependencies."""
    return current_user


def is_faculty_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Check if current user has faculty or admin role."""
    roles, _ = get_user_roles_and_permissions(current_user)
    if not any(role in ("faculty", "admin", "advisor") for role in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty or admin access required",
        )
    return current_user


def get_current_admin_user(user_access: Dict = Depends(require_roles(["admin"]))) -> User:
    """Dependency that allows only admin users."""
    return user_access["user"]


def get_current_faculty_user(user_access: Dict = Depends(require_roles(["faculty"]))) -> User:
    """Dependency that allows only faculty users."""
    return user_access["user"]


def get_current_faculty_or_admin_user(
    user_access: Dict = Depends(require_roles(["faculty", "admin", "advisor"]))
) -> User:
    """Dependency that allows faculty or admin or advisor users."""
    return user_access["user"]
