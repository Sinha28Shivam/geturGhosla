from pydantic import BaseModel, EmailStr
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
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None

class UserInDBBase(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserRead(UserInDBBase):
    pass
