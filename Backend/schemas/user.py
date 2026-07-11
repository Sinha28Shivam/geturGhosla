from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr  # Email is required for Phase 1 OTP via email

class UserCreateWithPassword(UserCreate):
    password: str = Field(..., max_length=72, description="Password cannot exceed 72 characters due to bcrypt limits")

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None

class UserPublicSummary(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserInDBBase(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserRead(UserInDBBase):
    pass
