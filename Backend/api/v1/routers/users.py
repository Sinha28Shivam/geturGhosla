from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_user import get_user, update_user
from schemas.user import UserRead, UserUpdate
from db.models import User

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current logged in user details.
    """
    return current_user

@router.patch("/me", response_model=UserRead)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update own profile (name, profile photo).
    Note: Email change should trigger OTP re-verification, so it is not exposed here.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    user = update_user(db, db_user=current_user, user_in=update_data)
    return user

@router.get("/{id}", response_model=UserRead, response_model_exclude={"phone", "email"})
def read_user_by_id(id: UUID, db: Session = Depends(get_db)):
    """
    Get a specific user's public profile.
    Phone and Email are stripped from the response via response_model_exclude.
    """
    user = get_user(db, user_id=str(id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
