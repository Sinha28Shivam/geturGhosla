from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from db.session import get_db
from core.security import SECRET_KEY, ALGORITHM
from schemas.token import TokenData
from crud.crud_user import get_user
from db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/email/verify-otp")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/v1/auth/email/verify-otp", auto_error=False)

def decode_token_or_raise(token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise credentials_exception

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token_or_raise(token)
    if payload.get("role") == "admin":
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    token_data = TokenData(user_id=user_id)
    
    user = get_user(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin_session(token: str = Depends(oauth2_scheme)):
    payload = decode_token_or_raise(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload
