from sqlalchemy import Column, Integer, String

from db.database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role            = Column(String, default="user")


class Application(Base):
    __tablename__ = "applications"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String, nullable=False)
    email            = Column(String, nullable=False)
    years_experience = Column(Integer, nullable=False)
    cover_letter     = Column(String, nullable=True)
    submitted_by     = Column(String, nullable=False)
    status           = Column(String, default="pending")
