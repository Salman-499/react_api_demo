# Alembic: Database Migrations with SQLAlchemy

Alembic is the standard migration tool for SQLAlchemy projects. It tracks schema changes over time the same way Git tracks code changes — every change is a versioned script that can be applied or reversed.

---

## Why Alembic?

`Base.metadata.create_all()` (used in `main.py`) only **creates** tables that don't exist yet. If you add a column to a model, it does nothing — the column never appears in the database.

Alembic solves this by comparing your SQLAlchemy models to the live database and generating a migration script describing the difference. You apply that script to update the schema safely.

---

## Setup (one time)

Run from inside `react_api_demo/backend/`:

```bash
source venv/bin/activate
pip install alembic
alembic init alembic
```

This creates:

```
backend/
  alembic/
    env.py        ← configure to point at your models
    versions/     ← generated migration scripts live here
  alembic.ini     ← configure to point at your database
```

---

## Configuration

### 1. `alembic.ini` — set the database URL

Find this line:
```
sqlalchemy.url = driver://user:pass@localhost/dbname
```
Replace it with:
```
sqlalchemy.url = sqlite:///./app.db
```

### 2. `alembic/env.py` — point at your models

Add these lines near the top of `env.py`, after the existing imports:

```python
import sys
sys.path.insert(0, '.')      # makes the backend/ package importable

from db.database import Base
import db.models              # registers models onto Base
```

Then find:
```python
target_metadata = None
```
Replace with:
```python
target_metadata = Base.metadata
```

**Why this matters:** `target_metadata = Base.metadata` is how Alembic reads your models. Without it, autogenerate has nothing to compare against the live database and produces an empty migration every time.

### Verify config is correct

```bash
alembic check
```
Expected: `No new upgrade operations detected.` — model and database are in sync.

---

## The Migration Workflow

### Step 1 — Change your model

Open `db/models.py` and add a `bio` column:

```python
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role            = Column(String, default="user")
    bio             = Column(String, nullable=True)   # new
```

The Python model is now ahead of the database — the `bio` column doesn't exist in `app.db` yet.

### Step 2 — Autogenerate a migration script

```bash
alembic revision --autogenerate -m "add bio column to users"
```

Alembic diffs your model against the live schema and writes a script in `alembic/versions/`. Open it — it will look like this:

```python
# alembic/versions/xxxx_add_bio_column_to_users.py
revision = 'abc123'
down_revision = None          # None = first migration; otherwise points to parent

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users',
        sa.Column('bio', sa.String(), nullable=True)
    )

def downgrade():
    op.drop_column('users', 'bio')
```

| Field | Meaning |
|---|---|
| `revision` | Unique ID for this migration |
| `down_revision` | ID of the previous migration (forms the chain) |
| `upgrade()` | Applies the change |
| `downgrade()` | Reverses the change |

> **Always read the generated file before applying it.** Autogenerate is smart but not perfect — it cannot detect column renames (it sees a drop + add instead).

### Step 3 — Apply the migration

```bash
alembic upgrade head
```

`head` means the latest migration. Alembic applies every unapplied migration in order up to head.

Check the current state:
```bash
alembic current        # shows which revision the database is at
alembic history --verbose  # shows the full migration chain
```

Open DBeaver and refresh the `users` table — the `bio` column is now there.

### Step 4 — Roll back

```bash
alembic downgrade -1
```

`-1` means go back one step. Alembic runs `downgrade()` from the script, dropping the `bio` column. Refresh in DBeaver — it's gone.

---

## Command Reference

```bash
alembic init alembic                           # one-time setup
alembic revision --autogenerate -m "message"  # generate migration from model diff
alembic upgrade head                           # apply all pending migrations
alembic downgrade -1                           # reverse the last migration
alembic current                                # show which revision the db is at
alembic history --verbose                      # show full migration chain
alembic check                                  # verify model matches db
```

---

## Key Concepts

| Concept | Explanation |
|---|---|
| Why not just `create_all`? | It only creates, never modifies — Alembic handles changes to existing tables |
| `target_metadata` | Gives Alembic your models to diff against the live schema |
| `down_revision` | Links migrations into a chain so Alembic knows the order |
| Always read the script | Autogenerate misses renames — verify before running `upgrade head` |
| `downgrade -1` | Safe rollback — reverses the schema without touching row data |
