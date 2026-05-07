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
- **Dev environment:** Docker Compose only. Add `127.0.0.1 compass-v2.local` to `/etc/hosts`. App is at `http://compass-v2.local`. Caddy binds host port 80, so v1 (also on 80) must be stopped first. Postgres is exposed on host `5433` (so v1 on `5432` keeps working). Caddy uses `auto_https off` to stay HTTP.

Notably absent vs. v1: ChromaDB, faster-whisper, Anthropic client, n8n. Each comes back when a module needs it.

## Module contract

**Module names must be snake_case**, not kebab-case. The loader does `importlib.import_module(f"modules.{name}.backend")`, which fails on hyphens. The same name is used as the folder, the manifest `name`, the URL prefix, and the Python package — keep them identical.

A module is the directory `modules/<name>/`. It must contain:

1. **`module.json`** — `{ "name": "<name>", "version": "x.y.z", "nav": [{ "label", "href" }] }`. The loader uses this for discovery; absence means the directory is ignored.
2. **`backend/__init__.py`** — a Python package. If it exposes an `APIRouter` named `router`, the loader mounts it at `/<name>` (so `/api/<name>/...` after Caddy strips the prefix). It should also import its `models` submodule so SQLAlchemy classes register on the shared `Base.metadata`.
3. **`frontend/page.tsx`** — default-exports a React component. Wire it into Next.js by adding a one-line re-export at `frontend/src/app/(modules)/<name>/page.tsx`: `export { default } from "@modules/<name>/frontend/page";` — the `/frontend/` segment goes in the import path, not the tsconfig alias (TS path wildcards only substitute once). Add `{ name, nav }` to `frontend/src/lib/modules.ts` so the sidebar links it.

Per-module migrations live at `modules/<name>/backend/migrations/versions/`. They aren't auto-discovered yet — for the scaffold, all migrations live under `backend/migrations/versions/`. Switch to `version_locations` once a module ships tables.

## Container layout

Both `backend` and `frontend` containers mount the repo's `modules/` directory:

- **Backend** WORKDIR is `/app/backend`, with `PYTHONPATH=/app:/app/backend`. So `app.*` imports resolve to the shell, and `modules.<name>.backend` imports resolve to a vertical slice. The loader walks `/app/modules/*/module.json`.
- **Frontend** WORKDIR is `/app/frontend`. The tsconfig path alias `@modules/*` → `../modules/*/frontend` resolves at compile time. `next.config.ts` sets `outputFileTracingRoot` to the repo root so files outside `frontend/` are included in the build.

## Running backend commands in the container

`docker compose exec` does not inherit the entrypoint's env, so set `PYTHONPATH` explicitly. Use the migrate wrapper for alembic — bare `alembic` won't pick up per-module `version_locations`:

```bash
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend python -m app.scripts.migrate current
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend python -m app.scripts.migrate upgrade head
docker compose exec -T -e PYTHONPATH=/app:/app/backend backend python -m app.scripts.migrate revision -m "msg" --autogenerate --version-path /app/modules/<name>/backend/migrations/versions
```

Run tests (52 tests, ~99% coverage):

```bash
docker compose exec -T backend sh -c "cd /app && PYTHONPATH=/app:/app/backend pytest"
```

Hit the API directly through Caddy for ad-hoc debugging (no frontend round-trip):

```bash
curl -s http://compass-v2.local/api/agile_digests/digests/1
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

## Gotchas

- **macOS bind mounts can serve stale content.** After editing files mounted into a container (`tsconfig.json`, `conftest.py`, etc.), restart the service if you see "old version" symptoms: `docker compose restart <svc>`.
- **Coverage on async routes** needs `concurrency = thread,greenlet` in `backend/.coveragerc` plus the `greenlet` package, otherwise lines after `await` go uncounted.
- **Tests use NullPool** (set in `conftest.py`) because asyncpg connections bind to the event loop that created them, and pytest-asyncio creates a fresh loop per test.
- **DB DNS race**: `entrypoint.sh` runs `app.scripts.wait_for_db` before alembic — `depends_on: service_healthy` isn't enough on its own.
- **Adding a root-level file that the backend container needs to see** (e.g. test config) requires a new `volumes:` entry in `docker-compose.yml`.
- **Replacing a relationship collection with overlapping unique keys**: SA orders new INSERTs before orphan DELETEs, so re-saving with the same child keys (e.g. `(digest_id, feature_id)`) trips the unique constraint. Call `coll.clear()` + `await db.flush()` before reassigning, and wrap `_build_*` together with `commit()` in the `IntegrityError` try/except since the flush can raise.
- **Test relationship-replacement with same keys, not just different keys** — re-saving a parent with identical child IDs is a separate code path that exercises orphan-delete ordering. The "with different keys" test passes even when the same-keys path is broken.
- **Debugging swallowed `IntegrityError`s**: routes catch and re-raise as generic 409s, hiding which constraint fired. Temporarily `print(f"... {e!r}", file=sys.stderr, flush=True)` in the except branch to see the real constraint name in `docker compose logs backend`.

## Frontend module conventions

The frontend is dark-only, dense, and Linear-leaning, built on **Mantine v9** with Tailwind v4 reserved for layout glue. Full reference at `frontend/docs/design-system.md` and live at `/design_system`.

- **Mantine first.** Component identity (buttons, inputs, cards, alerts, tables) comes from Mantine. Tailwind utilities only for layout (`flex`, `grid`, `gap-*`, `space-y-*`).
- **No light mode.** Never use `dark:` variants or conditional theming. Color scheme is forced dark in the root layout.
- **Every module page opens with `<PageHeader>`** from `@/components/ui`, then groups sections with `<DataCard>`. Use `<EmptyState>` when there's no data yet and `<StatCard>` for dashboard tiles.
- **Icons:** `@tabler/icons-react`. Size 14 inline, 16 in alerts/inputs, 20 in headers.
- **Theme:** single source of truth in `frontend/src/lib/theme.ts`. Default radius `sm`, default component size `sm`.
- **Navigation:** register module nav entries in `frontend/src/lib/modules.ts` — both the sidebar and the `⌘K` Spotlight palette read from there.

## Git rules

- Never reference Claude Code or Anthropic as a co-author in commits.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
