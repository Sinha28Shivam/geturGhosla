from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room, update_room, soft_delete_room, get_rooms, get_rooms_nearby, increment_view_count
from crud.crud_report import create_report
from crud.crud_review import create_review, get_reviews_for_room
from schemas.room import RoomCreate, RoomRead, RoomUpdate
from schemas.report import ReportCreate, ReportRead
from schemas.review import ReviewCreate, ReviewRead
from db.models import User, RoomStatusEnum, RoomTypeEnum
from core.limiter import limiter
from slowapi.util import get_remote_address

router = APIRouter()

class RoomAvailabilityUpdate(BaseModel):
    status: RoomStatusEnum

@router.post("/", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/day")
def create_new_room(
    request: Request,
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new room listing."""
    from crud.crud_room import create_room
    return create_room(db, room_in=room_in, owner_id=str(current_user.id))

@router.get("/nearby", response_model=List[RoomRead])
def get_nearby_rooms(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(5.0, le=25.0, description="Radius in kilometers (max 25)"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db)
):
    """Get rooms near a location using PostGIS radius search."""
    return get_rooms_nearby(db, lat=lat, lng=lng, radius_km=radius_km, limit=limit)

@router.get("/", response_model=List[RoomRead])
def list_rooms(
    search: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    room_type: Optional[RoomTypeEnum] = Query(None),
    min_rent: Optional[float] = Query(None, ge=0),
    max_rent: Optional[float] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List active rooms with filters."""
    return get_rooms(
        db, search=search, city=city, locality=locality,
        room_type=room_type, min_rent=min_rent, max_rent=max_rent,
        limit=limit, offset=offset
    )

@router.get("/me", response_model=List[RoomRead])
def get_my_rooms_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all rooms owned by the current user."""
    from crud.crud_room import get_my_rooms
    return get_my_rooms(db, user_id=str(current_user.id))

@router.get("/{id}", response_model=RoomRead)
def read_room_by_id(
    id: UUID,
    db: Session = Depends(get_db)
):
    """Get full detail of a room."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.patch("/{id}", response_model=RoomRead)
def update_existing_room(
    id: UUID,
    room_in: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a room listing."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return update_room(db, db_room=room, room_in=room_in)

@router.delete("/{id}", response_model=RoomRead)
def delete_room(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete a room."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return soft_delete_room(db, db_room=room)

def room_view_key(request: Request):
    return f"{get_remote_address(request)}:{request.path_params.get('id')}"

@router.post("/{id}/view")
@limiter.limit("1/hour", key_func=room_view_key)
def record_room_view(request: Request, id: UUID, db: Session = Depends(get_db)):
    """Increment view count for a room."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    increment_view_count(db, db_room=room)
    return {"message": "View recorded"}

@router.post("/{id}/report", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/day")
def report_room(
    request: Request,
    id: UUID,
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Report a room for spam/fraud/etc."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return create_report(db, room_id=str(id), reporter_id=str(current_user.id), reason=report_in.reason)

@router.patch("/{id}/availability", response_model=RoomRead)
def toggle_availability(
    id: UUID,
    update_in: RoomAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle room availability status (active/rented)."""
    if update_in.status not in [RoomStatusEnum.active, RoomStatusEnum.rented]:
        raise HTTPException(status_code=400, detail="Availability can only be toggled between active and rented")
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    room.status = update_in.status
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.post("/{id}/renew", response_model=RoomRead)
def renew_room(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Renew room listing timestamp without triggering re-review."""
    from sqlalchemy import func
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    room.updated_at = func.now()
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.post("/{id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def post_review(
    id: UUID,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a review for a room."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    try:
        return create_review(db, room_id=str(id), reviewer_id=str(current_user.id), review_in=review_in)
    except Exception:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this room")

@router.get("/{id}/reviews", response_model=List[ReviewRead])
def list_room_reviews(
    id: UUID,
    db: Session = Depends(get_db)
):
    """Get reviews for a room."""
    return get_reviews_for_room(db, room_id=str(id))
