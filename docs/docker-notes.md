# Docker — Student Notes

## Why Docker?

"It works on my machine" — containers eliminate this. A Docker container packages your app and all its dependencies into one portable unit that runs identically everywhere.

| | VMs | Containers |
|---|---|---|
| OS per instance | Full OS (GB, minutes to boot) | Shared kernel (MB, milliseconds) |
| Memory | Pre-allocated and locked | Used only as needed |
| Isolation | Strong | Strong |

---

## How Docker Works

```
You (terminal)
    │
    ▼
Docker CLI          ← what you type (docker run, docker build...)
    │
    ▼
Docker Daemon       ← the background service doing the actual work
    │
    ├── Images      ← stored locally on your machine
    └── Containers  ← running instances, managed by the daemon

Docker Hub          ← remote registry; daemon pulls images from here
```

When you type `docker run nginx`, the CLI sends that instruction to the daemon. The daemon checks if the image exists locally — if not, it pulls it from Docker Hub, then starts the container.

---

## Core Concepts

**Image** — a read-only snapshot of your app, runtime, and dependencies. Built from a `Dockerfile`. Think: a class definition.

**Container** — a running instance of an image. You can run many containers from one image. Think: an object created from that class.

**Docker Hub** — the default public registry. Hosts official images for nginx, postgres, python, node, and thousands more. Think: GitHub but for Docker images.

**Registry** — any remote store for images. Docker Hub is the public default; ECR is AWS's private version.

---

## Writing a Dockerfile

```dockerfile
FROM python:3.11-slim          # base image — use slim variants

WORKDIR /app                   # working directory inside the container

COPY requirements.txt .        # copy requirements FIRST (layer caching)
RUN pip install --no-cache-dir -r requirements.txt

COPY . .                       # copy code AFTER dependencies

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why copy `requirements.txt` before code?** Docker caches each layer. If you copy all code first, every single code change forces a full `pip install`. Copy `requirements.txt` first and the dependency layer is only rebuilt when it actually changes.

---

## Essential Commands

```bash
# Images
docker build -t myapp:latest .       # build from Dockerfile in current dir
docker images                        # list local images
docker pull python:3.11-slim         # download from registry
docker rmi myapp                     # remove image

# Containers
docker run -d -p 8000:8000 --name myapp myapp:latest   # run detached, map port
docker run -it ubuntu /bin/bash      # interactive shell
docker ps                            # running containers
docker ps -a                         # all containers (including stopped)
docker stop myapp
docker rm myapp

# Debugging
docker logs -f myapp                 # follow logs live
docker exec -it myapp /bin/sh        # shell into running container
docker stats                         # live CPU/memory
docker inspect myapp                 # detailed JSON info
```

**Port mapping:** `-p host:container` — `-p 8080:8000` means requests to your laptop's port 8080 are forwarded to port 8000 inside the container.

---

## Docker Compose

Real apps are multi-container. Compose lets you define the full stack in one file and start everything with one command.

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      retries: 5

  app:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - .:/app                        # bind mount for hot reload
    depends_on:
      db:
        condition: service_healthy    # wait for DB to be ready

volumes:
  postgres_data:
```

**Container networking:** In Compose, each service name is a DNS hostname on the shared network. The `app` service connects to the database at `db:5432` — not `localhost:5432`.

```bash
# Compose commands
docker compose up --build    # build and start everything
docker compose up -d         # start in background
docker compose down          # stop and remove containers
docker compose down -v       # also remove volumes (wipes DB data)
docker compose logs -f       # follow logs from all services
docker compose exec app bash # shell into a running service
docker compose ps            # status of all services
```

---

## Volumes

Containers are ephemeral — removing one deletes everything inside it. Volumes persist data.

**Named volumes** — managed by Docker, survive container removal. Use for databases.
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

**Bind mounts** — link a host directory into the container in real time. Use for development hot-reload.
```yaml
volumes:
  - .:/app    # your local files are live inside the container
```

---

## Environment Variables

Never hardcode secrets in your Dockerfile or source code.

`.env` (add to `.gitignore`):
```env
POSTGRES_USER=appuser
POSTGRES_PASSWORD=supersecret
POSTGRES_DB=appdb
DATABASE_URL=postgresql://appuser:supersecret@db:5432/appdb
```

```bash
echo ".env" >> .gitignore
```

In `docker-compose.yml`:
```yaml
app:
  env_file:
    - .env    # all variables from .env loaded into the container
```

---

## Quick Reference

```bash
# Build → Run
docker build -t myapp:latest .
docker run -d -p 8000:8000 myapp:latest

# Compose
docker compose up --build
docker compose down -v

# Debug
docker logs -f <name>
docker exec -it <name> /bin/sh
docker stats
```

The mental model: **Dockerfile → Image → Container**
