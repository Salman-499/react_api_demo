# React + FastAPI Teaching Demo

A small full-stack app I built step by step while co-teaching the AI Python Bootcamp at WeCloudData (2026). Each commit adds one topic from the course, so students could follow along and compare their code at each stage.

The app is a simple job-application tracker: users sign up, submit applications and ask questions about them in plain English.

## What it covers

| Topic | Where |
|---|---|
| React components, routing, auth context | `src/` |
| FastAPI routes and Pydantic schemas | `backend/routes/`, `backend/schemas.py` |
| JWT login and protected routes | `backend/auth/`, `docs/JWT_FLOW.md` |
| User roles and admin endpoints | `backend/routes/admin.py` |
| SQLAlchemy models and CRUD | `backend/db/` |
| File upload (résumés) | `POST /upload-resume` |
| Error handling | `backend/main.py`, `docs/error-handling-notes.md` |
| Tests | `backend/tests/` |
| RAG with LangChain, FAISS and OpenAI over a user's applications | `backend/routes/ask.py`, `docs/langchain-rag-notes.md` |
| Docker, Docker Compose and Nginx | `Dockerfile`, `docker-compose.yml`, `docs/docker-notes.md` |
| Deploying to AWS | `docs/aws-notes.md` |

The `docs/` folder has the notes I wrote for each session.

## Running it

```bash
# create backend/.env with SECRET_KEY and OPENAI_API_KEY (needed for /ask)
docker-compose up --build       # frontend on http://localhost, API on :8000
```

For local development without Docker:

```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
npm install && npm run dev      # from the repo root
```

The database is SQLite by default (`DATABASE_URL` changes it).
