"""Tests for the alembic command wrapper. These cover the CLI dispatch
branches without actually mutating the database — every alembic.command
function is monkeypatched to a recording stub."""

from app.scripts import migrate


def test_discover_version_locations_includes_modules():
    paths = migrate._discover_version_locations()
    assert any(p.endswith("/backend/migrations/versions") for p in paths)
    assert any("agile_digests" in p for p in paths)


def test_build_config_sets_version_locations_and_script_location():
    cfg = migrate.build_config()
    vl = cfg.get_main_option("version_locations")
    assert vl
    assert "agile_digests" in vl
    assert cfg.get_main_option("script_location") == "/app/backend/migrations"


def _stub_command(monkeypatch):
    calls: list[tuple[str, tuple, dict]] = []

    def make(name):
        def stub(*args, **kw):
            calls.append((name, args, kw))

        return stub

    from alembic import command as alembic_command

    for name in ("upgrade", "downgrade", "current", "history", "revision"):
        monkeypatch.setattr(alembic_command, name, make(name))
    return calls


def test_main_dispatches_upgrade(monkeypatch):
    calls = _stub_command(monkeypatch)
    migrate.main(["upgrade", "head"])
    assert calls[0][0] == "upgrade"
    assert calls[0][1][1] == "head"


def test_main_upgrade_defaults_to_head(monkeypatch):
    calls = _stub_command(monkeypatch)
    migrate.main(["upgrade"])
    assert calls[0][1][1] == "head"


def test_main_dispatches_downgrade(monkeypatch):
    calls = _stub_command(monkeypatch)
    migrate.main(["downgrade", "-1"])
    assert calls[0][0] == "downgrade"
    assert calls[0][1][1] == "-1"


def test_main_dispatches_current_and_history(monkeypatch):
    calls = _stub_command(monkeypatch)
    migrate.main(["current"])
    migrate.main(["history"])
    assert [c[0] for c in calls] == ["current", "history"]


def test_main_dispatches_revision(monkeypatch):
    calls = _stub_command(monkeypatch)
    migrate.main(
        ["revision", "-m", "add foo", "--autogenerate", "--version-path", "/tmp"]
    )
    assert calls[0][0] == "revision"
    assert calls[0][2]["message"] == "add foo"
    assert calls[0][2]["autogenerate"] is True
    assert calls[0][2]["version_path"] == "/tmp"
