async def test_health_lists_modules(client):
    r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    names = {m["name"] for m in body["modules"]}
    assert "agile_digests" in names
    assert "hello" in names
    for m in body["modules"]:
        assert m["version"]
        assert isinstance(m["nav"], list)
