from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class ReviewRead(BaseModel):
    id: UUID
    room_id: UUID
    reviewer_id: UUID
    rating: int
    comment: Optional[str] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
