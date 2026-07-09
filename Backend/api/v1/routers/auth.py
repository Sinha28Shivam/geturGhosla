from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import random

from core.limiter import limiter

from db.session import get_db
from core.security import create_access_token
from api.deps import get_current_active_user
from crud.crud_user import get_user_by_email, create_user
from schemas.user import UserCreate, UserRead
from schemas.token import Token
from db.models import User

router = APIRouter()

# Mock OTP Store (In-memory dict). Replace with Redis in production.
OTP_STORE = {}

class OTPRequest(BaseModel):
    email: EmailStr

@router.post("/email/request-otp", status_code=status.HTTP_200_OK)
@limiter.limit("5/hour")
def request_email_otp(request_body: OTPRequest, request: Request, db: Session = Depends(get_db)):
    """
    Request an OTP for email login.
    If the user doesn't exist, they will be created upon verification.
    """
    # Generate a 6 digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in mock cache
    OTP_STORE[request_body.email] = otp
    
    # In a real app, send this via email (e.g. SendGrid/AWS SES)
    print(f"--- MOCK EMAIL SENDER ---")
    print(f"To: {request_body.email}")
    print(f"Your OTP is: {otp}")
    print(f"-------------------------")
    
    return {"message": "OTP sent to email successfully (check server logs for POC)"}


@router.post("/email/verify-otp", response_model=Token)
@limiter.limit("5/15minute")
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
