from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import db.repository as repository
from auth.auth import create_access_token, get_current_user, hash_password, verify_password
from config import get_settings
from db.database import get_db
from db.models import User
from schemas import TokenOut, UserCreate, UserOut

router = APIRouter(tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if repository.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return repository.create_user(db, user.email, hash_password(user.password))


@router.post("/token", response_model=TokenOut)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    cfg=Depends(get_settings),
):
    user = repository.get_user_by_email(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.role}, cfg)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
