from ._factories import (
    create_feature,
    create_team,
    digest_payload,
    update_payload,
)


async def test_create_digest_with_updates(client):
    team_id = await create_team(client)
    f1 = await create_feature(client, team_id=team_id, name="Retention Mailer")
    f2 = await create_feature(client, team_id=team_id, name="Retention Call Scheduler")
    f3 = await create_feature(client, team_id=team_id, name="ExamOne API Modernization")
    payload = digest_payload(
        team_id=team_id,
        updates=[
            update_payload(feature_id=f1),
            update_payload(feature_id=f2),
            update_payload(feature_id=f3),
        ],
    )
    r = await client.post("/agile_digests/digests", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["team"]["id"] == team_id
    assert body["sprint_number"] == 8
    assert body["year"] == 2026
    assert len(body["updates"]) == 3
    assert [u["position"] for u in body["updates"]] == [0, 1, 2]
    assert [u["feature"]["name"] for u in body["updates"]] == [
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


async def test_create_digest_with_empty_updates(client):
    team_id = await create_team(client)
    r = await client.post("/agile_digests/digests", json=digest_payload(team_id=team_id))
    assert r.status_code == 201
    assert r.json()["updates"] == []


async def test_create_digest_validation_errors(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)
    bad = digest_payload(
        team_id=team_id,
        updates=[update_payload(feature_id=fid, status="exploded")],
    )
    r = await client.post("/agile_digests/digests", json=bad)
    assert r.status_code == 422


async def test_create_digest_rejects_unknown_feature(client):
    team_id = await create_team(client)
    bad = digest_payload(
        team_id=team_id, updates=[update_payload(feature_id=9999)]
    )
    r = await client.post("/agile_digests/digests", json=bad)
    assert r.status_code == 400


async def test_create_digest_rejects_other_team_feature(client):
    a = await create_team(client, "A")
    b = await create_team(client, "B")
    fid = await create_feature(client, team_id=a)
    bad = digest_payload(team_id=b, updates=[update_payload(feature_id=fid)])
    r = await client.post("/agile_digests/digests", json=bad)
    assert r.status_code == 400


async def test_create_digest_rejects_duplicate_feature(client):
    team_id = await create_team(client)
    fid = await create_feature(client, team_id=team_id)
    bad = digest_payload(
        team_id=team_id,
        updates=[
            update_payload(feature_id=fid),
            update_payload(feature_id=fid, notes="dup"),
        ],
    )
    r = await client.post("/agile_digests/digests", json=bad)
    assert r.status_code == 400


async def test_get_digest_returns_updates_in_payload_order(client):
    team_id = await create_team(client)
    fa = await create_feature(client, team_id=team_id, name="A")
    fb = await create_feature(client, team_id=team_id, name="B")
    fc = await create_feature(client, team_id=team_id, name="C")
    payload = digest_payload(
        team_id=team_id,
        updates=[
            update_payload(feature_id=fa),
            update_payload(feature_id=fb),
            update_payload(feature_id=fc),
        ],
    )
    create = await client.post("/agile_digests/digests", json=payload)
    digest_id = create.json()["id"]

    r = await client.get(f"/agile_digests/digests/{digest_id}")
    assert r.status_code == 200
    body = r.json()
    assert [u["feature"]["name"] for u in body["updates"]] == ["A", "B", "C"]
    assert [u["position"] for u in body["updates"]] == [0, 1, 2]


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
    fids = [
        await create_feature(client, team_id=team_id, name=f"F{i}") for i in range(4)
    ]
    payload = digest_payload(
        team_id=team_id, updates=[update_payload(feature_id=fid) for fid in fids]
    )
    await client.post("/agile_digests/digests", json=payload)
    r = await client.get("/agile_digests/digests")
    assert r.json()[0]["feature_count"] == 4


async def test_update_digest_replaces_updates(client):
    team_id = await create_team(client)
    f_old1 = await create_feature(client, team_id=team_id, name="old1")
    f_old2 = await create_feature(client, team_id=team_id, name="old2")
    f_new = await create_feature(client, team_id=team_id, name="new1")

    create = await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id,
            updates=[
                update_payload(feature_id=f_old1),
                update_payload(feature_id=f_old2),
            ],
        ),
    )
    digest_id = create.json()["id"]

    new_payload = digest_payload(
        team_id=team_id,
        updates=[update_payload(feature_id=f_new, status="at_risk")],
        header_notes="UPDATED",
    )
    r = await client.put(f"/agile_digests/digests/{digest_id}", json=new_payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["header_notes"] == "UPDATED"
    assert [u["feature"]["name"] for u in body["updates"]] == ["new1"]
    assert body["updates"][0]["status"] == "at_risk"


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
    assert a.status_code == 201
    b = await client.post(
        "/agile_digests/digests",
        json=digest_payload(team_id=team_id, sprint_number=2),
    )
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


async def test_delete_digest_cascades_updates_but_keeps_features(client, db):
    from sqlalchemy import select

    from modules.agile_digests.backend.models import DigestUpdate, Feature

    team_id = await create_team(client)
    f1 = await create_feature(client, team_id=team_id, name="F1")
    f2 = await create_feature(client, team_id=team_id, name="F2")
    create = await client.post(
        "/agile_digests/digests",
        json=digest_payload(
            team_id=team_id,
            updates=[update_payload(feature_id=f1), update_payload(feature_id=f2)],
        ),
    )
    digest_id = create.json()["id"]

    await client.delete(f"/agile_digests/digests/{digest_id}")

    updates = (await db.execute(select(DigestUpdate))).scalars().all()
    assert updates == []
    feature_ids = (await db.execute(select(Feature.id))).scalars().all()
    assert set(feature_ids) == {f1, f2}
