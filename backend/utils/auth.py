"""
Authentication utilities for JWT tokens and password hashing
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config import settings
from models import get_db
from models.user import User, UserRole

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hash a password
    """
    return pwd_context.hash(password)

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def decode_access_token(token: str) -> Dict:
    """
    Decode and verify a JWT access token
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token
    """
    token = credentials.credentials
    
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    # user_id may be stored as int or string (UUID); compare directly
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current active user
    """
    return current_user

def require_role(allowed_roles: list):
    """
    Decorator to require specific user roles
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Normalize allowed roles to strings (support enum or raw strings)
        normalized = [r.value if hasattr(r, "value") else r for r in allowed_roles]
        user_role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        if user_role not in normalized:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join([str(r) for r in normalized])}"
            )
        return current_user
    return role_checker

def is_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Check if the current user is an admin
    """
    user_role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    admin_value = UserRole.ADMIN.value if hasattr(UserRole.ADMIN, "value") else UserRole.ADMIN
    if user_role != admin_value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def is_faculty_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Check if the current user is faculty or admin
    """
    if current_user.role not in [UserRole.FACULTY, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Faculty or admin access required")
    return current_user
