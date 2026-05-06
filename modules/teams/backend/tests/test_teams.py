from ._factories import add_member, create_person, create_team


async def test_create_and_list_teams(client):
    r = await client.post("/teams/teams", json={"name": "BloodHound"})
    assert r.status_code == 201
    team = r.json()
    assert team["name"] == "BloodHound"
    assert team["archived_at"] is None

    r = await client.get("/teams/teams")
    assert r.status_code == 200
    assert [t["name"] for t in r.json()] == ["BloodHound"]


async def test_create_team_trims_whitespace(client):
    r = await client.post("/teams/teams", json={"name": "  Mars  "})
    assert r.status_code == 201
    assert r.json()["name"] == "Mars"


async def test_create_team_rejects_duplicate_name(client):
    await client.post("/teams/teams", json={"name": "Mars"})
    r = await client.post("/teams/teams", json={"name": "Mars"})
    assert r.status_code == 409


async def test_create_team_validates_min_length(client):
    r = await client.post("/teams/teams", json={"name": ""})
    assert r.status_code == 422


async def test_patch_team_renames_and_archives(client):
    r = await client.post("/teams/teams", json={"name": "Titan"})
    team_id = r.json()["id"]

    r = await client.patch(f"/teams/teams/{team_id}", json={"name": "Titan-v2"})
    assert r.status_code == 200
    assert r.json()["name"] == "Titan-v2"

    r = await client.patch(f"/teams/teams/{team_id}", json={"archived": True})
    assert r.status_code == 200
    assert r.json()["archived_at"] is not None

    r = await client.patch(f"/teams/teams/{team_id}", json={"archived": False})
    assert r.status_code == 200
    assert r.json()["archived_at"] is None


async def test_patch_unknown_team_404(client):
    r = await client.patch("/teams/teams/9999", json={"name": "ghost"})
    assert r.status_code == 404


async def test_patch_team_to_existing_name_conflicts(client):
    a = (await client.post("/teams/teams", json={"name": "A"})).json()
    b = (await client.post("/teams/teams", json={"name": "B"})).json()
    r = await client.patch(f"/teams/teams/{b['id']}", json={"name": "A"})
    assert r.status_code == 409
    listing = (await client.get("/teams/teams")).json()
    assert {t["id"] for t in listing} == {a["id"], b["id"]}


async def test_patch_team_with_no_fields_is_noop(client):
    r = await client.post("/teams/teams", json={"name": "Phoenix"})
    team_id = r.json()["id"]
    r = await client.patch(f"/teams/teams/{team_id}", json={})
    assert r.status_code == 200
    assert r.json()["name"] == "Phoenix"


async def test_list_teams_excludes_archived_by_default(client):
    active = (await client.post("/teams/teams", json={"name": "Active"})).json()
    archived = (await client.post("/teams/teams", json={"name": "Archived"})).json()
    await client.patch(f"/teams/teams/{archived['id']}", json={"archived": True})

    r = await client.get("/teams/teams")
    assert [t["id"] for t in r.json()] == [active["id"]]

    r = await client.get("/teams/teams?include_archived=true")
    assert {t["id"] for t in r.json()} == {active["id"], archived["id"]}


async def test_get_team_returns_members(client):
    team_id = await create_team(client, "Platform")
    p1 = await create_person(client, "Ada", role="Engineer")
    p2 = await create_person(client, "Linus", role="Scrum Master")
    await add_member(client, team_id, p1)
    await add_member(client, team_id, p2)

    r = await client.get(f"/teams/teams/{team_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Platform"
    assert [m["person"]["name"] for m in body["members"]] == ["Ada", "Linus"]
    assert {m["person"]["role"] for m in body["members"]} == {"Engineer", "Scrum Master"}


async def test_get_team_404(client):
    r = await client.get("/teams/teams/9999")
    assert r.status_code == 404


async def test_delete_team_with_members_cascades(client):
    team_id = await create_team(client, "Doomed")
    person_id = await create_person(client, "Member")
    await add_member(client, team_id, person_id)

    r = await client.delete(f"/teams/teams/{team_id}")
    assert r.status_code == 204

    # Person still exists; just no longer a member.
    r = await client.get("/teams/people")
    assert [p["id"] for p in r.json()] == [person_id]


async def test_delete_team_with_digest_blocked(client):
    team_id = await create_team(client, "Booked")
    # Create a digest referencing this team via agile_digests.
    from modules.agile_digests.backend.tests._factories import digest_payload

    r = await client.post(
        "/agile_digests/digests", json=digest_payload(team_id=team_id)
    )
    assert r.status_code == 201

    r = await client.delete(f"/teams/teams/{team_id}")
    assert r.status_code == 409


async def test_delete_unknown_team_404(client):
    r = await client.delete("/teams/teams/9999")
    assert r.status_code == 404
