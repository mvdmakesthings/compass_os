"""Helpers for building agile_digests test payloads."""

from typing import Any


def feature_payload(
    *,
    name: str = "Retention Mailer",
    description: str = "Cloud-native Retention Mailer replacing legacy on-prem.",
    business_value: str = "Eliminates downtime risk tied to legacy infrastructure.",
    jira_link: str = "",
) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "business_value": business_value,
        "jira_link": jira_link,
    }


def update_payload(
    *,
    feature_id: int,
    status: str = "on_track",
    target_go_live: str = "May 2026",
    notes: str = "Key defects resolved; ready for validation.",
) -> dict[str, Any]:
    return {
        "feature_id": feature_id,
        "status": status,
        "target_go_live": target_go_live,
        "notes": notes,
    }


def digest_payload(
    *,
    team_id: int,
    sprint_number: int = 8,
    year: int = 2026,
    digest_date: str = "2026-05-04",
    header_notes: str = "We have completed Sprint 8 of 2026.",
    footer_notes: str = "Modernization continues across teams.",
    updates: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "team_id": team_id,
        "sprint_number": sprint_number,
        "year": year,
        "digest_date": digest_date,
        "header_notes": header_notes,
        "footer_notes": footer_notes,
        "updates": updates if updates is not None else [],
    }


async def create_team(client, name: str = "BloodHound") -> int:
    r = await client.post("/teams/teams", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def create_feature(
    client, *, team_id: int, name: str = "Retention Mailer", **kwargs
) -> int:
    payload = feature_payload(name=name, **kwargs)
    r = await client.post(f"/agile_digests/teams/{team_id}/features", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]
