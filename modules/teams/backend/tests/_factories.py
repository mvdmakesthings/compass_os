"""Helpers for building teams test payloads."""


async def create_team(client, name: str = "Platform") -> int:
    r = await client.post("/teams/teams", json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def create_person(
    client,
    name: str = "Ada Lovelace",
    email: str | None = None,
    role: str = "",
    employment_type: str | None = None,
) -> int:
    payload: dict = {"name": name, "role": role}
    if email is not None:
        payload["email"] = email
    if employment_type is not None:
        payload["employment_type"] = employment_type
    r = await client.post("/teams/people", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def add_member(client, team_id: int, person_id: int) -> int:
    r = await client.post(
        f"/teams/teams/{team_id}/members",
        json={"person_id": person_id},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]
