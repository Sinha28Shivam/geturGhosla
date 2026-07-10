from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2 import Geometry
from typing import Optional, List
from db.models import Room, RoomStatusEnum
from schemas.room import RoomCreate, RoomUpdate

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
        location=point
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    # We must explicitly set lat/lng for Pydantic to read it back correctly if we want to avoid complex WKB parsing on the fly
    db_room.lat = room_in.lat
    db_room.lng = room_in.lng
    return db_room

def get_room(db: Session, room_id: str) -> Optional[Room]:
    room = db.query(Room).filter(Room.id == room_id).first()
    if room:
        # Extract lat/lng from the PostGIS geography object (ST_Y is lat, ST_X is lng)
        point = db.query(func.ST_Y(Room.location.cast(Geometry)), func.ST_X(Room.location.cast(Geometry))).filter(Room.id == room_id).first()
        room.lat = point[0]
        room.lng = point[1]
    return room

def update_room(db: Session, db_room: Room, room_in: RoomUpdate) -> Room:
    update_data = room_in.model_dump(exclude_unset=True)
    
    if "lat" in update_data and "lng" in update_data:
        update_data["location"] = f'SRID=4326;POINT({update_data["lng"]} {update_data["lat"]})'
        del update_data["lat"]
        del update_data["lng"]
        
    for field, value in update_data.items():
        setattr(db_room, field, value)
        
    # Any update resets status to pending_review
    db_room.status = RoomStatusEnum.pending_review
    
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    # Reload lat/lng
    point = db.query(func.ST_Y(Room.location.cast(Geometry)), func.ST_X(Room.location.cast(Geometry))).filter(Room.id == db_room.id).first()
    db_room.lat = point[0]
    db_room.lng = point[1]
    
    return db_room

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
    ).filter(
        Room.status == RoomStatusEnum.active,
        func.ST_DWithin(Room.location, func.ST_GeogFromText(target_point), radius_meters)
    ).order_by(
        Room.location.distance_centroid(func.ST_GeogFromText(target_point))
    ).limit(limit).all()
    
    # Format the results to inject the computed fields
    rooms = []
    for room, distance, lat, lng in results:
        room.lat = lat
        room.lng = lng
        room.distance_km = float(distance)
        rooms.append(room)
        
    return rooms
