import logging
from contextlib import asynccontextmanager

import db.models  # registers models onto Base before create_all runs
from db.database import Base, engine
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import get_settings
from routes import admin, applications, auth, ask
from sqlalchemy.exc import IntegrityError


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("[startup] Tables ready")
    yield
    print("[shutdown] Bye")


app = FastAPI(title="Job Application API", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred"}
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(f"Integrity constraint violated: {exc.orig}")
    return JSONResponse(
        status_code=409,
        content={"detail": "A record with this value already exists"}
    )



_settings = get_settings()
_origins = [o.strip() for o in _settings.allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(admin.router)
app.include_router(ask.router)
