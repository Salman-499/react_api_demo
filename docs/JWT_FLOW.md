# How JWT Route Protection Works

## Step 1 — Client sends the token in the header

Every request to a protected endpoint includes:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZUB...
```

This is what the React frontend adds to every fetch call:

```js
headers: { Authorization: `Bearer ${token}` }
```

---

## Step 2 — The route declares it needs a verified user

```python
# routes/applications.py
@router.post("/applications")
def submit_application(
    application: ApplicationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),  # the gate
):
```

`Depends(get_current_user)` tells FastAPI: before running `submit_application`,
call `get_current_user` first and pass whatever it returns as `current_user`.
If `get_current_user` raises an exception, the route never runs.

---

## Step 3 — `get_current_user` runs first

```python
# auth/auth.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(
    token: str = Depends(oauth2_scheme),    # A: extract token from header
    cfg: Settings = Depends(get_settings),  # B: load secret key from .env
    db: Session = Depends(get_db),          # C: open DB session
) -> User:
    payload = verify_token(token, cfg)      # D: decode and verify JWT
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = repository.get_user_by_email(db, payload.get("sub"))  # E: load user from DB
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user                             # F: pass verified User to the route
```

### What each step does

**A — `oauth2_scheme`**
Reads the `Authorization: Bearer <token>` header and extracts just the token
string. If the header is missing entirely, it raises 401 before anything else runs.

**B — `get_settings`**
Loads `Settings` from `.env`. The JWT secret key lives here.

**C — `get_db`**
Opens a database session for the duration of this request.

**D — `verify_token`**
```python
def verify_token(token: str, cfg: Settings) -> Optional[dict]:
    try:
        return jwt.decode(token, cfg.secret_key, algorithms=[cfg.algorithm])
    except JWTError:
        return None
```
`jwt.decode` does three things automatically:
- Verifies the **signature** — was this token signed with our secret key?
- Checks the **`exp` field** — has the token expired?
- **Decodes the payload** back into a Python dict

If any of these fail it raises `JWTError`, which we catch and return `None`.
`get_current_user` then raises 401.

**E — `get_user_by_email`**
Uses the `"sub"` field from the payload (the user's email) to look up the actual
User row in the database. This confirms the user still exists and hasn't been deleted.

**F — return user**
Returns the `User` object. FastAPI passes it as `current_user` into the route.

---

## Step 4 — The route finally runs

Only now does `submit_application` execute, with a guaranteed real `User` object:

```python
def submit_application(
    application: ApplicationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),  # verified User
):
    entry = {
        ...
        "submitted_by": current_user.email,  # safe to use
    }
```

---

## The full chain

```
POST /applications
  Authorization: Bearer <token>
        │
        ▼
  oauth2_scheme           reads Authorization header
        │                 → 401 if header is missing
        ▼
  verify_token()          decodes JWT, checks signature + expiry
        │                 → 401 if token is invalid or expired
        ▼
  get_user_by_email()     loads user from database using email in token payload
        │                 → 401 if user no longer exists
        ▼
  submit_application()    route runs with current_user available
```

---

## Admin routes — stacking a second dependency

For admin-only routes a second dependency is chained on top of `get_current_user`:

```python
# auth/auth.py
def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

```python
# routes/admin.py
@router.get("/admin/users")
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return repository.get_all_users(db)
```

`require_admin` itself depends on `get_current_user`, so FastAPI runs the full
JWT verification chain first, then checks the role on top.

```
oauth2_scheme → verify_token → get_user_by_email → check role → route runs
                                                         │
                                              403 if role != "admin"
```

### 401 vs 403

| Status | Meaning                                        |
|--------|------------------------------------------------|
| 401    | Token missing, invalid, or expired             |
| 403    | Token is valid but user does not have permission |
