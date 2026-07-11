from sqlalchemy.orm import Session
from typing import List, Optional
from db.models import RoomImage

def create_room_image(db: Session, room_id: str, image_url: str, is_primary: bool = False) -> RoomImage:
    if is_primary:
        # Unset existing primary
        db.query(RoomImage).filter(RoomImage.room_id == room_id, RoomImage.is_primary == True).update({"is_primary": False})
        
    db_image = RoomImage(room_id=room_id, image_url=image_url, is_primary=is_primary)
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_room_image(db: Session, image_id: str) -> Optional[RoomImage]:
    return db.query(RoomImage).filter(RoomImage.id == image_id).first()

def get_room_images(db: Session, room_id: str) -> List[RoomImage]:
    return (
        db.query(RoomImage)
        .filter(RoomImage.room_id == room_id)
        .order_by(RoomImage.is_primary.desc(), RoomImage.sort_order.asc(), RoomImage.created_at.asc())
        .all()
    )

def delete_room_image(db: Session, db_image: RoomImage):
    db.delete(db_image)
    db.commit()

def set_primary_image(db: Session, db_image: RoomImage):
    # Unset others
    db.query(RoomImage).filter(RoomImage.room_id == db_image.room_id, RoomImage.is_primary == True).update({"is_primary": False})
    db_image.is_primary = True
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def reorder_images(db: Session, room_id: str, image_ids: List[str]):
    for index, img_id in enumerate(image_ids):
        db.query(RoomImage).filter(RoomImage.id == img_id, RoomImage.room_id == room_id).update({"sort_order": index})
    db.commit()
