from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import db.repository as repository
from config import Settings, get_settings
from db.database import get_db
from db.models import User

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict, cfg: Settings) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=cfg.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, cfg.secret_key, algorithm=cfg.algorithm)


def verify_token(token: str, cfg: Settings) -> Optional[dict]:
    try:
        return jwt.decode(token, cfg.secret_key, algorithms=[cfg.algorithm])
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    cfg: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_token(token, cfg)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = repository.get_user_by_email(db, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
