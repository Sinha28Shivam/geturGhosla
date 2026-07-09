from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_room import get_room
from crud.crud_room_image import create_room_image, get_room_image, delete_room_image, set_primary_image, reorder_images
from schemas.room_image import RoomImageRead, ImageReorder
from db.models import User

router = APIRouter()

@router.post("/{room_id}/images", status_code=status.HTTP_200_OK)
def request_presigned_upload_url(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Returns a presigned upload URL for Blob Storage/S3.
    """
    room = get_room(db, room_id=str(room_id))
    if not room or str(room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # MOCK implementation for presigned URL
    mock_upload_url = f"https://mock-storage.com/upload/{room_id}/{UUID(int=0).hex}.jpg"
    mock_file_url = f"https://mock-storage.com/images/{room_id}/{UUID(int=0).hex}.jpg"
    
    return {
        "upload_url": mock_upload_url,
        "file_url": mock_file_url,
        "message": "Upload file via PUT to upload_url, then call /confirm with file_url"
    }

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
