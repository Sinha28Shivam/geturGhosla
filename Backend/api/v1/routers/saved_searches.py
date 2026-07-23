from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from db.session import get_db
from api.deps import get_current_active_user
from crud.crud_saved_search import create_saved_search, get_user_saved_searches, delete_saved_search
from schemas.saved_search import SavedSearchCreate, SavedSearchRead
from db.models import User

router = APIRouter()

@router.post("/", response_model=SavedSearchRead, status_code=status.HTTP_201_CREATED)
def create_search_alert(
    search_in: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a saved search alert criteria set."""
    return create_saved_search(db, user_id=str(current_user.id), search_in=search_in)

@router.get("/", response_model=List[SavedSearchRead])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List current user's saved searches."""
    return get_user_saved_searches(db, user_id=str(current_user.id))

@router.delete("/{id}")
def remove_saved_search(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a saved search."""
    success = delete_saved_search(db, search_id=str(id), user_id=str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"message": "Saved search removed"}
