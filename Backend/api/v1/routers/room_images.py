from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room
from crud.crud_room_image import create_room_image, get_room_image, get_room_images, delete_room_image, set_primary_image, reorder_images
from schemas.room_image import RoomImageRead, ImageReorder
from db.models import User

router = APIRouter()

def _build_mock_image_url(room_id: UUID, image_token: str) -> str:
    seed = f"{room_id}-{image_token}".replace(" ", "-")
    return f"https://picsum.photos/seed/{seed}/1200/800"

import hashlib
import time
from core.config import settings

@router.post("/{room_id}/images", status_code=status.HTTP_200_OK)
def request_presigned_upload_url(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns presigned Cloudinary upload signature parameters for direct browser upload.
    """
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    timestamp = int(time.time())
    folder = f"rooms/{room_id}"
    
    # Signature formula: folder=...&timestamp=...<API_SECRET>
    to_sign = f"folder={folder}&timestamp={timestamp}{settings.CLOUDINARY_API_SECRET}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload"

    return {
        "upload_url": upload_url,
        "params": {
            "api_key": settings.CLOUDINARY_API_KEY,
            "timestamp": timestamp,
            "folder": folder,
            "signature": signature
        }
    }

@router.get("/{room_id}/images", response_model=List[RoomImageRead])
def read_room_images(
    room_id: UUID,
    db: Session = Depends(get_db)
):
    """
    List all images for a room in display order.
    """
    room = get_room(db, room_id=str(room_id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return get_room_images(db, room_id=str(room_id))



@router.post("/{room_id}/images/confirm", response_model=RoomImageRead)
def confirm_image_upload(
    room_id: UUID,
    image_url: str,
    is_primary: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Confirm upload and save to DB.
    """
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return create_room_image(db, room_id=str(room_id), image_url=image_url, is_primary=is_primary)

@router.delete("/{room_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    room_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    image = get_room_image(db, image_id=str(image_id))
    if not image or str(image.room_id) != str(room_id):
        raise HTTPException(status_code=404, detail="Image not found")
        
    delete_room_image(db, db_image=image)
    return None

@router.patch("/{room_id}/images/{image_id}/primary", response_model=RoomImageRead)
def set_primary(
    room_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    image = get_room_image(db, image_id=str(image_id))
    if not image or str(image.room_id) != str(room_id):
        raise HTTPException(status_code=404, detail="Image not found")
        
    return set_primary_image(db, db_image=image)

@router.patch("/{room_id}/images/reorder", status_code=status.HTTP_200_OK)
def reorder(
    room_id: UUID,
    payload: ImageReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    reorder_images(db, room_id=str(room_id), image_ids=[str(i) for i in payload.image_ids])
    return {"message": "Images reordered"}
