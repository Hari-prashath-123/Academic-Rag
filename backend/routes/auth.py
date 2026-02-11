"""
Authentication routes for user registration, login, and profile
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from models import get_db
from models.user import User
from utils.schemas import UserRegister, UserLogin, Token, UserResponse
from utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user
)
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    
    - **name**: User's full name
    - **email**: User's email address (must be unique)
    - **password**: User's password (minimum 6 characters)
    - **role**: User role (student, faculty, admin) - default: student
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        college_id=user_data.college_id if hasattr(user_data, 'college_id') else None
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user.to_dict()

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password
    
    Returns JWT access token
    """
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    user_role_value = user.role.value if hasattr(user.role, 'value') else user.role
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user_role_value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Get current user profile
    
    Requires authentication
    """
    return current_user.to_dict()

@router.get("/users", response_model=list[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all users (admin/faculty only)
    
    Requires authentication and faculty/admin role
    """
    # Check authorization
    if current_user.role.value not in ["faculty", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view all users"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    return [user.to_dict() for user in users]
