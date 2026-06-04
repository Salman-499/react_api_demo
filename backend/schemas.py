from typing import Optional

from pydantic import BaseModel, EmailStr


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
    name: str
    email: EmailStr
    years_experience: int
    cover_letter: Optional[str] = None
