from sqlalchemy.orm import Session
from db.models import Report, Room, RoomStatusEnum, ReportStatusEnum
from typing import List, Optional

def create_report(db: Session, room_id: str, reporter_id: str, reason: str) -> Report:
    report = Report(
        room_id=room_id,
        reporter_id=reporter_id,
        reason=reason,
        status=ReportStatusEnum.open
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Check distinct report threshold (auto-flag if >= 3)
    distinct_reporters = db.query(Report.reporter_id).filter(Report.room_id == room_id).distinct().count()
    if distinct_reporters >= 3:
        room = db.query(Room).filter(Room.id == room_id).first()
        if room:
            room.status = RoomStatusEnum.flagged
            db.add(room)
            db.commit()

    return report

def get_reports(db: Session, status: Optional[ReportStatusEnum] = None) -> List[Report]:
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    return query.order_by(Report.created_at.asc()).all()

def resolve_report(db: Session, report_id: str, action_taken: str) -> Optional[Report]:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        return None
    report.status = ReportStatusEnum.resolved
    report.action_taken = action_taken
    
    if action_taken == "room_flagged":
        room = db.query(Room).filter(Room.id == report.room_id).first()
        if room:
            room.status = RoomStatusEnum.flagged
            db.add(room)
    elif action_taken == "room_removed":
        room = db.query(Room).filter(Room.id == report.room_id).first()
        if room:
            room.status = RoomStatusEnum.inactive
            db.add(room)

    db.add(report)
    db.commit()
    db.refresh(report)
    return report
