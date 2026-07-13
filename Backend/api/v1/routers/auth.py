from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import random
import time
from collections import defaultdict

from core.limiter import limiter
from utils.email import send_otp_email

from db.session import get_db
from core.security import create_access_token, get_password_hash, verify_password
from api.deps import get_current_active_user
from crud.crud_user import get_user_by_email, create_user
from schemas.user import UserCreate, UserRead, UserCreateWithPassword
from schemas.token import Token
from db.models import User

router = APIRouter()

# Mock OTP Store (In-memory dict). Replace with Redis in production.
OTP_STORE = {}

# Simple in-memory rate limiters for MVP. Replace with Redis in production.
AUTH_RATE_LIMITS = defaultdict(list)

def check_auth_rate_limit(email: str, max_calls: int, window_seconds: int):
    now = time.time()
    calls = [t for t in AUTH_RATE_LIMITS[email] if now - t < window_seconds]
    if len(calls) >= max_calls:
        raise HTTPException(status_code=429, detail="Too Many Requests")
    calls.append(now)
    AUTH_RATE_LIMITS[email] = calls

class OTPRequest(BaseModel):
    email: EmailStr

@router.post("/email/request-otp", status_code=status.HTTP_200_OK)
async def request_email_otp(request_body: OTPRequest, request: Request, db: Session = Depends(get_db)):
    """
    Request an OTP for email login.
    If the user doesn't exist, they will be created upon verification.
    """
    check_auth_rate_limit(request_body.email, max_calls=5, window_seconds=3600)
    
    # Generate a 6 digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in mock cache
    OTP_STORE[request_body.email] = otp
    
    # Send the real email asynchronously
    await send_otp_email(email_to=request_body.email, otp_code=otp)
    
    return {"message": "OTP sent to email successfully"}


@router.post("/email/verify-otp", response_model=Token)
def verify_email_otp(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Verify the OTP and return a JWT access token.
    (Using OAuth2PasswordRequestForm to make Swagger UI 'Authorize' button work.
     username = email, password = otp)
    """
    email = form_data.username
    otp = form_data.password
    
    check_auth_rate_limit(email, max_calls=5, window_seconds=900)
    
    # Verify OTP
    stored_otp = OTP_STORE.get(email)
    if not stored_otp or stored_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect OTP or OTP expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear the OTP after successful use
    del OTP_STORE[email]
    
    # Fetch or Create User
    user = get_user_by_email(db, email=email)
    if not user:
        user_in = UserCreate(email=email)
        user = create_user(db, user=user_in)
        
    # Generate JWT
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/email/signup", status_code=status.HTTP_201_CREATED)
async def signup_email_password(
    request: Request,
    user_in: UserCreateWithPassword,
    db: Session = Depends(get_db)
):
    """
    Signup with email and password.
    Sends an OTP for verification.
    """
    check_auth_rate_limit(user_in.email, max_calls=5, window_seconds=3600)
    
    user = get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    hashed_password = get_password_hash(user_in.password)
    user = create_user(db, user=user_in, hashed_password=hashed_password, is_active=False)
    
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    OTP_STORE[user_in.email] = otp
    
    # Send email
    await send_otp_email(email_to=user_in.email, otp_code=otp)
    
    return {"message": "User created successfully. Please check your email for the OTP to activate your account."}

@router.post("/email/verify-signup-otp", status_code=status.HTTP_200_OK)
def verify_signup_otp(
    request_body: OTPRequest,
    request: Request,
    otp: str,
    db: Session = Depends(get_db)
):
    """
    Verify the OTP for a new password signup.
    Activates the user account.
    """
    email = request_body.email
    
    check_auth_rate_limit(email, max_calls=5, window_seconds=900)
    
    stored_otp = OTP_STORE.get(email)
    
    if not stored_otp or stored_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect OTP or OTP expired"
        )
        
    user = get_user_by_email(db, email=email)
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    # Activate user
    user.is_active = True
    db.add(user)
    db.commit()
    
    del OTP_STORE[email]
    
    return {"message": "Account successfully activated. You can now login."}

@router.post("/email/login", response_model=Token)
def login_email_password(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    """
    email = form_data.username
    check_auth_rate_limit(email, max_calls=5, window_seconds=900)
    
    user = get_user_by_email(db, email=email)
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first."
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current logged in user details.
    """
    return current_user


@router.post("/logout")
def logout():
    """
    Logout the user. (For stateless JWT, the client just discards the token).
    """
    return {"message": "Successfully logged out. Please discard your token."}
