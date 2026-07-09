from sqlalchemy.orm import Session
from typing import List
from db.models import Interest, InterestStatusEnum, Room

def create_interest(db: Session, room_id: str, seeker_id: str, message: str = None) -> Interest:
    db_interest = Interest(room_id=room_id, seeker_id=seeker_id, message=message)
    db.add(db_interest)
    db.commit()
    db.refresh(db_interest)
    return db_interest

def get_interest(db: Session, interest_id: str) -> Interest:
    return db.query(Interest).filter(Interest.id == interest_id).first()

def get_sent_interests(db: Session, seeker_id: str) -> List[Interest]:
    return db.query(Interest).filter(Interest.seeker_id == seeker_id).all()

def get_received_interests(db: Session, owner_id: str) -> List[Interest]:
    # Join with rooms to find interests on rooms owned by this user
    return db.query(Interest).join(Room, Interest.room_id == Room.id).filter(Room.owner_id == owner_id).all()

def update_interest_status(db: Session, db_interest: Interest, status: InterestStatusEnum) -> Interest:
    db_interest.status = status
    db.add(db_interest)
    db.commit()
    db.refresh(db_interest)
    return db_interest
