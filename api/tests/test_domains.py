"""Per-user domain registry: create, list-with-counts, promote auto-registers."""
from __future__ import annotations


async def test_create_and_list_domains(client):
    r = await client.post("/api/domains", json={"name": "Side Project"})
    assert r.status_code == 201
    assert r.json()["name"] == "Side Project"

    r = await client.get("/api/domains")
    names = [d["name"] for d in r.json()]
    assert "Side Project" in names


async def test_create_domain_is_idempotent(client):
    await client.post("/api/domains", json={"name": "Dup"})
    await client.post("/api/domains", json={"name": "Dup"})
    r = await client.get("/api/domains")
    assert [d["name"] for d in r.json()].count("Dup") == 1


async def test_list_includes_counts_and_item_domains(client):
    # an item in a domain that was never explicitly registered still shows up
    await client.post("/api/items", json={"title": "t1", "domain": "Ad-hoc", "state": "idea"})
    await client.post("/api/items", json={"title": "t2", "domain": "Ad-hoc", "state": "idea"})
    await client.post("/api/items", json={"title": "t3", "domain": "Ad-hoc", "state": "done"})
    r = await client.get("/api/domains")
    by_name = {d["name"]: d for d in r.json()}
    assert by_name["Ad-hoc"]["count"] == 2


async def test_done_only_item_domain_still_lists_with_zero_count(client):
    await client.post("/api/items", json={"title": "finished", "domain": "Archive", "state": "done"})

    r = await client.get("/api/domains")

    by_name = {d["name"]: d for d in r.json()}
    assert by_name["Archive"]["count"] == 0


async def test_promote_registers_new_domain(client):
    cap = (await client.post("/api/items/capture", json={"text": "an idea"})).json()
    await client.post(f"/api/items/{cap['id']}/promote", json={"domain": "Freshly Made"})

    r = await client.get("/api/domains")
    names = [d["name"] for d in r.json()]
    assert "Freshly Made" in names
