from db.session import engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.base import Base
import db.models

from core.config import settings
from api.v1.routers import auth, users, rooms, room_images, interests, admin
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.limiter import limiter

app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["rooms"])
app.include_router(room_images.router, prefix="/api/v1/rooms", tags=["room_images"])
app.include_router(interests.router, prefix="/api/v1/interests", tags=["interests"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "Ok", "Message": "Backend is running"}

@app.get("/")
def read_root():
    return {"Message": f"Welcome to {settings.PROJECT_NAME}"}
