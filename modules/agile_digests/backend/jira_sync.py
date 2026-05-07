"""TTL-based Jira metadata sync for Feature rows.

`sync_feature` is a no-op when:
 - the feature has no `jira_link`,
 - the link doesn't parse to an issue key, or
 - cached data is still within the TTL and `force` is False.

On fetch failure, cached fields are left intact and only `jira_sync_error` /
`jira_sync_error_at` are updated. Callers commit via the passed session.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from . import jira_client
from .models import Feature

DEFAULT_TTL_SECONDS = 24 * 60 * 60

log = logging.getLogger(__name__)


def _ttl_seconds() -> int:
    raw = os.environ.get("JIRA_CACHE_TTL_SECONDS")
    if not raw:
        return DEFAULT_TTL_SECONDS
    try:
        return max(0, int(raw))
    except ValueError:
        return DEFAULT_TTL_SECONDS


def _is_fresh(feature: Feature, now: datetime, ttl: int) -> bool:
    synced = feature.jira_synced_at
    if synced is None:
        return False
    return (now - synced).total_seconds() < ttl


async def sync_feature(
    db: AsyncSession,
    feature: Feature,
    *,
    force: bool = False,
    client: httpx.AsyncClient | None = None,
) -> Feature:
    """Refresh `feature.jira_*` columns from Jira if needed. Mutates and flushes; caller commits."""
    if not feature.jira_link:
        return feature

    key = jira_client.extract_issue_key(feature.jira_link)
    if key is None:
        return feature

    now = datetime.now(timezone.utc)
    if not force and _is_fresh(feature, now, _ttl_seconds()):
        return feature

    try:
        issue = await jira_client.fetch_issue(key, client=client)
    except jira_client.JiraConfigError as e:
        log.warning("jira sync skipped (config): %s", e)
        feature.jira_sync_error = str(e)
        feature.jira_sync_error_at = now
        await db.flush()
        return feature
    except jira_client.JiraError as e:
        log.warning("jira sync failed for %s: %s", key, e)
        feature.jira_sync_error = str(e)
        feature.jira_sync_error_at = now
        await db.flush()
        return feature
    except (httpx.HTTPError, OSError) as e:
        log.warning("jira sync transport error for %s: %s", key, e)
        feature.jira_sync_error = f"transport error: {e}"
        feature.jira_sync_error_at = now
        await db.flush()
        return feature

    feature.jira_issue_key = issue.key
    feature.jira_status = issue.status
    feature.jira_status_category = issue.status_category
    feature.jira_summary = issue.summary
    feature.jira_description = issue.description or None
    feature.jira_acceptance_criteria = issue.acceptance_criteria or None
    feature.jira_target_end = issue.target_end
    feature.jira_capitalizable = issue.capitalizable
    feature.jira_synced_at = now
    feature.jira_sync_error = None
    feature.jira_sync_error_at = None
    await db.flush()
    return feature


def is_stale(feature: Feature, *, now: datetime | None = None) -> bool:
    if feature.jira_synced_at is None:
        return bool(feature.jira_link and jira_client.extract_issue_key(feature.jira_link))
    now = now or datetime.now(timezone.utc)
    return (now - feature.jira_synced_at).total_seconds() >= _ttl_seconds()


def has_failed_sync(feature: Feature) -> bool:
    return feature.jira_sync_error_at is not None
