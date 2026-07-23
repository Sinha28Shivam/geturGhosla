from sqlalchemy.orm import Session
from db.models import SavedSearch
from schemas.saved_search import SavedSearchCreate
from typing import List, Optional

def create_saved_search(db: Session, user_id: str, search_in: SavedSearchCreate) -> SavedSearch:
    saved = SavedSearch(
        user_id=user_id,
        city=search_in.city,
        room_type=search_in.room_type,
        min_rent=search_in.min_rent,
        max_rent=search_in.max_rent,
        lat=search_in.lat,
        lng=search_in.lng,
        radius_km=search_in.radius_km
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved

def get_user_saved_searches(db: Session, user_id: str) -> List[SavedSearch]:
    return db.query(SavedSearch).filter(SavedSearch.user_id == user_id).order_by(SavedSearch.created_at.desc()).all()

def delete_saved_search(db: Session, search_id: str, user_id: str) -> bool:
    saved = db.query(SavedSearch).filter(SavedSearch.id == search_id, SavedSearch.user_id == user_id).first()
    if not saved:
        return False
    db.delete(saved)
    db.commit()
    return True
