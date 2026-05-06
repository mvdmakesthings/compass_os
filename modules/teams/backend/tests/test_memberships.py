from ._factories import create_person, create_team


async def test_add_member(client):
    team_id = await create_team(client)
    person_id = await create_person(client, "Ada", role="Lead")

    r = await client.post(
        f"/teams/teams/{team_id}/members", json={"person_id": person_id}
    )
    assert r.status_code == 201
    body = r.json()
    assert body["person"]["id"] == person_id
    assert body["person"]["role"] == "Lead"


async def test_add_duplicate_member_409(client):
    team_id = await create_team(client)
    person_id = await create_person(client)
    await client.post(
        f"/teams/teams/{team_id}/members", json={"person_id": person_id}
    )
    r = await client.post(
        f"/teams/teams/{team_id}/members", json={"person_id": person_id}
    )
    assert r.status_code == 409


async def test_add_member_unknown_team_404(client):
    person_id = await create_person(client)
    r = await client.post(
        "/teams/teams/9999/members", json={"person_id": person_id}
    )
    assert r.status_code == 404


async def test_add_member_unknown_person_400(client):
    team_id = await create_team(client)
    r = await client.post(
        f"/teams/teams/{team_id}/members", json={"person_id": 9999}
    )
    assert r.status_code == 400


async def test_remove_member(client):
    team_id = await create_team(client)
    person_id = await create_person(client)
    create = await client.post(
        f"/teams/teams/{team_id}/members", json={"person_id": person_id}
    )
    member_id = create.json()["id"]

    r = await client.delete(f"/teams/teams/{team_id}/members/{member_id}")
    assert r.status_code == 204

    detail = (await client.get(f"/teams/teams/{team_id}")).json()
    assert detail["members"] == []


async def test_remove_unknown_member_404(client):
    team_id = await create_team(client)
    r = await client.delete(f"/teams/teams/{team_id}/members/9999")
    assert r.status_code == 404
