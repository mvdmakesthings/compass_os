"""Alembic wrapper that registers per-module `version_locations` before invoking
commands.

Alembic's `ScriptDirectory.from_config` reads `version_locations` directly from
config and runs *before* `env.py`, so setting that option inside `env.py` is too
late for revision discovery. This wrapper computes the list from
`modules/*/backend/migrations/versions/` and applies it via the Config API, then
delegates to `alembic.command`.

Usage (inside the backend container):
    python -m app.scripts.migrate upgrade head
    python -m app.scripts.migrate current
    python -m app.scripts.migrate history
    python -m app.scripts.migrate revision -m "message" [--autogenerate] [--version-path PATH]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

ALEMBIC_INI = Path("/app/backend/alembic.ini")
SHELL_VERSIONS = Path("/app/backend/migrations/versions")
MODULES_ROOT = Path("/app/modules")


def _discover_version_locations() -> list[str]:
    paths = [str(SHELL_VERSIONS)]
    if MODULES_ROOT.exists():
        for module_dir in sorted(MODULES_ROOT.iterdir()):
            manifest = module_dir / "module.json"
            versions = module_dir / "backend" / "migrations" / "versions"
            if manifest.exists() and versions.is_dir():
                paths.append(str(versions))
    return paths


def build_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", "/app/backend/migrations")
    cfg.set_main_option("version_locations", " ".join(_discover_version_locations()))
    return cfg


def main(argv: list[str]) -> None:
    cfg = build_config()
    parser = argparse.ArgumentParser(prog="migrate")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_up = sub.add_parser("upgrade")
    p_up.add_argument("revision", nargs="?", default="head")
    p_down = sub.add_parser("downgrade")
    p_down.add_argument("revision")
    sub.add_parser("current")
    sub.add_parser("history")
    p_rev = sub.add_parser("revision")
    p_rev.add_argument("-m", "--message", required=True)
    p_rev.add_argument("--autogenerate", action="store_true")
    p_rev.add_argument("--version-path", dest="version_path")
    args = parser.parse_args(argv)

    if args.cmd == "upgrade":
        command.upgrade(cfg, args.revision)
    elif args.cmd == "downgrade":
        command.downgrade(cfg, args.revision)
    elif args.cmd == "current":
        command.current(cfg)
    elif args.cmd == "history":
        command.history(cfg, verbose=True)
    elif args.cmd == "revision":
        command.revision(
            cfg,
            message=args.message,
            autogenerate=args.autogenerate,
            version_path=args.version_path,
        )


if __name__ == "__main__":
    main(sys.argv[1:])
