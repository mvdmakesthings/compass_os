async def test_create_and_list_teams(client):
    r = await client.post("/agile_digests/teams", json={"name": "BloodHound"})
    assert r.status_code == 201
    team = r.json()
    assert team["name"] == "BloodHound"
    assert team["archived_at"] is None

    r = await client.get("/agile_digests/teams")
    assert r.status_code == 200
    assert [t["name"] for t in r.json()] == ["BloodHound"]


async def test_create_team_trims_whitespace(client):
    r = await client.post("/agile_digests/teams", json={"name": "  Mars  "})
    assert r.status_code == 201
    assert r.json()["name"] == "Mars"


async def test_create_team_rejects_duplicate_name(client):
    await client.post("/agile_digests/teams", json={"name": "Mars"})
    r = await client.post("/agile_digests/teams", json={"name": "Mars"})
    assert r.status_code == 409


async def test_create_team_validates_min_length(client):
    r = await client.post("/agile_digests/teams", json={"name": ""})
    assert r.status_code == 422


async def test_patch_team_renames_and_archives(client):
    r = await client.post("/agile_digests/teams", json={"name": "Titan"})
    team_id = r.json()["id"]

    r = await client.patch(f"/agile_digests/teams/{team_id}", json={"name": "Titan-v2"})
    assert r.status_code == 200
    assert r.json()["name"] == "Titan-v2"

    r = await client.patch(f"/agile_digests/teams/{team_id}", json={"archived": True})
    assert r.status_code == 200
    assert r.json()["archived_at"] is not None

    # Unarchive
    r = await client.patch(f"/agile_digests/teams/{team_id}", json={"archived": False})
    assert r.status_code == 200
    assert r.json()["archived_at"] is None


async def test_patch_unknown_team_404(client):
    r = await client.patch("/agile_digests/teams/9999", json={"name": "ghost"})
    assert r.status_code == 404


async def test_patch_team_to_existing_name_conflicts(client):
    a = (await client.post("/agile_digests/teams", json={"name": "A"})).json()
    b = (await client.post("/agile_digests/teams", json={"name": "B"})).json()
    r = await client.patch(f"/agile_digests/teams/{b['id']}", json={"name": "A"})
    assert r.status_code == 409
    # Original A still resolvable
    listing = (await client.get("/agile_digests/teams")).json()
    assert {t["id"] for t in listing} == {a["id"], b["id"]}


async def test_patch_team_with_no_fields_is_noop(client):
    r = await client.post("/agile_digests/teams", json={"name": "Phoenix"})
    team_id = r.json()["id"]
    r = await client.patch(f"/agile_digests/teams/{team_id}", json={})
    assert r.status_code == 200
    assert r.json()["name"] == "Phoenix"
