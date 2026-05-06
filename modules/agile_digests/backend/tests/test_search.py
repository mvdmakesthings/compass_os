from ._factories import create_team, digest_payload, feature


async def test_search_returns_ranked_hits(client):
    team_id = await create_team(client)
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id,
            features=[
                feature(feature_name="Retention Mailer", description="email mailer"),
                feature(
                    category="upcoming",
                    feature_name="ACORD Phase 1 Inbound Processing",
                    description="ACORD ingestion via S3 and DynamoDB.",
                ),
            ],
        ),
    )

    r = await client.post(
        "/agile_digests/digests/search", json={"q": "ACORD ingestion"}
    )
    assert r.status_code == 200
    hits = r.json()
    assert hits, "Expected at least one hit"
    assert hits[0]["feature"]["feature_name"] == "ACORD Phase 1 Inbound Processing"
    for hit in hits:
        assert 0.0 <= hit["score"] <= 1.0001
        assert hit["digest"]["team"]["name"] == "BloodHound"


async def test_search_filters_by_team_and_year(client):
    a = await create_team(client, "A")
    b = await create_team(client, "B")
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=a,
            year=2025,
            sprint_number=1,
            digest_date="2025-04-01",
            features=[feature(feature_name="Foo")],
        ),
    )
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=b,
            year=2026,
            sprint_number=1,
            digest_date="2026-04-01",
            features=[feature(feature_name="Foo")],
        ),
    )

    by_team = await client.post(
        "/agile_digests/digests/search", json={"q": "Foo", "team_id": a}
    )
    assert {h["digest"]["team"]["id"] for h in by_team.json()} == {a}

    by_year = await client.post(
        "/agile_digests/digests/search", json={"q": "Foo", "year": 2026}
    )
    assert {h["digest"]["year"] for h in by_year.json()} == {2026}


async def test_search_top_k_caps_results(client):
    team_id = await create_team(client)
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id,
            features=[feature(feature_name=f"F{i}") for i in range(5)],
        ),
    )
    r = await client.post(
        "/agile_digests/digests/search", json={"q": "feature", "top_k": 2}
    )
    assert len(r.json()) == 2


async def test_search_validates_query(client):
    r = await client.post("/agile_digests/digests/search", json={"q": ""})
    assert r.status_code == 422


async def test_search_with_no_data_returns_empty_list(client):
    r = await client.post("/agile_digests/digests/search", json={"q": "anything"})
    assert r.status_code == 200
    assert r.json() == []
