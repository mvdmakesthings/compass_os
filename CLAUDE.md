# Compass V2

Modular rebuild of [Compass](../compass). The runtime is a thin shell; every feature is a vertical-slice module under `modules/<name>/` that owns its FastAPI routes/models/migrations and its Next.js pages/components. Drop a module in, it self-registers; remove the folder, it's gone.

This codebase is in scaffold state. There are no product features yet — only infrastructure plus a `hello` demo module that proves the loader contract end-to-end.

## Layout

```
compass_v2/
  Caddyfile              # compass-v2.local → frontend, /api/* → backend (prefix stripped)
  docker-compose.yml     # db, backend, frontend, caddy

  backend/               # FastAPI shell — owns no features
    app/
      main.py            # creates app, registers core router, calls module_loader
      database.py        # async engine, sessionmaker, shared `Base`
      module_loader.py   # discovers modules/*/module.json, imports backend pkg, mounts router
      core/health.py     # /api/health (always-on)
    migrations/          # alembic; env.py also imports module backends so models register
    alembic.ini
    Dockerfile
    entrypoint.sh        # alembic upgrade head && uvicorn

  frontend/              # Next.js shell — owns chrome only
    src/
      app/
        layout.tsx       # sidebar reads `lib/modules.ts`
        page.tsx         # landing
        (modules)/       # one folder per module — each page is a one-line re-export
      lib/
        api.ts           # fetch wrapper hitting /api
        modules.ts       # client-side module registry (currently hardcoded)
    next.config.ts
    tsconfig.json        # `@modules/*` → `../modules/*/frontend`

  modules/
    hello/
      module.json        # { name, version, nav }
      backend/
        __init__.py      # exports `router` and pulls in `models`
        routes.py        # GET /hello/ping → { ok, db_now }
        models.py        # placeholder; future tables inherit from `app.database.Base`
        migrations/versions/
      frontend/
        page.tsx         # default-exported React component
```

## Tech stack

- **Backend:** FastAPI, Python 3.12+, SQLAlchemy 2 (async), asyncpg, Alembic
- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4
- **Database:** PostgreSQL 16
- **Reverse proxy:** Caddy 2, serving `http://compass-v2.local`
- **Dev environment:** Docker Compose only. Add `127.0.0.1 compass-v2.local` to `/etc/hosts`.

Notably absent vs. v1: ChromaDB, faster-whisper, Anthropic client, n8n. Each comes back when a module needs it.

## Module contract

A module is the directory `modules/<name>/`. It must contain:

1. **`module.json`** — `{ "name": "<name>", "version": "x.y.z", "nav": [{ "label", "href" }] }`. The loader uses this for discovery; absence means the directory is ignored.
2. **`backend/__init__.py`** — a Python package. If it exposes an `APIRouter` named `router`, the loader mounts it at `/<name>` (so `/api/<name>/...` after Caddy strips the prefix). It should also import its `models` submodule so SQLAlchemy classes register on the shared `Base.metadata`.
3. **`frontend/page.tsx`** — default-exports a React component. Wire it into Next.js by adding a one-line re-export at `frontend/src/app/(modules)/<name>/page.tsx`: `export { default } from "@modules/<name>/page";`. Add `{ name, nav }` to `frontend/src/lib/modules.ts` so the sidebar links it.

Per-module migrations live at `modules/<name>/backend/migrations/versions/`. They aren't auto-discovered yet — for the scaffold, all migrations live under `backend/migrations/versions/`. Switch to `version_locations` once a module ships tables.

## Container layout

Both `backend` and `frontend` containers mount the repo's `modules/` directory:

- **Backend** WORKDIR is `/app/backend`, with `PYTHONPATH=/app:/app/backend`. So `app.*` imports resolve to the shell, and `modules.<name>.backend` imports resolve to a vertical slice. The loader walks `/app/modules/*/module.json`.
- **Frontend** WORKDIR is `/app/frontend`. The tsconfig path alias `@modules/*` → `../modules/*/frontend` resolves at compile time. `next.config.ts` sets `outputFileTracingRoot` to the repo root so files outside `frontend/` are included in the build.

## Running backend commands in the container

`docker compose exec` does not inherit the entrypoint's env, so set `PYTHONPATH` explicitly:

```bash
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend alembic current
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend alembic upgrade head
```

Inspect the dev DB:

```bash
docker compose exec -T db psql -U compass -d compass -c "\dt"
```

## Design principles

- **Modular by default.** New product surface area arrives as a new module, never as edits to the shell. The shell only ever grows in service of the contract (loader, routing, migrations discovery).
- **Single-user, local-only.** No auth. Runs at `compass-v2.local` on the developer's machine.
- **Add capabilities only when a module needs them.** The shell stays minimal. Vector search, transcription, AI clients, etc. land alongside the first module that uses them, behind dependency-injection seams that other modules can opt into.
- **Defer until the second example.** Patterns we hand-wrote for the first module (e.g., the hardcoded `lib/modules.ts` registry, the single Alembic versions dir) get auto-discovered/generalized only once a second module shows what the right abstraction is.

## Out of scope (as of scaffold)

- Authentication
- Vector search / semantic search
- Voice transcription
- LLM-driven extraction
- Tests beyond a smoke check (test infra arrives with the first real feature module)
- Production Dockerfiles (`output: 'standalone'`, multi-stage builds)
- Auto-discovery of frontend modules at build time

## Git rules

- Never reference Claude Code or Anthropic as a co-author in commits.
