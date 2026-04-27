# OnlineShop

## Run backend locally

```bash
cd backend
uv sync
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Backend health check:

```bash
http://localhost:8000/health
```

## Run full stack with Docker

```bash
docker compose up --build
```

in case of errors reset the cache
```bash
docker compose down -v
docker compose build --no-cache
docker compose up --force-recreate
```

Services:

- Backend: `http://localhost:8000/health`
- Postgres: `localhost:5432`

## Stop the stack

```bash
docker compose down
```

## Collaboration

- Create branches from `main`
- Use short branch names grouped by area, for example: `backend/scaffold`, `backend/auth`, `frontend/cart`
- Keep commits focused on one task
- Open a pull request back into `main`
- Keep local `README.md` files and `.gitignore` files updated when a folder’s setup changes
- Do not commit `.env` files, local caches, or virtual environments
