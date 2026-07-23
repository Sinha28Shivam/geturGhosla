from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from db.models import RoomTypeEnum

class SavedSearchCreate(BaseModel):
    city: Optional[str] = None
    room_type: Optional[RoomTypeEnum] = None
    min_rent: Optional[float] = None
    max_rent: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None

class SavedSearchRead(BaseModel):
    id: UUID
    user_id: UUID
    city: Optional[str] = None
    room_type: Optional[RoomTypeEnum] = None
    min_rent: Optional[float] = None
    max_rent: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
