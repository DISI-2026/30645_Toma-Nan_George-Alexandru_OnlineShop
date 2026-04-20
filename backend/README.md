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

## Database Schema

This repo currently uses SQLAlchemy models, but no formal migration tool.

Current team workflow:
- update the SQLAlchemy models in `src/models/`
- if the schema changes, recreate/reset the local development database
- do not assume old local data must be preserved yet

Helper commands:

```bash
uv run init-db
uv run reset-db
```

See [DB_WORKFLOW.md](DB_WORKFLOW.md) for the short workflow.

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
