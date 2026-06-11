from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

import db.repository as repository
from auth.auth import get_current_user
from db.database import get_db
from db.models import Application, User
from schemas import ApplicationCreate, ApplicationOut

router = APIRouter(tags=["Applications"])


@router.post("/applications", response_model=ApplicationOut, status_code=201)
def submit_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):  
    entry = Application(
        name=application.name,
        email=application.email,
        years_experience=application.years_experience,
        cover_letter=application.cover_letter,
        submitted_by=current_user.email,
    )
    return repository.create_application(db, entry)


@router.get("/applications", response_model=list[ApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return repository.get_applications_by_user(db, current_user.email)


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "uploaded_by": current_user.email,
    }
