from ._factories import (
    create_feature,
    create_team,
    digest_payload,
    feature_payload,
    update_payload,
)


async def test_create_feature(client):
    team_id = await create_team(client)
    r = await client.post(
        f"/agile_digests/teams/{team_id}/features",
        json=feature_payload(name="MIB Code Backs"),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "MIB Code Backs"
    assert body["team_id"] == team_id
    assert body["archived_at"] is None


async def test_create_feature_unknown_team_400(client):
    r = await client.post(
        "/agile_digests/teams/9999/features", json=feature_payload()
    )
    assert r.status_code == 400


async def test_list_team_features_excludes_archived_by_default(client):
    team_id = await create_team(client)
    active = await create_feature(client, team_id=team_id, name="Active")
    archived = await create_feature(client, team_id=team_id, name="Archived")
    await client.post(f"/agile_digests/features/{archived}/archive")

    r = await client.get(f"/agile_digests/teams/{team_id}/features")
    assert {f["id"] for f in r.json()} == {active}

    r2 = await client.get(
        f"/agile_digests/teams/{team_id}/features?include_archived=true"
    )
    assert {f["id"] for f in r2.json()} == {active, archived}


async def test_list_team_features_unknown_team_404(client):
    r = await client.get("/agile_digests/teams/9999/features")
    assert r.status_code == 404


async def test_get_and_update_feature(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id, name="Old name")

    r = await client.get(f"/agile_digests/features/{fid}")
    assert r.status_code == 200
    assert r.json()["name"] == "Old name"

    r = await client.put(
        f"/agile_digests/features/{fid}",
        json=feature_payload(name="New name", description="Refined"),
    )
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "New name"
    assert r.json()["description"] == "Refined"


async def test_get_unknown_feature_404(client):
    r = await client.get("/agile_digests/features/9999")
    assert r.status_code == 404


async def test_update_unknown_feature_404(client):
    r = await client.put(
        "/agile_digests/features/9999", json=feature_payload(name="x")
    )
    assert r.status_code == 404


async def test_archive_unarchive_round_trip(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)

    r = await client.post(f"/agile_digests/features/{fid}/archive")
    assert r.status_code == 200
    assert r.json()["archived_at"] is not None

    r = await client.post(f"/agile_digests/features/{fid}/unarchive")
    assert r.status_code == 200
    assert r.json()["archived_at"] is None


async def test_archive_unknown_404(client):
    r = await client.post("/agile_digests/features/9999/archive")
    assert r.status_code == 404
    r = await client.post("/agile_digests/features/9999/unarchive")
    assert r.status_code == 404


async def test_delete_unused_feature(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)
    r = await client.delete(f"/agile_digests/features/{fid}")
    assert r.status_code == 204
    r = await client.get(f"/agile_digests/features/{fid}")
    assert r.status_code == 404


async def test_delete_referenced_feature_409(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id, updates=[update_payload(feature_id=fid)]
        ),
    )
    r = await client.delete(f"/agile_digests/features/{fid}")
    assert r.status_code == 409


async def test_delete_unknown_feature_404(client):
    r = await client.delete("/agile_digests/features/9999")
    assert r.status_code == 404


async def test_archived_feature_can_still_be_referenced_in_existing_digest(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)
    create = await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id, updates=[update_payload(feature_id=fid)]
        ),
    )
    digest_id = create.json()["id"]
    await client.post(f"/agile_digests/features/{fid}/archive")

    r = await client.get(f"/agile_digests/digests/{digest_id}")
    assert r.status_code == 200
    assert r.json()["updates"][0]["feature"]["archived_at"] is not None
