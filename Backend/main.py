from db.session import engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.base import Base
import db.models

from core.config import settings
from api.v1.routers import auth, users, rooms, room_images, interests, admin, compare, reviews, saved_searches
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.limiter import limiter

import time
from core.logger import logger

app = FastAPI(title=settings.PROJECT_NAME)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    "https://delightful-coast-074920b0f.7.azurestaticapps.net",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = round((time.time() - start_time) * 1000, 2)
    logger.info(f"HTTP {request.method} {request.url.path} -> {response.status_code} ({duration}ms)")
    return response

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["rooms"])
app.include_router(room_images.router, prefix="/api/v1/rooms", tags=["room_images"])
app.include_router(interests.router, prefix="/api/v1/interests", tags=["interests"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(compare.router, prefix="/api/v1/compare", tags=["compare"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["reviews"])
app.include_router(saved_searches.router, prefix="/api/v1/saved-searches", tags=["saved-searches"])

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.error(f"Failed to create database tables on startup: {e}")

@app.get("/health")
def health_check():
    return {"status": "Ok", "Message": "Backend is running"}

@app.get("/")
def read_root():
    return {"Message": f"Welcome to {settings.PROJECT_NAME}"}
