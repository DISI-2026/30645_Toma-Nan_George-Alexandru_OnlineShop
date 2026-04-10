# Backend

This backend is a small FastAPI app managed with `uv`.

## Structure

- `src/backend/main.py` starts the app and exposes `/health`
- `src/backend/db.py` opens and closes the Postgres pool
- `src/backend/config.py` reads app and database settings from environment variables

## Install uv

If `uv` is not installed, install it with:

```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Then restart the terminal and check:

```bash
uv --version
```

## Setup

From the `backend` folder:

```bash
uv sync
```

That creates `.venv` and installs the project dependencies.

## Start the backend

From the `backend` folder:

```bash
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Health endpoint:

```bash
http://localhost:8000/health
```

## Run with Docker

From the repo root:

```bash
docker compose up --build
```
