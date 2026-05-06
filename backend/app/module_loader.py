"""Discovers and registers vertical-slice modules.

A module lives at `modules/<name>/` (relative to the repo root, which is `/app` in the
container) and exposes a backend package at `modules/<name>/backend/__init__.py`. The
loader imports each backend package and, if it defines an `APIRouter` named `router`,
mounts it under `/api/<name>`. Importing the package also pulls in `models.py` so any
SQLAlchemy tables register on the shared declarative `Base.metadata` for Alembic.
"""

from __future__ import annotations

import importlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path

from fastapi import APIRouter, FastAPI

logger = logging.getLogger(__name__)

MODULES_ROOT = Path("/app/modules")


@dataclass(frozen=True)
class LoadedModule:
    name: str
    version: str
    nav: list[dict]


def _discover() -> list[Path]:
    if not MODULES_ROOT.exists():
        return []
    return sorted(p for p in MODULES_ROOT.iterdir() if p.is_dir() and (p / "module.json").exists())


def _read_manifest(module_dir: Path) -> dict:
    return json.loads((module_dir / "module.json").read_text())


def register_all(app: FastAPI) -> list[LoadedModule]:
    loaded: list[LoadedModule] = []
    for module_dir in _discover():
        manifest = _read_manifest(module_dir)
        name = manifest["name"]
        backend_pkg = f"modules.{name}.backend"
        try:
            mod = importlib.import_module(backend_pkg)
        except ModuleNotFoundError:
            logger.warning("Module %s has no backend package; skipping", name)
            continue

        router = getattr(mod, "router", None)
        if isinstance(router, APIRouter):
            app.include_router(router, prefix=f"/{name}", tags=[name])
            logger.info("Mounted module %s at /%s", name, name)
        else:
            logger.info("Module %s has no APIRouter; loaded models only", name)

        loaded.append(
            LoadedModule(
                name=name,
                version=manifest.get("version", "0.0.0"),
                nav=manifest.get("nav", []),
            )
        )
    return loaded
