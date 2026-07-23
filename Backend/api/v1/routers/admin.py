from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from db.session import get_db
from api.deps import get_current_admin_session
from crud.crud_room import get_room, _hydrate_room_fields
from crud.crud_report import get_reports, resolve_report
from schemas.room import RoomRead
from schemas.report import ReportRead, ReportResolve
from db.models import Room, RoomStatusEnum, ReportStatusEnum

router = APIRouter()

@router.get("/rooms/pending", response_model=List[RoomRead])
def read_pending_rooms(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_session)
):
    """Get all rooms pending review, oldest first."""
    rooms = db.query(Room).options(
        selectinload(Room.images),
        selectinload(Room.owner)
    ).filter(
        Room.status == RoomStatusEnum.pending_review
    ).order_by(Room.created_at.asc()).all()
    
    for room in rooms:
        _hydrate_room_fields(db, room)
    return rooms

@router.get("/rooms", response_model=List[RoomRead])
def list_admin_rooms(
    status: Optional[RoomStatusEnum] = None,
    city: Optional[str] = None,
    reported: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_session)
):
    """Admin view: Full list of rooms with status, city, and reported filters."""
    query = db.query(Room).options(
        selectinload(Room.images),
        selectinload(Room.owner)
    )
    if status:
        query = query.filter(Room.status == status)
    if city:
        query = query.filter(Room.city.ilike(f"%{city}%"))
    if reported:
        from db.models import Report
        query = query.join(Report, Room.id == Report.room_id).distinct()

    rooms = query.order_by(Room.created_at.desc()).all()
    for room in rooms:
        _hydrate_room_fields(db, room)
    return rooms

class RoomStatusUpdate(BaseModel):
    status: RoomStatusEnum
    reason: Optional[str] = None

@router.patch("/rooms/{id}/status", response_model=RoomRead)
def update_room_status(
    id: UUID,
    status_update: RoomStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_session)
):
    """Approve, reject, or flag a room."""
    room = get_room(db, room_id=str(id))
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if status_update.status in [RoomStatusEnum.flagged, RoomStatusEnum.inactive] and not status_update.reason:
        raise HTTPException(status_code=400, detail="Reason is required when flagging or rejecting a listing")
        
    room.status = status_update.status
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    status: Optional[ReportStatusEnum] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_session)
):
    """Queue of open/all reports."""
    return get_reports(db, status=status)

@router.patch("/reports/{id}/resolve", response_model=ReportRead)
def resolve_admin_report(
    id: UUID,
    resolve_in: ReportResolve,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin_session)
):
    """Resolve a report."""
    report = resolve_report(db, report_id=str(id), action_taken=resolve_in.action_taken)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
