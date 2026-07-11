import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from db.session import SessionLocal
from db.models import User
from crud.crud_room import create_room
from schemas.room import RoomCreate

def main():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No user found")
            return
        
        room_in = RoomCreate(
            title="Test Room",
            description="Test Description",
            room_type="single",
            monthly_rent="5000",
            security_deposit="10000",
            address_line="123 Test St",
            locality="Test Locality",
            city="Test City",
            state="Test State",
            pincode="123456",
            lat=26.4499,
            lng=80.3319
        )
        
        room = create_room(db, room_in, owner_id=str(user.id))
        print("Room created:", room.id)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
