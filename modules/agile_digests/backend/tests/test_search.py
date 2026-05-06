from ._factories import (
    create_feature,
    create_team,
    digest_payload,
    update_payload,
)


async def test_search_returns_ranked_hits(client):
    team_id = await create_team(client)
    await create_feature(
        client, team_id=team_id, name="Retention Mailer", description="email mailer"
    )
    fid = await create_feature(
        client,
        team_id=team_id,
        name="ACORD Phase 1 Inbound Processing",
        description="ACORD ingestion via S3 and DynamoDB.",
    )
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id, updates=[update_payload(feature_id=fid, notes="latest")]
        ),
    )

    r = await client.post(
        "/agile_digests/digests/search", json={"q": "ACORD ingestion"}
    )
    assert r.status_code == 200
    hits = r.json()
    assert hits
    assert hits[0]["feature"]["name"] == "ACORD Phase 1 Inbound Processing"
    assert hits[0]["latest_update"]["notes"] == "latest"
    for hit in hits:
        assert 0.0 <= hit["score"] <= 1.0001
        assert hit["team"]["name"] == "BloodHound"


async def test_search_filters_by_team(client):
    a = await create_team(client, "A")
    b = await create_team(client, "B")
    await create_feature(client, team_id=a, name="Foo A")
    await create_feature(client, team_id=b, name="Foo B")

    by_team = await client.post(
        "/agile_digests/digests/search", json={"q": "Foo", "team_id": a}
    )
    assert {h["team"]["id"] for h in by_team.json()} == {a}


async def test_search_top_k_caps_results(client):
    team_id = await create_team(client)
    for i in range(5):
        await create_feature(client, team_id=team_id, name=f"F{i}")
    r = await client.post(
        "/agile_digests/digests/search", json={"q": "feature", "top_k": 2}
    )
    assert len(r.json()) == 2


async def test_search_returns_feature_without_updates(client):
    team_id = await create_team(client)
    await create_feature(client, team_id=team_id, name="Lonely feature")
    r = await client.post(
        "/agile_digests/digests/search", json={"q": "lonely"}
    )
    assert r.status_code == 200
    hits = r.json()
    assert hits
    assert hits[0]["latest_update"] is None


async def test_search_validates_query(client):
    r = await client.post("/agile_digests/digests/search", json={"q": ""})
    assert r.status_code == 422


async def test_search_with_no_data_returns_empty_list(client):
    r = await client.post("/agile_digests/digests/search", json={"q": "anything"})
    assert r.status_code == 200
    assert r.json() == []
