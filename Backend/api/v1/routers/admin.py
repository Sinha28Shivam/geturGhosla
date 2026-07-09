from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room
from schemas.room import RoomRead
from db.models import User, Room, RoomStatusEnum
from pydantic import BaseModel

router = APIRouter()

# In a real app, this dependency should check if the user has an 'admin' role.
# For MVP, we will assume any active user can access this (or you can add a simple check).
def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    # Placeholder for admin check.
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

@router.get("/rooms/pending", response_model=List[RoomRead])
def read_pending_rooms(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Get all rooms pending review, oldest first.
    """
    rooms = db.query(Room).filter(Room.status == RoomStatusEnum.pending_review).order_by(Room.created_at.asc()).all()
    return rooms

class RoomStatusUpdate(BaseModel):
    status: RoomStatusEnum
    reason: str = None # Required if rejecting or flagging

@router.patch("/rooms/{id}/status", response_model=RoomRead)
def update_room_status(
    id: UUID,
    status_update: RoomStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Approve, reject, or flag a room.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if status_update.status in [RoomStatusEnum.flagged, RoomStatusEnum.inactive] and not status_update.reason:
        raise HTTPException(status_code=400, detail="Reason is required when flagging or rejecting a listing")
        
    room.status = status_update.status
    # If we had a table for moderation logs, we would log the 'reason' here.
    
    db.add(room)
    db.commit()
    db.refresh(room)
    return room
