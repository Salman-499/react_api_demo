# Error Handling Across the Full Stack

Errors happen at every layer — the database, the API, and the browser. A well-structured app handles them at each boundary so nothing fails silently and nothing leaks internal details to the client.

```
[React Browser] ──→ [FastAPI Backend] ──→ [SQLite DB]
   .catch()           exception_handler      IntegrityError
   error state        logging                Pydantic 422
   console.error      HTTP 409/500           Field constraints
```

---

## Layer 1 — Pydantic: Schema Validation

Pydantic validates incoming request bodies before your route function runs. By default, a model with no constraints accepts empty strings and negative numbers:

```python
# schemas.py — no constraints
class ApplicationCreate(BaseModel):
    name: str                          # accepts ""
    email: EmailStr
    years_experience: int              # accepts -5
    cover_letter: Optional[str] = None
```

Add `Field` constraints to reject invalid input at the boundary:

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    years_experience: int = Field(ge=0)    # ge = greater than or equal to
    cover_letter: Optional[str] = None
```

When a request fails validation, FastAPI automatically returns **HTTP 422** with a structured body — no error handling code required:

```json
{
  "detail": [
    {
      "loc": ["body", "years_experience"],
      "msg": "Input should be greater than or equal to 0",
      "type": "greater_than_equal"
    }
  ]
}
```

You can test this in the auto-generated docs at `http://localhost:8000/docs`.

---

## Layer 2 — FastAPI: Exception Handlers

### The problem without handlers

Without a global exception handler, any unhandled exception returns a raw HTTP 500 that may include a Python traceback. That leaks internal implementation details to the client and gives the user nothing useful.

### Global exception handler

Add this to `backend/main.py` after the imports, before `app.include_router(...)`:

```python
import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred"}
    )
```

Two things happen: the full traceback is logged server-side for you to debug, and the client receives a clean `{"detail": "..."}` with no internal details.

### Specific handler for database constraint violations

A duplicate email passes Pydantic validation (it is a valid email) but violates the unique constraint in the database, triggering SQLAlchemy's `IntegrityError`. Handle it specifically so it returns **HTTP 409 Conflict** instead of 500:

```python
from sqlalchemy.exc import IntegrityError

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(f"Integrity constraint violated: {exc.orig}")
    return JSONResponse(
        status_code=409,
        content={"detail": "A record with this value already exists"}
    )
```

FastAPI matches the most specific handler first. `IntegrityError` → 409. Everything else → 500 from the global handler.

### Why `"detail"` as the key

FastAPI's own `HTTPException` already uses `{"detail": "..."}`. By using the same key in your custom handlers, the React frontend can read `data.detail` from every error response — 422 from Pydantic, 409 from your handler, 500 from the global handler — with one consistent pattern:

```jsx
// MainApp.jsx
setMessage({ text: data.detail || 'Submission failed', color: 'red' })
```

Pick one format and commit to it across all error responses.

### The three-tier strategy

| What happens | Handler | Status |
|---|---|---|
| Invalid field value (e.g. `years_experience: -1`) | Pydantic — automatic | 422 |
| Duplicate email or unique constraint violation | `IntegrityError` handler | 409 |
| Any other unhandled exception | Global handler | 500 |

---

## Layer 3 — React: Catching Fetch Failures

### The silent failure problem

`fetch` does **not** throw on HTTP error status codes. A 401 or 500 response body gets silently passed along as if it were valid data:

```jsx
// BROKEN — silent failure
useEffect(() => {
  fetch(`${API}/applications`, { headers: authHeaders })
    .then((r) => r.json())
    .then(setApplications)    // called even on 401/500 — sets bad data
}, [])
```

If the backend is down, the list stays empty with no explanation. The user has no idea what happened.

### The correct pattern

Check `r.ok` before parsing the body, and always handle `.catch`:

```jsx
const [fetchError, setFetchError] = useState(null)

useEffect(() => {
  fetch(`${API}/applications`, { headers: authHeaders })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)  // turns 4xx/5xx into a thrown error
      return r.json()
    })
    .then(setApplications)
    .catch((err) => {
      console.error('[MainApp] applications fetch failed:', err)
      setFetchError('Could not load your applications.')
    })
}, [])
```

Render the error state in JSX:

```jsx
{fetchError && (
  <div style={{ color: 'red', marginTop: '1rem', fontSize: 14 }}>
    {fetchError}
  </div>
)}
```

### Two separate audiences

`console.error` is for you the developer — it appears in red in the Console tab with a full stack trace. The `fetchError` state is for the user — it renders a readable message in the UI. Both are necessary. Without `console.error` you debug blind. Without the error state your user is confused.

Prefix every `console.error` with the component name (`[MainApp]`). When you have 20 components logging, you can filter by name in the Console tab.

---

## React DevTools

React DevTools is a browser extension that adds a **Components** tab to Chrome/Firefox DevTools.

**Components tab** — inspect the live component tree. Click any component to see its current `props` and `state`. Useful for confirming that context values are correct, state is updating as expected, or that a component received the props you intended.

What to look for when debugging:
- Click `AuthProvider` → check that `token` and `status` are what you expect
- Click `MainApp` → confirm `fetchError` is `null` on success and the error string on failure
- Verify that `applications` is populated after a successful fetch

---

## The Full Error Chain

| What you trigger | What fires | What the user sees |
|---|---|---|
| Submit `years_experience: -1` | Pydantic 422 | Red message from `data.detail` |
| Register with a duplicate email | `IntegrityError` → 409 handler | Red message: "A record with this value already exists" |
| Backend is down, page loads | `fetch` fails → `.catch` | Red message: "Could not load your applications." |

Three layers, three defenses. Pydantic at the schema boundary. Exception handlers at the API boundary. `.catch` and error state at the UI boundary. Errors do not disappear silently anywhere in this stack.

---

## Key Concepts

| Concept | Explanation |
|---|---|
| `if (!r.ok) throw` | `fetch` never throws on HTTP errors — you must check `r.ok` and throw manually to trigger `.catch` |
| `detail` key convention | Match FastAPI's `HTTPException` format so the frontend can read all errors the same way |
| Specific before global | FastAPI runs the most specific matching exception handler; the global one is the fallback |
| `console.error` vs error state | Developer-facing (console) and user-facing (UI) are separate concerns — you need both |
| `exc_info=True` | Tells Python's logger to include the full traceback in the log output |
