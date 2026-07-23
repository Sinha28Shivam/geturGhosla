import enum
from sqlalchemy import Column, String, Boolean, Text, Numeric, Integer, SmallInteger, ForeignKey, Enum, CheckConstraint, UniqueConstraint, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
import uuid

from db.base import Base

# --- ENUMS ---
class RoomTypeEnum(str, enum.Enum):
    single = 'single'
    shared = 'shared'
    _1rk = '1rk'
    _1bhk = '1bhk'
    _2bhk = '2bhk'
    _3bhk_plus = '3bhk_plus'
    pg = 'pg'

class RoomStatusEnum(str, enum.Enum):
    active = 'active'
    rented = 'rented'
    inactive = 'inactive'
    pending_review = 'pending_review'
    flagged = 'flagged'

import enum
from sqlalchemy import Column, String, Boolean, Text, Numeric, Integer, SmallInteger, ForeignKey, Enum, CheckConstraint, UniqueConstraint, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
import uuid

from db.base import Base

# --- ENUMS ---
class RoomTypeEnum(str, enum.Enum):
    single = 'single'
    shared = 'shared'
    _1rk = '1rk'
    _1bhk = '1bhk'
    _2bhk = '2bhk'
    _3bhk_plus = '3bhk_plus'
    pg = 'pg'

class RoomStatusEnum(str, enum.Enum):
    active = 'active'
    rented = 'rented'
    inactive = 'inactive'
    pending_review = 'pending_review'
    flagged = 'flagged'

class InterestStatusEnum(str, enum.Enum):
    pending = 'pending'
    contacted = 'contacted'
    closed = 'closed'
    spam = 'spam'

class ReportStatusEnum(str, enum.Enum):
    open = 'open'
    resolved = 'resolved'
    dismissed = 'dismissed'

# --- MODELS ---
class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_provider_id = Column(Text, unique=True, nullable=False)
    phone = Column(String(15), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(150))
    profile_photo_url = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        CheckConstraint('phone IS NOT NULL OR email IS NOT NULL', name='chk_user_has_contact'),
    )

    # Relationships
    rooms = relationship("Room", back_populates="owner", cascade="all, delete-orphan")
    interests = relationship("Interest", back_populates="seeker", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="reporter", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="reviewer", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = 'rooms'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    title = Column(String(150), nullable=False)
    description = Column(Text)
    room_type = Column(Enum(RoomTypeEnum), nullable=False)
    
    monthly_rent = Column(Numeric(10, 2), nullable=False)
    security_deposit = Column(Numeric(10, 2), default=0)
    
    address_line = Column(Text, nullable=False)
    locality = Column(String(120))
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100))
    pincode = Column(String(10))
    
    # PostGIS Geography Point for exact nearby search
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False, index=True)
    
    status = Column(Enum(RoomStatusEnum), nullable=False, default=RoomStatusEnum.pending_review, index=True)
    view_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        CheckConstraint('monthly_rent >= 0', name='chk_monthly_rent_positive'),
        CheckConstraint('security_deposit >= 0', name='chk_security_deposit_positive'),
    )

    # Relationships
    owner = relationship("User", back_populates="rooms")
    images = relationship("RoomImage", back_populates="room", cascade="all, delete-orphan")
    interests = relationship("Interest", back_populates="room", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="room", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="room", cascade="all, delete-orphan")

    @property
    def primary_image_url(self):
        if not self.images:
            return None
        ordered_images = sorted(
            self.images,
            key=lambda image: (
                0 if image.is_primary else 1,
                image.sort_order if image.sort_order is not None else 0,
                image.created_at,
            ),
        )
        return ordered_images[0].image_url


class RoomImage(Base):
    __tablename__ = 'room_images'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    room = relationship("Room", back_populates="images")


class Interest(Base):
    __tablename__ = 'interests'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    seeker_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    message = Column(Text)
    status = Column(Enum(InterestStatusEnum), nullable=False, default=InterestStatusEnum.pending)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Constraints
    __table_args__ = (
        UniqueConstraint('room_id', 'seeker_id', name='uq_interest_per_user_room'),
    )

    # Relationships
    room = relationship("Room", back_populates="interests")
    seeker = relationship("User", back_populates="interests")


class Report(Base):
    __tablename__ = 'reports'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ReportStatusEnum), nullable=False, default=ReportStatusEnum.open, index=True)
    action_taken = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    room = relationship("Room", back_populates="reports")
    reporter = relationship("User", back_populates="reports")


class Review(Base):
    __tablename__ = 'reviews'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    rating = Column(SmallInteger, nullable=False)
    comment = Column(Text, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('room_id', 'reviewer_id', name='uq_review_per_user_room'),
        CheckConstraint('rating >= 1 AND rating <= 5', name='chk_review_rating_range'),
    )

    # Relationships
    room = relationship("Room", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")


class SavedSearch(Base):
    __tablename__ = 'saved_searches'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    city = Column(String(100), nullable=True)
    room_type = Column(Enum(RoomTypeEnum), nullable=True)
    min_rent = Column(Numeric(10, 2), nullable=True)
    max_rent = Column(Numeric(10, 2), nullable=True)
    lat = Column(Numeric(10, 8), nullable=True)
    lng = Column(Numeric(11, 8), nullable=True)
    radius_km = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="saved_searches")
