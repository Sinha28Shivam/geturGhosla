from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_review import update_review, delete_review
from schemas.review import ReviewRead, ReviewUpdate
from db.models import User

router = APIRouter()

@router.patch("/{id}", response_model=ReviewRead)
def edit_review(
    id: UUID,
    review_in: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Edit own review."""
    review = update_review(db, review_id=str(id), reviewer_id=str(current_user.id), review_in=review_in)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found or unauthorized")
    return review

@router.delete("/{id}")
def remove_review(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete own review or admin deletion."""
    is_admin = getattr(current_user, 'is_admin', False)
    success = delete_review(db, review_id=str(id), user_id=str(current_user.id), is_admin=is_admin)
    if not success:
        raise HTTPException(status_code=404, detail="Review not found or unauthorized")
    return {"message": "Review deleted"}
