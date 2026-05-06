"""Tests for module discovery and registration."""

import json
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI

from app.module_loader import register_all


def test_register_all_skips_missing_module_json(tmp_path: Path):
    fake_modules = tmp_path / "modules"
    fake_modules.mkdir()
    (fake_modules / "noisy").mkdir()  # no module.json -> should be skipped

    app = FastAPI()
    with patch("app.module_loader.MODULES_ROOT", fake_modules):
        loaded = register_all(app)
    assert loaded == []


def test_register_all_skips_module_without_backend_package(tmp_path: Path, monkeypatch):
    fake_modules = tmp_path / "modules"
    (fake_modules / "barebones").mkdir(parents=True)
    (fake_modules / "barebones" / "module.json").write_text(
        json.dumps({"name": "barebones_does_not_exist", "version": "0.1"})
    )
    monkeypatch.setattr("app.module_loader.MODULES_ROOT", fake_modules)
    app = FastAPI()
    assert register_all(app) == []


def test_register_all_returns_empty_when_modules_root_missing(tmp_path: Path, monkeypatch):
    monkeypatch.setattr("app.module_loader.MODULES_ROOT", tmp_path / "does_not_exist")
    app = FastAPI()
    assert register_all(app) == []


def test_register_all_with_real_modules_mounts_routers():
    app = FastAPI()
    loaded = register_all(app)
    names = {m.name for m in loaded}
    assert {"agile_digests", "hello"} <= names
    paths = [r.path for r in app.routes if hasattr(r, "path")]
    assert any(p.startswith("/agile_digests/") for p in paths)
    assert any(p.startswith("/hello/") for p in paths)


def test_loaded_module_carries_manifest_data():
    app = FastAPI()
    loaded = register_all(app)
    by_name = {m.name: m for m in loaded}
    ad = by_name["agile_digests"]
    assert ad.version
    assert any(entry["href"] == "/agile_digests" for entry in ad.nav)


def test_register_all_loads_module_without_router(tmp_path: Path, monkeypatch):
    """A backend package that exposes no `APIRouter` should still be returned
    in the loaded list (models-only path), with no router mounted."""
    import sys

    pkg_root = tmp_path
    fake_modules = pkg_root / "modules"
    pkg = fake_modules / "ad_test_noroutes" / "backend"
    pkg.mkdir(parents=True)
    (fake_modules / "__init__.py").write_text("")
    (fake_modules / "ad_test_noroutes" / "__init__.py").write_text("")
    (fake_modules / "ad_test_noroutes" / "module.json").write_text(
        json.dumps({"name": "ad_test_noroutes", "version": "0.0.1"})
    )
    pkg.joinpath("__init__.py").write_text("# no router here\n")

    # Make our fake `modules` package shadow the real one for this import.
    real_modules = sys.modules.pop("modules", None)
    real_submodules = {k: sys.modules.pop(k) for k in list(sys.modules) if k.startswith("modules.")}
    monkeypatch.syspath_prepend(str(pkg_root))
    monkeypatch.setattr("app.module_loader.MODULES_ROOT", fake_modules)
    try:
        app = FastAPI()
        loaded = register_all(app)
        names = {m.name for m in loaded}
        assert "ad_test_noroutes" in names
        paths = [r.path for r in app.routes if hasattr(r, "path")]
        assert not any(p.startswith("/ad_test_noroutes") for p in paths)
    finally:
        # Restore the real `modules` package so subsequent tests see real modules.
        for k in list(sys.modules):
            if k == "modules" or k.startswith("modules."):
                sys.modules.pop(k, None)
        if real_modules is not None:
            sys.modules["modules"] = real_modules
        sys.modules.update(real_submodules)
