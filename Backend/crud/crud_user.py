from sqlalchemy.orm import Session
from typing import Optional
from db.models import User
from schemas.user import UserCreate

def get_user(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_auth_provider_id(db: Session, auth_provider_id: str) -> Optional[User]:
    return db.query(User).filter(User.auth_provider_id == auth_provider_id).first()

def create_user(db: Session, user: UserCreate) -> User:
    db_user = User(
        email=user.email,
        auth_provider_id=f"email|{user.email}", # Simple mock for now
        full_name=user.full_name,
        profile_photo_url=user.profile_photo_url,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: User, user_in: dict) -> User:
    for field in user_in:
        setattr(db_user, field, user_in[field])
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

