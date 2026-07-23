from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from geoalchemy2 import Geometry
from typing import Optional, List
from db.models import Room, RoomStatusEnum, RoomTypeEnum
from schemas.room import RoomCreate, RoomUpdate
from crud.crud_room_image import _normalize_mock_image_url


def _hydrate_room_fields(db: Session, room: Room, lat: float = None, lng: float = None, distance_km: float = None) -> Room:
    if lat is None or lng is None:
        point = (
            db.query(func.ST_Y(Room.location.cast(Geometry)), func.ST_X(Room.location.cast(Geometry)))
            .filter(Room.id == room.id)
            .first()
        )
        lat = point[0]
        lng = point[1]

    room.lat = lat
    room.lng = lng
    if distance_km is not None:
        room.distance_km = float(distance_km)

    ordered_images = sorted(
        room.images,
        key=lambda image: (
            0 if image.is_primary else 1,
            image.sort_order if image.sort_order is not None else 0,
            image.created_at,
        ),
    )
    for image in ordered_images:
        image.image_url = _normalize_mock_image_url(str(room.id), image.image_url)
    room.images = ordered_images
    return room

def create_room(db: Session, room_in: RoomCreate, owner_id: str) -> Room:
    # Construct PostGIS point: Longitude first, then Latitude
    point = f'SRID=4326;POINT({room_in.lng} {room_in.lat})'
    
    db_room = Room(
        owner_id=owner_id,
        title=room_in.title,
        description=room_in.description,
        room_type=room_in.room_type,
        monthly_rent=room_in.monthly_rent,
        security_deposit=room_in.security_deposit,
        address_line=room_in.address_line,
        locality=room_in.locality,
        city=room_in.city,
        state=room_in.state,
        pincode=room_in.pincode,
        location=point,
        status=RoomStatusEnum.active
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    db_room = (
        db.query(Room)
        .options(selectinload(Room.images), selectinload(Room.owner))
        .filter(Room.id == db_room.id)
        .first()
    )
    return _hydrate_room_fields(db, db_room, lat=room_in.lat, lng=room_in.lng)

def get_room(db: Session, room_id: str) -> Optional[Room]:
    room = (
        db.query(Room)
        .options(selectinload(Room.images), selectinload(Room.owner))
        .filter(Room.id == room_id)
        .first()
    )
    if room:
        room = _hydrate_room_fields(db, room)
    return room

def update_room(db: Session, db_room: Room, room_in: RoomUpdate) -> Room:
    update_data = room_in.model_dump(exclude_unset=True)
    
    if "lat" in update_data and "lng" in update_data:
        update_data["location"] = f'SRID=4326;POINT({update_data["lng"]} {update_data["lat"]})'
        del update_data["lat"]
        del update_data["lng"]
        
    for field, value in update_data.items():
        setattr(db_room, field, value)
        
    # Any update resets status to pending_review (Disabled for MVP to allow instant updates)
    db_room.status = RoomStatusEnum.active
    
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    db_room = (
        db.query(Room)
        .options(selectinload(Room.images), selectinload(Room.owner))
        .filter(Room.id == db_room.id)
        .first()
    )
    return _hydrate_room_fields(db, db_room)

def soft_delete_room(db: Session, db_room: Room) -> Room:
    db_room.status = RoomStatusEnum.inactive
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def increment_view_count(db: Session, db_room: Room):
    db_room.view_count += 1
    db.add(db_room)
    db.commit()

def get_rooms_nearby(db: Session, lat: float, lng: float, radius_km: float = 5, limit: int = 20) -> List[Room]:
    radius_meters = radius_km * 1000
    target_point = f'SRID=4326;POINT({lng} {lat})'
    
    # ST_Distance returns meters for geography types.
    distance_col = (func.ST_Distance(Room.location, func.ST_GeogFromText(target_point)) / 1000).label('distance_km')
    
    results = db.query(
        Room, 
        distance_col,
        func.ST_Y(Room.location.cast(Geometry)),
        func.ST_X(Room.location.cast(Geometry))
    ).options(
        selectinload(Room.images),
        selectinload(Room.owner),
    ).filter(
        Room.status == RoomStatusEnum.active,
        func.ST_DWithin(Room.location, func.ST_GeogFromText(target_point), radius_meters)
    ).order_by(
        Room.location.distance_centroid(func.ST_GeogFromText(target_point))
    ).limit(limit).all()
    
    # Format the results to inject the computed fields
    rooms = []
    for room, distance, lat, lng in results:
        rooms.append(_hydrate_room_fields(db, room, lat=lat, lng=lng, distance_km=distance))
        
    return rooms

def get_rooms(
    db: Session,
    search: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
    room_type: Optional[RoomTypeEnum] = None,
    min_rent: Optional[float] = None,
    max_rent: Optional[float] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[Room]:
    query = (
        db.query(
            Room,
            func.ST_Y(Room.location.cast(Geometry)),
            func.ST_X(Room.location.cast(Geometry))
        )
        .options(selectinload(Room.images), selectinload(Room.owner))
        .filter(Room.status == RoomStatusEnum.active)
    )

    if city:
        query = query.filter(Room.city.ilike(f"%{city}%"))
    if locality:
        query = query.filter(Room.locality.ilike(f"%{locality}%"))
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if min_rent is not None:
        query = query.filter(Room.monthly_rent >= min_rent)
    if max_rent is not None:
        query = query.filter(Room.monthly_rent <= max_rent)
    if search:
        like_term = f"%{search}%"
        query = query.filter(
            (Room.title.ilike(like_term))
            | (Room.locality.ilike(like_term))
            | (Room.city.ilike(like_term))
            | (Room.address_line.ilike(like_term))
        )

    results = (
        query.order_by(Room.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [_hydrate_room_fields(db, room, lat=lat, lng=lng) for room, lat, lng in results]

def get_my_rooms(db: Session, user_id: str) -> List[Room]:
    results = (
        db.query(
            Room,
            func.ST_Y(Room.location.cast(Geometry)),
            func.ST_X(Room.location.cast(Geometry))
        )
        .options(selectinload(Room.images), selectinload(Room.owner))
        .filter(Room.owner_id == user_id)
        .order_by(Room.created_at.desc())
        .all()
    )
    return [_hydrate_room_fields(db, room, lat=lat, lng=lng) for room, lat, lng in results]
