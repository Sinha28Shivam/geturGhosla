from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_interest import get_sent_interests, get_received_interests, get_interest, update_interest_status
from schemas.interest import InterestRead, InterestUpdateStatus
from db.models import User

router = APIRouter()

@router.get("/sent", response_model=List[InterestRead])
def read_sent_interests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all interests sent by the current user.
    """
    return get_sent_interests(db, seeker_id=str(current_user.id))

@router.get("/received", response_model=List[InterestRead])
def read_received_interests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all interests received for rooms owned by the current user (Lead Inbox).
    """
    return get_received_interests(db, owner_id=str(current_user.id))

@router.patch("/{id}/status", response_model=InterestRead)
def update_interest_state(
    id: UUID,
    status_update: InterestUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the status of a received interest (e.g., contacted, closed).
    Only the owner of the room can update it.
    """
    interest = get_interest(db, interest_id=str(id))
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
        
    # Check if current_user is the owner of the room associated with this interest
    if str(interest.room.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this interest")
        
    interest = update_interest_status(db, db_interest=interest, status=status_update.status)
    return interest
