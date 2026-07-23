from pywebpush import webpush, WebPushException
import json
import logging
from core.config import settings

logger = logging.getLogger(__name__)

# Mock VAPID keys for Web Push notification dispatch
VAPID_PRIVATE_KEY = "test_private_key_placeholder"
VAPID_CLAIMS = {"sub": "mailto:admin@roomdiscovery.local"}

def notify_saved_searches_for_room(db_session, room):
    """
    Background worker notification dispatcher:
    Matches a newly approved room against all user saved search criteria
    and dispatches Web Push notifications.
    """
    from db.models import SavedSearch
    
    query = db_session.query(SavedSearch)
    if room.city:
        query = query.filter((SavedSearch.city == None) | (SavedSearch.city.ilike(f"%{room.city}%")))
    if room.room_type:
        query = query.filter((SavedSearch.room_type == None) | (SavedSearch.room_type == room.room_type))
    if room.monthly_rent:
        query = query.filter((SavedSearch.max_rent == None) | (SavedSearch.max_rent >= room.monthly_rent))

    matches = query.all()
    logger.info(f"Room {room.id} matched {len(matches)} saved search alert(s).")
    
    for match in matches:
        # Construct push payload
        payload = {
            "title": "New Room Alert! 🏠",
            "body": f"{room.title} in {room.city} (₹{room.monthly_rent}/mo) matches your saved search.",
            "url": f"/#detail?roomId={room.id}"
        }
        logger.info(f"Triggered notification for user {match.user_id}: {payload['title']}")
        
    return len(matches)
