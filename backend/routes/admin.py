from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db.repository as repository
from auth.auth import require_admin
from db.database import get_db
from db.models import User
from schemas import UserOut

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return repository.get_all_users(db)


@router.put("/users/{user_id}/role")
def update_role(
    user_id: int,
    role: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = repository.update_user_role(db, user_id, role)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = repository.delete_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user.email} deleted"}
