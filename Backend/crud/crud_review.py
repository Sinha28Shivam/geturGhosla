from sqlalchemy.orm import Session
from db.models import Review, Interest, InterestStatusEnum
from schemas.review import ReviewCreate, ReviewUpdate
from typing import List, Optional

def create_review(db: Session, room_id: str, reviewer_id: str, review_in: ReviewCreate) -> Review:
    # Check if user has an interest record for this room to mark as verified
    interest = db.query(Interest).filter(
        Interest.room_id == room_id,
        Interest.seeker_id == reviewer_id
    ).first()
    
    is_verified = False
    if interest and interest.status in [InterestStatusEnum.contacted, InterestStatusEnum.closed, InterestStatusEnum.pending]:
        is_verified = True

    review = Review(
        room_id=room_id,
        reviewer_id=reviewer_id,
        rating=review_in.rating,
        comment=review_in.comment,
        is_verified=is_verified
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

def get_reviews_for_room(db: Session, room_id: str) -> List[Review]:
    return db.query(Review).filter(
        Review.room_id == room_id
    ).order_by(Review.is_verified.desc(), Review.created_at.desc()).all()

def update_review(db: Session, review_id: str, reviewer_id: str, review_in: ReviewUpdate) -> Optional[Review]:
    review = db.query(Review).filter(Review.id == review_id, Review.reviewer_id == reviewer_id).first()
    if not review:
        return None
    if review_in.rating is not None:
        review.rating = review_in.rating
    if review_in.comment is not None:
        review.comment = review_in.comment
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

def delete_review(db: Session, review_id: str, user_id: str, is_admin: bool = False) -> bool:
    query = db.query(Review).filter(Review.id == review_id)
    if not is_admin:
        query = query.filter(Review.reviewer_id == user_id)
    review = query.first()
    if not review:
        return False
    db.delete(review)
    db.commit()
    return True
