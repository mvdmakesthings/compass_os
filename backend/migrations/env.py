"""Alembic env.

Two responsibilities beyond the boilerplate:

1. Import every module's backend package so its `models.py` registers tables on the
   shared `Base.metadata` (needed for autogeneration to see them).
2. Add each module's `migrations/versions/` directory to Alembic's `version_locations`
   so per-module revisions are picked up alongside the shell's own versions dir.
"""

import asyncio
import importlib
import json
import os
from pathlib import Path

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.database import Base

config = context.config

MODULES_ROOT = Path("/app/modules")
SHELL_VERSIONS = Path(__file__).parent / "versions"

_module_version_paths: list[str] = []
if MODULES_ROOT.exists():
    for module_dir in sorted(MODULES_ROOT.iterdir()):
        manifest = module_dir / "module.json"
        if not manifest.exists():
            continue
        name = json.loads(manifest.read_text())["name"]
        try:
            importlib.import_module(f"modules.{name}.backend")
        except ModuleNotFoundError:
            pass
        versions = module_dir / "backend" / "migrations" / "versions"
        if versions.is_dir():
            _module_version_paths.append(str(versions))

config.set_main_option(
    "version_locations",
    " ".join([str(SHELL_VERSIONS), *_module_version_paths]),
)

target_metadata = Base.metadata

user = os.getenv("POSTGRES_USER", "compass")
password = os.getenv("POSTGRES_PASSWORD", "compass")
host = os.getenv("DB_HOST", "db")
db_name = os.getenv("POSTGRES_DB", "compass")
DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}/{db_name}"


def run_migrations_offline():
    context.configure(url=DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
