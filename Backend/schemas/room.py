from pydantic import BaseModel, condecimal
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from db.models import RoomTypeEnum, RoomStatusEnum

class RoomBase(BaseModel):
    title: str
    description: Optional[str] = None
    room_type: RoomTypeEnum
    monthly_rent: condecimal(ge=0)
    security_deposit: Optional[condecimal(ge=0)] = 0
    address_line: str
    locality: Optional[str] = None
    city: str
    state: Optional[str] = None
    pincode: Optional[str] = None
    lat: float
    lng: float

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    room_type: Optional[RoomTypeEnum] = None
    monthly_rent: Optional[condecimal(ge=0)] = None
    security_deposit: Optional[condecimal(ge=0)] = None
    address_line: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class RoomInDBBase(RoomBase):
    id: UUID
    owner_id: UUID
    status: RoomStatusEnum
    view_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RoomRead(RoomInDBBase):
    distance_km: Optional[float] = None
