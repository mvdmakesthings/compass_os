from ._factories import add_member, create_person, create_team


async def test_create_and_list_people(client):
    r = await client.post("/teams/people", json={"name": "Ada Lovelace"})
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Ada Lovelace"
    assert body["email"] is None
    assert body["role"] == ""

    r = await client.get("/teams/people")
    assert [p["name"] for p in r.json()] == ["Ada Lovelace"]


async def test_create_person_with_role(client):
    r = await client.post(
        "/teams/people", json={"name": "Grace", "role": "Scrum Master"}
    )
    assert r.status_code == 201
    assert r.json()["role"] == "Scrum Master"


async def test_patch_person_role(client):
    pid = await create_person(client, "Person")
    r = await client.patch(f"/teams/people/{pid}", json={"role": "Lead"})
    assert r.status_code == 200
    assert r.json()["role"] == "Lead"


async def test_create_person_with_email(client):
    r = await client.post(
        "/teams/people", json={"name": "Linus", "email": "linus@example.com"}
    )
    assert r.status_code == 201
    assert r.json()["email"] == "linus@example.com"


async def test_create_person_blank_email_normalized_to_null(client):
    r = await client.post("/teams/people", json={"name": "Anon", "email": "   "})
    assert r.status_code == 201
    assert r.json()["email"] is None


async def test_duplicate_email_409(client):
    await client.post("/teams/people", json={"name": "A", "email": "a@x.com"})
    r = await client.post("/teams/people", json={"name": "B", "email": "a@x.com"})
    assert r.status_code == 409


async def test_two_people_with_null_email_allowed(client):
    a = await client.post("/teams/people", json={"name": "A"})
    b = await client.post("/teams/people", json={"name": "B"})
    assert a.status_code == 201 and b.status_code == 201


async def test_patch_person_name_and_email(client):
    pid = await create_person(client, "Old")
    r = await client.patch(
        f"/teams/people/{pid}", json={"name": "New", "email": "new@x.com"}
    )
    assert r.status_code == 200
    assert r.json() == {**r.json(), "name": "New", "email": "new@x.com"}


async def test_patch_person_clear_email(client):
    pid = await create_person(client, "Person", email="p@x.com")
    r = await client.patch(f"/teams/people/{pid}", json={"email": None})
    assert r.status_code == 200
    assert r.json()["email"] is None


async def test_patch_person_duplicate_email_409(client):
    a = await create_person(client, "A", email="a@x.com")  # noqa: F841
    b = await create_person(client, "B", email="b@x.com")
    r = await client.patch(f"/teams/people/{b}", json={"email": "a@x.com"})
    assert r.status_code == 409


async def test_default_employment_type_null(client):
    r = await client.post("/teams/people", json={"name": "Default"})
    assert r.status_code == 201
    assert r.json()["employment_type"] is None


async def test_create_person_with_employment_type(client):
    r = await client.post(
        "/teams/people", json={"name": "Eve", "employment_type": "fte"}
    )
    assert r.status_code == 201
    assert r.json()["employment_type"] == "fte"


async def test_create_person_invalid_employment_type_422(client):
    r = await client.post(
        "/teams/people", json={"name": "Eve", "employment_type": "freelancer"}
    )
    assert r.status_code == 422


async def test_patch_person_employment_type(client):
    pid = await create_person(client, "Person")
    r = await client.patch(
        f"/teams/people/{pid}", json={"employment_type": "contractor"}
    )
    assert r.status_code == 200
    assert r.json()["employment_type"] == "contractor"

    r = await client.patch(f"/teams/people/{pid}", json={"employment_type": "fte"})
    assert r.status_code == 200
    assert r.json()["employment_type"] == "fte"


async def test_patch_person_clear_employment_type(client):
    pid = await create_person(client, "Person", employment_type="fte")
    r = await client.patch(f"/teams/people/{pid}", json={"employment_type": None})
    assert r.status_code == 200
    assert r.json()["employment_type"] is None


async def test_patch_unknown_person_404(client):
    r = await client.patch("/teams/people/9999", json={"name": "ghost"})
    assert r.status_code == 404


async def test_delete_person_cascades_memberships(client):
    team_id = await create_team(client, "Team")
    pid = await create_person(client, "Member")
    await add_member(client, team_id, pid)

    r = await client.delete(f"/teams/people/{pid}")
    assert r.status_code == 204

    r = await client.get(f"/teams/teams/{team_id}")
    assert r.json()["members"] == []


async def test_delete_unknown_person_404(client):
    r = await client.delete("/teams/people/9999")
    assert r.status_code == 404
