from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room
from schemas.room import RoomRead
from db.models import User
import json

router = APIRouter()

# Simple in-memory fallback for compare set if Redis isn't installed/configured
COMPARE_STORAGE = {}

@router.post("/{roomId}", status_code=status.HTTP_201_CREATED)
def add_to_compare(
    roomId: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a room to compare set (Max 4)."""
    room = get_room(db, room_id=str(roomId))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    user_id = str(current_user.id)
    user_set = COMPARE_STORAGE.setdefault(user_id, set())
    if len(user_set) >= 4 and str(roomId) not in user_set:
        raise HTTPException(status_code=400, detail="Cannot compare more than 4 rooms at a time")
        
    user_set.add(str(roomId))
    return {"message": "Room added to compare list", "count": len(user_set)}

@router.delete("/{roomId}")
def remove_from_compare(
    roomId: UUID,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a room from compare set."""
    user_id = str(current_user.id)
    user_set = COMPARE_STORAGE.get(user_id, set())
    user_set.discard(str(roomId))
    return {"message": "Room removed from compare list", "count": len(user_set)}

@router.get("/", response_model=List[RoomRead])
def get_compare_list(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get full details of all rooms in compare set."""
    user_id = str(current_user.id)
    user_set = COMPARE_STORAGE.get(user_id, set())
    
    rooms = []
    for r_id in user_set:
        r = get_room(db, room_id=r_id)
        if r:
            rooms.append(r)
    return rooms

@router.delete("/")
def clear_compare_list(
    current_user: User = Depends(get_current_active_user)
):
    """Clear all rooms from compare set."""
    user_id = str(current_user.id)
    COMPARE_STORAGE[user_id] = set()
    return {"message": "Compare list cleared"}
