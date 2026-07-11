from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from db.models import InterestStatusEnum
from schemas.room import RoomSummary
from schemas.user import UserPublicSummary

class InterestBase(BaseModel):
    message: Optional[str] = None

class InterestCreate(InterestBase):
    pass

class InterestUpdateStatus(BaseModel):
    status: InterestStatusEnum

class InterestRead(InterestBase):
    id: UUID
    room_id: UUID
    seeker_id: UUID
    status: InterestStatusEnum
    created_at: datetime
    room: RoomSummary
    seeker: UserPublicSummary

    class Config:
        from_attributes = True
