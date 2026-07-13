from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user, get_current_user, oauth2_scheme_optional
from crud.crud_room import create_room, get_room, update_room, soft_delete_room, get_rooms, get_rooms_nearby, increment_view_count
from schemas.room import RoomCreate, RoomRead, RoomUpdate
from db.models import User, RoomStatusEnum, RoomTypeEnum
from core.limiter import limiter
from slowapi.util import get_remote_address

router = APIRouter()

# Optional authentication dependency for routes that behave differently
def get_optional_user(db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[User]:
    if token:
        try:
            return get_current_user(db, token)
        except HTTPException:
            pass
    return None

@router.post("/", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/day")
def create_new_room(
    request: Request,
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new room listing. It will default to pending_review.
    """
    room = create_room(db, room_in=room_in, owner_id=str(current_user.id))
    return room

@router.get("/nearby", response_model=List[RoomRead])
def get_nearby_rooms(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(5.0, le=25.0, description="Radius in kilometers (max 25)"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db)
):
    """
    Get rooms near a location using PostGIS radius search.
    """
    rooms = get_rooms_nearby(db, lat=lat, lng=lng, radius_km=radius_km, limit=limit)
    return rooms

@router.get("/", response_model=List[RoomRead])
def list_rooms(
    search: Optional[str] = Query(None, description="Search title, locality, city, or address"),
    city: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    room_type: Optional[RoomTypeEnum] = Query(None),
    min_rent: Optional[float] = Query(None, ge=0),
    max_rent: Optional[float] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List active rooms with optional catalog-style filters.
    """
    return get_rooms(
        db,
        search=search,
        city=city,
        locality=locality,
        room_type=room_type,
        min_rent=min_rent,
        max_rent=max_rent,
        limit=limit,
        offset=offset,
    )

@router.get("/me", response_model=List[RoomRead])
def get_my_rooms_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all rooms owned by the current user.
    """
    from crud.crud_room import get_my_rooms
    return get_my_rooms(db, user_id=str(current_user.id))

@router.get("/{id}", response_model=RoomRead)
def read_room_by_id(
    id: UUID, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user) # Placeholder for real optional auth
):
    """
    Get full detail of a room.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # If not active, only owner can view it
    if room.status != RoomStatusEnum.active:
        if not current_user or str(room.owner_id) != str(current_user.id):
            raise HTTPException(status_code=404, detail="Room not found")
        
    return room

@router.patch("/{id}", response_model=RoomRead)
def update_existing_room(
    id: UUID,
    room_in: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a room listing. Resets status to pending_review.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    room = update_room(db, db_room=room, room_in=room_in)
    return room

@router.delete("/{id}", response_model=RoomRead)
def delete_room(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Soft delete a room.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    room = soft_delete_room(db, db_room=room)
    return room

def room_view_key(request: Request):
    return f"{get_remote_address(request)}:{request.path_params.get('id')}"

@router.post("/{id}/view")
@limiter.limit("1/hour", key_func=room_view_key)
def record_room_view(request: Request, id: UUID, db: Session = Depends(get_db)):
    """
    Increment view count for a room.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    increment_view_count(db, db_room=room)
    return {"message": "View recorded"}

from schemas.interest import InterestCreate, InterestRead
from crud.crud_interest import create_interest

@router.post("/{id}/interest", response_model=InterestRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/day")
def express_interest(
    request: Request,
    id: UUID,
    interest_in: InterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Express interest in a room.
    """
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if str(room.owner_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot express interest in your own room")
        
    try:
        interest = create_interest(db, room_id=str(id), seeker_id=str(current_user.id), message=interest_in.message)
        return interest
    except Exception as e:
        # Catch unique constraint violation for duplicate interest
        raise HTTPException(status_code=400, detail="You have already expressed interest in this room")
