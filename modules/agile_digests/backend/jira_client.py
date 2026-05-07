"""Async Jira Cloud client used by the agile_digests module.

Reads from a single Atlassian Cloud instance via Basic auth (email + API token).
Resolves a small set of custom fields by name on first use and caches the IDs
for the lifetime of the process.
"""

from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx

ISSUE_KEY_RE = re.compile(r"\b([A-Z][A-Z0-9_]+-\d+)\b")
# Verified against fidelitylife.atlassian.net (2026-05-07):
#   Acceptance Criteria → customfield_14654 (ADF)
#   Capitalizable       → customfield_11702 (multi-select option list)
#   Target end          → customfield_14636 (date string, fallback to duedate)
DEFAULT_TARGET_END_FIELD_NAMES = (
    "Target end",
    "Target end date",
    "Target End Date",
)
ACCEPTANCE_CRITERIA_NAMES = ("Acceptance Criteria", "Acceptance criteria")
CAPITALIZABLE_NAMES = ("Capitalizable", "Capitalisable")


class JiraConfigError(RuntimeError):
    """Raised when JIRA_* env vars are missing."""


class JiraError(RuntimeError):
    """Base class for fetch failures."""


class JiraAuthError(JiraError):
    pass


class JiraNotFound(JiraError):
    pass


class JiraRateLimit(JiraError):
    pass


class JiraTransientError(JiraError):
    pass


@dataclass
class JiraIssue:
    key: str
    summary: str | None = None
    status: str | None = None
    status_category: str | None = None
    description: str | None = None
    acceptance_criteria: str | None = None
    target_end: date | None = None
    capitalizable: str | None = None


@dataclass
class _FieldIds:
    acceptance_criteria: str | None = None
    capitalizable: str | None = None
    target_end: str | None = None  # custom field id; None means fall back to duedate


_field_cache: _FieldIds | None = None
_field_cache_lock = asyncio.Lock()


def extract_issue_key(url: str) -> str | None:
    """Pull `PROJ-123` out of a Jira URL or accept a bare key.

    Picks the LAST issue-key-shaped substring, since modern Jira URLs may
    embed the project key earlier in the path
    (e.g. `/jira/software/projects/PROJ/issues/PROJ-77`).
    """
    if not url:
        return None
    matches = ISSUE_KEY_RE.findall(url)
    return matches[-1] if matches else None


def _settings() -> tuple[str, str, str]:
    base = os.environ.get("JIRA_BASE_URL", "").rstrip("/")
    email = os.environ.get("JIRA_EMAIL", "")
    token = os.environ.get("JIRA_API_TOKEN", "")
    if not (base and email and token):
        raise JiraConfigError(
            "JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN must all be set"
        )
    return base, email, token


def _target_end_candidates() -> tuple[str, ...]:
    raw = os.environ.get("JIRA_TARGET_END_FIELD_NAMES", "")
    if not raw.strip():
        return DEFAULT_TARGET_END_FIELD_NAMES
    return tuple(s.strip() for s in raw.split(",") if s.strip())


def _client() -> httpx.AsyncClient:
    base, email, token = _settings()
    return httpx.AsyncClient(
        base_url=base,
        auth=(email, token),
        headers={"Accept": "application/json"},
        timeout=httpx.Timeout(10.0, connect=5.0),
    )


def _raise_for(response: httpx.Response) -> None:
    if response.status_code in (401, 403):
        raise JiraAuthError(f"Jira auth failed ({response.status_code})")
    if response.status_code == 404:
        raise JiraNotFound("Jira issue not found")
    if response.status_code == 429:
        raise JiraRateLimit("Jira rate limit hit")
    if response.status_code >= 500:
        raise JiraTransientError(f"Jira server error {response.status_code}")
    if response.status_code >= 400:
        raise JiraError(f"Jira request failed: {response.status_code} {response.text[:200]}")


async def get_field_ids(*, client: httpx.AsyncClient | None = None) -> _FieldIds:
    """Resolve custom field ids by display name. Cached for the process lifetime."""
    global _field_cache
    if _field_cache is not None:
        return _field_cache
    async with _field_cache_lock:
        if _field_cache is not None:
            return _field_cache
        owned = client is None
        c = client or _client()
        try:
            resp = await c.get("/rest/api/3/field")
            _raise_for(resp)
            fields = resp.json()
        finally:
            if owned:
                await c.aclose()

        by_name: dict[str, str] = {}
        for f in fields:
            name = (f.get("name") or "").strip()
            fid = f.get("id")
            if name and fid:
                by_name[name.casefold()] = fid

        def pick(*candidates: str) -> str | None:
            for cand in candidates:
                fid = by_name.get(cand.casefold())
                if fid:
                    return fid
            return None

        _field_cache = _FieldIds(
            acceptance_criteria=pick(*ACCEPTANCE_CRITERIA_NAMES),
            capitalizable=pick(*CAPITALIZABLE_NAMES),
            target_end=pick(*_target_end_candidates()),
        )
        return _field_cache


def reset_field_cache() -> None:
    """Test hook — clear the resolved field ids."""
    global _field_cache
    _field_cache = None


def adf_to_text(node: Any) -> str:
    """Best-effort plain-text rendering of Atlassian Document Format.

    Handles paragraph, text, bullet/ordered lists, headings, and code blocks.
    Anything else falls back to recursing through children.
    """
    if node is None:
        return ""
    if isinstance(node, str):
        return node

    out: list[str] = []

    def walk(n: Any, prefix: str = "") -> None:
        if not isinstance(n, dict):
            return
        node_type = n.get("type")
        content = n.get("content") or []

        if node_type == "text":
            out.append(n.get("text", ""))
            return
        if node_type == "hardBreak":
            out.append("\n")
            return

        if node_type in ("paragraph", "heading"):
            for c in content:
                walk(c)
            out.append("\n\n")
            return

        if node_type == "bulletList":
            for item in content:
                walk(item, prefix="• ")
            return
        if node_type == "orderedList":
            for i, item in enumerate(content, 1):
                walk(item, prefix=f"{i}. ")
            return
        if node_type == "listItem":
            out.append(prefix)
            for c in content:
                walk(c)
            return
        if node_type == "codeBlock":
            for c in content:
                walk(c)
            out.append("\n")
            return

        # Unknown node — keep walking children so text isn't lost.
        for c in content:
            walk(c)

    walk(node)
    return "".join(out).strip()


def _parse_date(value: Any) -> date | None:
    if not value or not isinstance(value, str):
        return None
    # Jira returns YYYY-MM-DD for date fields and ISO datetime for datetime fields.
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _flatten_capitalizable(value: Any) -> str | None:
    """Convert whatever shape the Capitalizable field comes back as into a short string."""
    if value is None:
        return None
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, str):
        return value or None
    if isinstance(value, dict):
        # Single-select / option object: {"value": "...", "id": "..."}
        return value.get("value") or value.get("name") or None
    if isinstance(value, list):
        labels = [_flatten_capitalizable(v) for v in value]
        joined = ", ".join(s for s in labels if s)
        return joined or None
    return str(value)


async def fetch_issue(key: str, *, client: httpx.AsyncClient | None = None) -> JiraIssue:
    owned = client is None
    c = client or _client()
    try:
        ids = await get_field_ids(client=c)
        wanted = ["summary", "status", "description", "duedate"]
        if ids.acceptance_criteria:
            wanted.append(ids.acceptance_criteria)
        if ids.capitalizable:
            wanted.append(ids.capitalizable)
        if ids.target_end:
            wanted.append(ids.target_end)

        resp = await c.get(
            f"/rest/api/3/issue/{key}",
            params={"fields": ",".join(wanted)},
        )
        _raise_for(resp)
        data = resp.json()
    finally:
        if owned:
            await c.aclose()

    fields = data.get("fields") or {}
    status = fields.get("status") or {}
    cat = (status.get("statusCategory") or {}).get("key")

    target_end: date | None = None
    if ids.target_end:
        target_end = _parse_date(fields.get(ids.target_end))
    if target_end is None:
        target_end = _parse_date(fields.get("duedate"))

    return JiraIssue(
        key=data.get("key", key),
        summary=fields.get("summary"),
        status=status.get("name"),
        status_category=cat,
        description=adf_to_text(fields.get("description")),
        acceptance_criteria=(
            adf_to_text(fields.get(ids.acceptance_criteria))
            if ids.acceptance_criteria
            else None
        ),
        target_end=target_end,
        capitalizable=(
            _flatten_capitalizable(fields.get(ids.capitalizable))
            if ids.capitalizable
            else None
        ),
    )
