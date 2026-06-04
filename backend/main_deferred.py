from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

app = FastAPI(title="Job Application API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Step 1 + 2: BaseModel with specialist field types
# ---------------------------------------------------------------------------

# Step 3 + 4: Field constraints + Optional
class JobApplicationCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    age: int = Field(..., gt=17, lt=65)
    years_experience: int = Field(..., ge=0, le=40)
    cover_letter: Optional[str] = None


# Step 5: Separate response model — only safe fields go back to the client
class JobApplicationOut(BaseModel):
    id: int
    name: str
    email: str
    years_experience: int
    status: str
    # age, cover_letter, internal_notes are intentionally excluded


# Step 5 (cont): Internal model — what lives in the "database"
class JobApplicationInDB(JobApplicationOut):
    age: int
    cover_letter: Optional[str]
    internal_notes: Optional[str]


# ---------------------------------------------------------------------------
# Simulated in-memory database
# ---------------------------------------------------------------------------
applications_db: list[dict] = []


# ---------------------------------------------------------------------------
# Step 6: Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/applications",
    response_model=JobApplicationOut,          # filters output automatically
    status_code=status.HTTP_201_CREATED,       # 201, not 200
)
def submit_application(application: JobApplicationCreate):
    new_application = {
        "id": len(applications_db) + 1,
        "name": application.name,
        "email": application.email,
        "age": application.age,
        "years_experience": application.years_experience,
        "cover_letter": application.cover_letter,  # stored internally
        "internal_notes": None,                    # stored internally
        "status": "pending",
    }
    applications_db.append(new_application)
    # response_model strips cover_letter, age, internal_notes before sending
    return new_application


@app.get("/applications", response_model=list[JobApplicationOut])
def list_applications():
    return applications_db


@app.get("/applications/{app_id}", response_model=JobApplicationOut)
def get_application(app_id: int):
    for app in applications_db:
        if app["id"] == app_id:
            return app
    raise HTTPException(status_code=404, detail="Application not found")
