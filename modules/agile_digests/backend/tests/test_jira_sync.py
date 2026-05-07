"""Tests for the TTL-based Jira sync service."""

from datetime import date, datetime, timedelta, timezone

import pytest

from modules.agile_digests.backend import jira_client, jira_sync
from modules.agile_digests.backend.models import Feature

from ._factories import create_feature, create_team


def _make_issue(**overrides) -> jira_client.JiraIssue:
    base = dict(
        key="PROJ-1",
        summary="Summary",
        status="In Progress",
        status_category="indeterminate",
        description="Body",
        acceptance_criteria="• Done when X",
        target_end=date(2026, 9, 1),
        capitalizable="Yes",
    )
    base.update(overrides)
    return jira_client.JiraIssue(**base)


@pytest.fixture
def fake_fetch(monkeypatch):
    """Replace jira_client.fetch_issue with a configurable fake."""
    state: dict = {"calls": 0, "issue": _make_issue(), "raise": None}

    async def fake(key, *, client=None):
        state["calls"] += 1
        exc = state["raise"]
        if exc is not None:
            raise exc
        return state["issue"]

    monkeypatch.setattr(jira_client, "fetch_issue", fake)
    return state


async def test_sync_populates_columns(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )

    feature = await db.get(Feature, fid)
    await jira_sync.sync_feature(db, feature)
    await db.commit()

    refreshed = await db.get(Feature, fid)
    assert refreshed.jira_issue_key == "PROJ-1"
    assert refreshed.jira_status == "In Progress"
    assert refreshed.jira_status_category == "indeterminate"
    assert refreshed.jira_target_end == date(2026, 9, 1)
    assert refreshed.jira_capitalizable == "Yes"
    assert refreshed.jira_synced_at is not None
    assert refreshed.jira_sync_error is None
    assert fake_fetch["calls"] == 1


async def test_sync_skips_when_fresh(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )
    feature = await db.get(Feature, fid)
    feature.jira_synced_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    feature.jira_status = "Cached"
    await db.commit()

    await jira_sync.sync_feature(db, feature)
    await db.commit()
    assert fake_fetch["calls"] == 0
    assert feature.jira_status == "Cached"


async def test_sync_force_overrides_ttl(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )
    feature = await db.get(Feature, fid)
    feature.jira_synced_at = datetime.now(timezone.utc)
    feature.jira_status = "Stale-but-fresh"
    await db.commit()

    await jira_sync.sync_feature(db, feature, force=True)
    await db.commit()
    assert fake_fetch["calls"] == 1
    refreshed = await db.get(Feature, fid)
    assert refreshed.jira_status == "In Progress"


async def test_sync_no_link_is_noop(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id, jira_link="")
    feature = await db.get(Feature, fid)
    await jira_sync.sync_feature(db, feature)
    assert fake_fetch["calls"] == 0
    assert feature.jira_synced_at is None


async def test_sync_invalid_link_is_noop(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client, team_id=team_id, jira_link="https://example.com/not-jira"
    )
    feature = await db.get(Feature, fid)
    await jira_sync.sync_feature(db, feature)
    assert fake_fetch["calls"] == 0
    assert feature.jira_synced_at is None


async def test_sync_serves_stale_on_error(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )
    feature = await db.get(Feature, fid)
    feature.jira_status = "Previously OK"
    feature.jira_synced_at = datetime.now(timezone.utc) - timedelta(days=2)
    await db.commit()

    fake_fetch["raise"] = jira_client.JiraAuthError("bad token")
    await jira_sync.sync_feature(db, feature, force=True)
    await db.commit()

    refreshed = await db.get(Feature, fid)
    assert refreshed.jira_status == "Previously OK"  # stale value retained
    assert refreshed.jira_sync_error == "bad token"
    assert refreshed.jira_sync_error_at is not None


async def test_refresh_endpoint_calls_force(client, db, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )
    # Pretend we just synced — TTL would normally skip.
    feature = await db.get(Feature, fid)
    feature.jira_synced_at = datetime.now(timezone.utc)
    await db.commit()

    r = await client.post(f"/agile_digests/features/{fid}/refresh-jira")
    assert r.status_code == 200, r.text
    assert fake_fetch["calls"] == 1
    body = r.json()
    assert body["jira_status"] == "In Progress"
    assert body["jira_sync_failed"] is False


async def test_get_feature_triggers_sync(client, fake_fetch):
    team_id = await create_team(client)
    fid = await create_feature(
        client,
        team_id=team_id,
        jira_link="https://acme.atlassian.net/browse/PROJ-1",
    )
    r = await client.get(f"/agile_digests/features/{fid}")
    assert r.status_code == 200
    body = r.json()
    assert fake_fetch["calls"] == 1
    assert body["jira_issue_key"] == "PROJ-1"
    assert body["jira_status"] == "In Progress"
