from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class RoomImageBase(BaseModel):
    image_url: str
    is_primary: Optional[bool] = False
    sort_order: Optional[int] = 0

class RoomImageCreate(RoomImageBase):
    pass

class RoomImageRead(RoomImageBase):
    id: UUID
    room_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ImageReorder(BaseModel):
    image_ids: List[UUID]
