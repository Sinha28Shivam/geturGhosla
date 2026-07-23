from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room
from schemas.room import RoomRead
from db.models import User
from core.redis_client import redis_client

router = APIRouter()

COMPARE_FALLBACK = {}

def get_user_compare_key(user_id: str) -> str:
    return f"compare:{user_id}"

@router.post("/{roomId}", status_code=status.HTTP_201_CREATED)
def add_to_compare(
    roomId: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a room to compare set (Max 4, backed by Redis)."""
    room = get_room(db, room_id=str(roomId))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    user_id = str(current_user.id)
    str_room_id = str(roomId)

    if redis_client:
        key = get_user_compare_key(user_id)
        if redis_client.scard(key) >= 4 and not redis_client.sismember(key, str_room_id):
            raise HTTPException(status_code=400, detail="Cannot compare more than 4 rooms at a time")
        redis_client.sadd(key, str_room_id)
        count = redis_client.scard(key)
    else:
        user_set = COMPARE_FALLBACK.setdefault(user_id, set())
        if len(user_set) >= 4 and str_room_id not in user_set:
            raise HTTPException(status_code=400, detail="Cannot compare more than 4 rooms at a time")
        user_set.add(str_room_id)
        count = len(user_set)

    return {"message": "Room added to compare list", "count": count}

@router.delete("/{roomId}")
def remove_from_compare(
    roomId: UUID,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a room from compare set."""
    user_id = str(current_user.id)
    str_room_id = str(roomId)

    if redis_client:
        key = get_user_compare_key(user_id)
        redis_client.srem(key, str_room_id)
        count = redis_client.scard(key)
    else:
        user_set = COMPARE_FALLBACK.get(user_id, set())
        user_set.discard(str_room_id)
        count = len(user_set)

    return {"message": "Room removed from compare list", "count": count}

@router.get("/", response_model=List[RoomRead])
def get_compare_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get full details of all rooms in compare set."""
    user_id = str(current_user.id)
    
    if redis_client:
        key = get_user_compare_key(user_id)
        room_ids = redis_client.smembers(key)
    else:
        room_ids = COMPARE_FALLBACK.get(user_id, set())

    rooms = []
    for r_id in room_ids:
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
    if redis_client:
        key = get_user_compare_key(user_id)
        redis_client.delete(key)
    else:
        COMPARE_FALLBACK[user_id] = set()
    return {"message": "Compare list cleared"}
