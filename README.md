# Compass

> A modular work hub. Every feature is a folder you can drop in or remove.

Compass is a personal "work OS" built on a vertical-slice module pattern. The runtime is a thin shell — Caddy out front, FastAPI on the back, Next.js for the UI, Postgres for state. Each feature lives under `modules/<name>/` and owns its routes, schema, migrations, *and* pages. Add a folder; the loader picks it up. Remove the folder; it's gone.

## Status

Personal project, actively developed. Single-user, local-only, no auth. Public because the modular pattern might be useful to someone else.

## Quick start

```sh
git clone git@github.com:mvdmakesthings/compass_os.git
cd compass_os
echo '127.0.0.1 compass-v2.local' | sudo tee -a /etc/hosts
cp .env.example .env
docker compose up --build
```

App: <http://compass-v2.local>.

## What's inside

Two modules ship today:

- **`hello`** — the smallest possible vertical slice. One route, one page. Use it as a template.
- **`agile_digests`** — track per-team sprint digests (in-progress and upcoming features, status, target dates) and search across them with semantic embeddings.

Together they exercise the contract end-to-end: HTTP routes, SQLAlchemy models, per-module Alembic migrations, pgvector + a local embedding model, Next.js pages, and a sidebar registered through the module manifest.

## How modules work

A module is the directory `modules/<name>/`:

```
modules/agile_digests/
├── module.json              # { name, version, nav }
├── backend/
│   ├── __init__.py          # exports `router`, imports `models`
│   ├── routes.py            # FastAPI APIRouter
│   ├── models.py            # SQLAlchemy classes on the shared `Base`
│   └── migrations/versions/ # Alembic revisions, auto-discovered
└── frontend/
    ├── page.tsx             # default-exported React component
    └── components/...
```

When the backend boots, the loader scans `modules/*/module.json`, imports each backend package, and mounts its `router` at `/api/<name>`. Models register on a shared SQLAlchemy `Base` so they show up in autogeneration. The Next.js shell mounts pages via one-line re-exports under `frontend/src/app/(modules)/<name>/`.

To add a module:

1. Create `modules/your_module/` (snake_case — Python imports won't tolerate hyphens) with the structure above and a `module.json`:

   ```json
   {
     "name": "your_module",
     "version": "0.0.1",
     "nav": [{ "label": "Your Module", "href": "/your_module" }]
   }
   ```

2. Add a one-line re-export at `frontend/src/app/(modules)/your_module/page.tsx`:

   ```ts
   export { default } from "@modules/your_module/frontend/page";
   ```

3. Register it in `frontend/src/lib/modules.ts` so the sidebar links to it.

4. Restart the backend. Tables and routes appear; remove the folder and they're gone.

## Tech stack

| Layer          | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| Reverse proxy  | Caddy 2                                                           |
| Backend        | FastAPI · Python 3.12 · SQLAlchemy 2 (async) · Alembic            |
| Frontend       | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4     |
| Database       | PostgreSQL 16 + pgvector                                          |
| Embeddings     | fastembed (`BAAI/bge-small-en-v1.5`) — local, no API key required |
| Dev runtime    | Docker Compose                                                    |

## Development

Tests run inside the backend container. The suite covers both the shell and every shipped module.

```sh
# 52 tests, ~99% line + branch coverage
docker compose exec -T backend sh -c "cd /app && PYTHONPATH=/app:/app/backend pytest"
```

Migrations go through a wrapper that discovers `version_locations` across modules — `alembic` directly won't see them.

```sh
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend \
  python -m app.scripts.migrate upgrade head

docker compose exec -T -e PYTHONPATH=/app:/app/backend backend \
  python -m app.scripts.migrate revision \
    -m "add x to y" --autogenerate \
    --version-path /app/modules/<name>/backend/migrations/versions
```

Inspect the database directly:

```sh
docker compose exec -T db psql -U compass -d compass
```

## Repository layout

```
.
├── Caddyfile             # routes /api → backend, / → frontend
├── docker-compose.yml    # db, backend, frontend, caddy
├── backend/              # FastAPI shell — owns no features
├── frontend/             # Next.js shell — owns chrome only
├── modules/
│   ├── hello/
│   └── agile_digests/
└── conftest.py           # shared pytest fixtures (test DB, embedding stub)
```

## Design principles

- **The shell is thin.** It only ever grows in service of the module contract — loader, routing, migration discovery. Features go in `modules/`.
- **Add capabilities only when a module needs them.** pgvector and fastembed arrived with `agile_digests`, not preemptively. The next dependency waits its turn.
- **Defer until the second example.** Patterns hand-wired for module #1 (e.g., the explicit `lib/modules.ts` registry) get auto-discovered when module #2 makes the right abstraction obvious.
- **Single-user, local-only.** No auth, no multi-tenancy, no observability stack. This is a workshop, not a SaaS.

## License

[MIT](./LICENSE).
