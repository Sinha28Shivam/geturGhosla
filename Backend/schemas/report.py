from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from db.models import ReportStatusEnum

class ReportCreate(BaseModel):
    reason: str

class ReportRead(BaseModel):
    id: UUID
    room_id: UUID
    reporter_id: UUID
    reason: str
    status: ReportStatusEnum
    action_taken: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportResolve(BaseModel):
    action_taken: str # e.g. "dismissed", "room_flagged", "room_removed"
