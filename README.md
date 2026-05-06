# Compass V2

Modular rebuild of [Compass](../compass). The runtime is a thin shell — every feature lives under `modules/<name>/` as a vertical slice that owns both its FastAPI routes/models/migrations and its Next.js pages/components. Drop a module in, it self-registers; remove the folder, it's gone.

This scaffold ships no product feature on purpose. It proves the plumbing (Caddy → Next.js + FastAPI → Postgres) and the module-loading contract via a single demo module, `hello`.

## Layout

```
compass_v2/
  Caddyfile
  docker-compose.yml
  backend/        # FastAPI shell (loads modules)
  frontend/       # Next.js shell (mounts modules)
  modules/
    hello/        # demo vertical slice
      module.json
      backend/    # routes.py, models.py, migrations/
      frontend/   # page.tsx, components/
```

## Prerequisites

- Docker + Docker Compose
- Add a hosts entry so Caddy can serve at a stable name:

  ```
  127.0.0.1  compass-v2.local
  ```

## Run

```sh
cp .env.example .env
docker compose up --build
```

Then:

- Dashboard: http://compass-v2.local:8080/
- Hello module page: http://compass-v2.local:8080/hello
- API health: http://compass-v2.local:8080/api/health
- Hello module API: http://compass-v2.local:8080/api/hello/ping

## Adding a module

1. Create `modules/<name>/module.json` with `{ "name", "version", "nav": [...] }`.
2. Add `modules/<name>/backend/__init__.py` exporting an `APIRouter` named `router` (and `models` if it has tables).
3. Add `modules/<name>/frontend/page.tsx` exporting a default React component.
4. Wire its frontend route in `frontend/src/app/(modules)/<name>/page.tsx` as a thin re-export, and add the module to `frontend/src/lib/modules.ts`.
5. Restart the backend; the loader picks it up automatically.

(Auto-discovery on the frontend is deferred until the second module exists.)
