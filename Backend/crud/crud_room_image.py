from sqlalchemy.orm import Session
from typing import List, Optional
from db.models import RoomImage

def _normalize_mock_image_url(room_id: str, image_url: str) -> str:
    if image_url and "mock-storage.com" in image_url:
        token = image_url.rstrip("/").split("/")[-1].split(".")[0]
        seed = f"{room_id}-{token}".replace(" ", "-")
        return f"https://picsum.photos/seed/{seed}/1200/800"
    return image_url

def create_room_image(db: Session, room_id: str, image_url: str, is_primary: bool = False) -> RoomImage:
    image_url = _normalize_mock_image_url(room_id, image_url)
    if is_primary:
        # Unset existing primary
        db.query(RoomImage).filter(RoomImage.room_id == room_id, RoomImage.is_primary == True).update({"is_primary": False})
        
    db_image = RoomImage(room_id=room_id, image_url=image_url, is_primary=is_primary)
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_room_image(db: Session, image_id: str) -> Optional[RoomImage]:
    image = db.query(RoomImage).filter(RoomImage.id == image_id).first()
    if image:
        image.image_url = _normalize_mock_image_url(str(image.room_id), image.image_url)
    return image

def get_room_images(db: Session, room_id: str) -> List[RoomImage]:
    images = (
        db.query(RoomImage)
        .filter(RoomImage.room_id == room_id)
        .order_by(RoomImage.is_primary.desc(), RoomImage.sort_order.asc(), RoomImage.created_at.asc())
        .all()
    )
    for image in images:
        image.image_url = _normalize_mock_image_url(room_id, image.image_url)
    return images

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
