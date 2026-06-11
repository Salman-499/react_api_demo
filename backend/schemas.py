from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str


class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    years_experience: int 
    cover_letter: Optional[str] = None


class ApplicationOut(BaseModel):
    id: int
    name: str
    email: str
    years_experience: int
    cover_letter: Optional[str]
    submitted_by: str
    status: str
    model_config = {"from_attributes": True}
