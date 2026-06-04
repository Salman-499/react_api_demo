from fastapi import APIRouter, Depends, File, Request, UploadFile

from auth.auth import get_current_user
from db.models import User
from schemas import ApplicationCreate

router = APIRouter(tags=["Applications"])


@router.post("/applications", status_code=201)
def submit_application(
    application: ApplicationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    entry = {
        "id": len(request.app.state.applications) + 1,
        "name": application.name,
        "email": application.email,
        "years_experience": application.years_experience,
        "cover_letter": application.cover_letter,
        "submitted_by": current_user.email,
        "status": "pending",
    }
    request.app.state.applications.append(entry)
    return entry


@router.get("/applications")
def list_my_applications(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return [
        a for a in request.app.state.applications
        if a["submitted_by"] == current_user.email
    ]


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
