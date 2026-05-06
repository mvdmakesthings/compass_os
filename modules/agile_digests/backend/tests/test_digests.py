from ._factories import create_team, digest_payload, feature


async def test_create_digest_with_features(client):
    team_id = await create_team(client)
    payload = digest_payload(
        team_id=team_id,
        features=[
            feature(feature_name="Retention Mailer"),
            feature(feature_name="Retention Call Scheduler"),
            feature(feature_name="ExamOne API Modernization"),
        ],
    )
    r = await client.post("/agile_digests/digests", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["team"]["id"] == team_id
    assert body["sprint_number"] == 8
    assert body["year"] == 2026
    assert len(body["features"]) == 3
    assert [f["position"] for f in body["features"]] == [0, 1, 2]
    assert [f["feature_name"] for f in body["features"]] == [
        "Retention Mailer",
        "Retention Call Scheduler",
        "ExamOne API Modernization",
    ]


async def test_create_digest_unknown_team_400(client):
    r = await client.post("/agile_digests/digests", json=digest_payload(team_id=9999))
    assert r.status_code == 400


async def test_create_digest_duplicate_sprint_409(client):
    team_id = await create_team(client)
    payload = digest_payload(team_id=team_id)
    assert (await client.post("/agile_digests/digests", json=payload)).status_code == 201
    r = await client.post("/agile_digests/digests", json=payload)
    assert r.status_code == 409


async def test_create_digest_with_empty_features(client):
    team_id = await create_team(client)
    payload = digest_payload(team_id=team_id, features=[])
    r = await client.post("/agile_digests/digests", json=payload)
    assert r.status_code == 201
    assert r.json()["features"] == []


async def test_create_digest_validation_errors(client):
    team_id = await create_team(client)
    # invalid status
    bad = digest_payload(
        team_id=team_id, features=[feature(status="exploded")]
    )
    r = await client.post("/agile_digests/digests", json=bad)
    assert r.status_code == 422


async def test_get_digest_returns_features_in_payload_order(client):
    team_id = await create_team(client)
    payload = digest_payload(
        team_id=team_id,
        features=[
            feature(feature_name="A"),
            feature(feature_name="B"),
            feature(feature_name="C"),
        ],
    )
    create = await client.post("/agile_digests/digests", json=payload)
    digest_id = create.json()["id"]

    r = await client.get(f"/agile_digests/digests/{digest_id}")
    assert r.status_code == 200
    body = r.json()
    assert [f["feature_name"] for f in body["features"]] == ["A", "B", "C"]
    assert [f["position"] for f in body["features"]] == [0, 1, 2]


async def test_get_unknown_digest_404(client):
    r = await client.get("/agile_digests/digests/9999")
    assert r.status_code == 404


async def test_list_digests_orders_newest_first(client):
    team_id = await create_team(client)
    p1 = digest_payload(team_id=team_id, sprint_number=7, year=2026, digest_date="2026-04-20")
    p2 = digest_payload(team_id=team_id, sprint_number=8, year=2026, digest_date="2026-05-04")
    p3 = digest_payload(team_id=team_id, sprint_number=1, year=2026, digest_date="2026-01-12")
    for p in (p1, p2, p3):
        await client.post("/agile_digests/digests", json=p)

    r = await client.get("/agile_digests/digests")
    assert r.status_code == 200
    sprints = [d["sprint_number"] for d in r.json()]
    assert sprints == [8, 7, 1]


async def test_list_digests_filters_by_team_and_year(client):
    a = await create_team(client, "A")
    b = await create_team(client, "B")
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=a, sprint_number=1, year=2025, digest_date="2025-04-01"),
    )
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=a, sprint_number=2, year=2026, digest_date="2026-04-01"),
    )
    await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=b, sprint_number=3, year=2026, digest_date="2026-04-15"),
    )

    r = await client.get(f"/agile_digests/digests?team_id={a}")
    assert {d["sprint_number"] for d in r.json()} == {1, 2}

    r = await client.get("/agile_digests/digests?year=2026")
    assert {d["sprint_number"] for d in r.json()} == {2, 3}

    r = await client.get(f"/agile_digests/digests?team_id={a}&year=2026")
    assert [d["sprint_number"] for d in r.json()] == [2]


async def test_list_digests_includes_feature_count(client):
    team_id = await create_team(client)
    payload = digest_payload(
        team_id=team_id,
        features=[feature(feature_name=f"F{i}") for i in range(4)],
    )
    await client.post("/agile_digests/digests", json=payload)
    r = await client.get("/agile_digests/digests")
    assert r.json()[0]["feature_count"] == 4


async def test_update_digest_replaces_features(client):
    team_id = await create_team(client)
    create = await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=team_id, features=[feature(feature_name="old1"), feature(feature_name="old2")]),
    )
    digest_id = create.json()["id"]

    new_payload = digest_payload(
        team_id=team_id,
        features=[feature(feature_name="new1", status="at_risk")],
        header_notes="UPDATED",
    )
    r = await client.put(f"/agile_digests/digests/{digest_id}", json=new_payload)
    assert r.status_code == 200
    assert r.json()["header_notes"] == "UPDATED"
    assert [f["feature_name"] for f in r.json()["features"]] == ["new1"]
    assert r.json()["features"][0]["status"] == "at_risk"


async def test_update_digest_unknown_team_400(client):
    team_id = await create_team(client)
    create = await client.post("/agile_digests/digests", json=digest_payload(team_id=team_id))
    digest_id = create.json()["id"]
    r = await client.put(
        f"/agile_digests/digests/{digest_id}",
        json=digest_payload(team_id=9999),
    )
    assert r.status_code == 400


async def test_update_digest_unknown_id_404(client):
    team_id = await create_team(client)
    r = await client.put(
        "/agile_digests/digests/9999",
        json=digest_payload(team_id=team_id),
    )
    assert r.status_code == 404


async def test_update_digest_to_clashing_sprint_409(client):
    team_id = await create_team(client)
    a = await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=team_id, sprint_number=1),
    )
    b = await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=team_id, sprint_number=2),
    )
    # Try to make `b` use sprint 1, which collides with `a`.
    r = await client.put(
        f"/agile_digests/digests/{b.json()['id']}",
        json=digest_payload(team_id=team_id, sprint_number=1),
    )
    assert r.status_code == 409


async def test_delete_digest(client):
    team_id = await create_team(client)
    create = await client.post("/agile_digests/digests", json=digest_payload(team_id=team_id))
    digest_id = create.json()["id"]

    r = await client.delete(f"/agile_digests/digests/{digest_id}")
    assert r.status_code == 204

    r = await client.get(f"/agile_digests/digests/{digest_id}")
    assert r.status_code == 404


async def test_delete_unknown_digest_404(client):
    r = await client.delete("/agile_digests/digests/9999")
    assert r.status_code == 404


async def test_delete_digest_cascades_features(client, db):
    from sqlalchemy import select

    from modules.agile_digests.backend.models import DigestFeature

    team_id = await create_team(client)
    create = await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=team_id, features=[feature(), feature(feature_name="F2")]),
    )
    digest_id = create.json()["id"]

    await client.delete(f"/agile_digests/digests/{digest_id}")

    rows = (await db.execute(select(DigestFeature))).scalars().all()
    assert rows == []
