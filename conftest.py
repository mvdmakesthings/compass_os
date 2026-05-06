"""Shared pytest fixtures.

Tests run inside the backend container via:
    docker compose exec backend pytest

Setup order matters:
1. Override `POSTGRES_DB` to a test database BEFORE any app modules import.
2. Create the test database and run migrations at module-import time (not inside
   an async fixture). The Alembic `env.py` uses `asyncio.run()`, which fails when
   called from a running event loop, so this has to happen before
   pytest-asyncio's loop starts.
3. Each test gets its tables truncated, plus a fastembed mock so we don't load
   the real ONNX model.
"""

from __future__ import annotations

import asyncio
import hashlib
import os

# Must run before any app/module imports so the engine binds to the test DB.
os.environ["POSTGRES_DB"] = "compass_test"

# pytest-asyncio creates a fresh event loop per test by default; asyncpg
# connections are bound to the loop that created them, so a pooled connection
# checked out in a previous test crashes with "attached to a different loop".
# Force the engine to use NullPool so every checkout opens a fresh connection
# in the current loop.
import sqlalchemy.ext.asyncio as _sa_async  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

_orig_create_async_engine = _sa_async.create_async_engine


def _create_async_engine_nullpool(url, **kw):
    kw.setdefault("poolclass", NullPool)
    return _orig_create_async_engine(url, **kw)


_sa_async.create_async_engine = _create_async_engine_nullpool

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

USER = os.getenv("POSTGRES_USER", "compass")
PASSWORD = os.getenv("POSTGRES_PASSWORD", "compass")
HOST = os.getenv("DB_HOST", "db")
TEST_DB = os.environ["POSTGRES_DB"]


def _admin_url(database: str = "postgres") -> str:
    return f"postgresql+asyncpg://{USER}:{PASSWORD}@{HOST}/{database}"


async def _ensure_database() -> None:
    admin = create_async_engine(_admin_url("postgres"), isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        existing = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": TEST_DB}
        )
        if existing.scalar() is None:
            await conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    await admin.dispose()


def _run_migrations() -> None:
    from alembic import command

    from app.scripts.migrate import build_config

    command.upgrade(build_config(), "head")


# --- Eager setup at conftest import time (no running loop yet) ---
asyncio.run(_ensure_database())
_run_migrations()


def _fake_vector(text_in: str, dim: int = 384) -> list[float]:
    """Deterministic bag-of-words pseudo-embedding: each lowercased word activates
    one dimension, summed and L2-normalized. Texts that share words land close in
    cosine distance, which is enough for the search-ranking tests to be stable
    without loading the real fastembed model."""
    vec = [0.0] * dim
    for word in "".join(c if c.isalnum() else " " for c in text_in.lower()).split():
        idx = int(hashlib.md5(word.encode()).hexdigest(), 16) % dim
        vec[idx] += 1.0
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


@pytest_asyncio.fixture(autouse=True)
async def _truncate_tables():
    yield
    from app.database import engine

    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE TABLE ad_digest_updates, ad_digests, ad_features, "
                "team_members, people, teams "
                "RESTART IDENTITY CASCADE"
            )
        )


# Keep a handle on the real `encode_many` so tests that want to exercise the
# original (e.g. for branch coverage of the lazy-load path) can monkeypatch it
# back into place.
from modules.agile_digests.backend import embeddings as _embeddings_module  # noqa: E402

REAL_ENCODE_MANY = _embeddings_module.encode_many


@pytest.fixture(autouse=True)
def _mock_embeddings(monkeypatch):
    """Replace `encode_many` with a deterministic stub. `encode` is left alone so
    its real (one-line) delegation through `encode_many` is exercised — this
    keeps tests of the wrapper honest while still avoiding the fastembed model
    download."""
    from modules.agile_digests.backend import embeddings

    def fake_encode_many(texts):
        return [_fake_vector(t) for t in texts]

    monkeypatch.setattr(embeddings, "encode_many", fake_encode_many)


@pytest_asyncio.fixture
async def client():
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def db():
    from app.database import async_session

    async with async_session() as session:
        yield session
