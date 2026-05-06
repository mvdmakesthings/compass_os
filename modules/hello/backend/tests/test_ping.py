async def test_ping_returns_db_now(client):
    r = await client.get("/hello/ping")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert isinstance(body["db_now"], str)
    assert "T" in body["db_now"]  # ISO datetime
