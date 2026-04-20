# Database Workflow

For now the database is disposable.

Rules:
- SQLAlchemy models in `backend/src/models/` are the schema source of truth.
- We do not preserve local database data.
- If the schema changes, reset and recreate the database.

Automation:
- Docker startup always uses a fresh Postgres instance.
- Backend startup resets the schema and recreates all tables from SQLAlchemy models.

Commands from the `backend/` folder:

```bash
uv run init-db
uv run reset-db
```

Or from repo root:

```bash
uv run --project backend init-db
uv run --project backend reset-db
```

Docker:

```bash
docker compose up --build
```

That starts a fresh database every time and recreates tables automatically.
