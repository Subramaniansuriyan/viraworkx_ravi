"""
ViraWorkX ATS — Auth Routes
Login, register, and user management.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)
from models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


# -- Pydantic Schemas --
class LoginRequest(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "viewer"
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    req: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Register a new team member (admin only)."""
    # Check for existing user
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role,
        phone=req.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return UserResponse.model_validate(user)


@router.get("/team", response_model=list[UserResponse])
async def list_team(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all team members."""
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.full_name))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]
