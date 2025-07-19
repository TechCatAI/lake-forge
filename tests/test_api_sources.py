from fastapi.testclient import TestClient
import pathlib, sys
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import SourceSystemIn, SourceSystemOut, SourceSystemUpdate

client = TestClient(app)

ROW = {
    "id": 1,
    "name": "src",
    "server": "s",
    "description": None,
    "type": "sql",
    "created_at": None,
}


def stub_create(p: SourceSystemIn) -> SourceSystemOut:
    return SourceSystemOut(**ROW)


def stub_update(id: int, payload: SourceSystemUpdate) -> SourceSystemOut:
    return SourceSystemOut(**ROW)


def test_flow(monkeypatch):
    monkeypatch.setattr(crud, "list_source_systems", lambda: [])
    resp = client.get("/api/source-systems")
    assert resp.status_code == 200
    assert resp.json() == []

    monkeypatch.setattr(crud, "create_source_system", stub_create)
    payload = {"name": "src", "server": "s", "description": None, "type": "sql"}
    resp = client.post("/api/source-systems", json=payload)
    assert resp.status_code == 201
    assert resp.json()["id"] == 1

    monkeypatch.setattr(crud, "update_source_system", stub_update)
    resp = client.patch("/api/source-systems/1", json={"server": "x"})
    assert resp.status_code == 200

    called = {}
    def del_stub(id: int):
        called["id"] = id
    monkeypatch.setattr(crud, "delete_source_system", del_stub)
    resp = client.delete("/api/source-systems/1")
    assert resp.status_code == 204
    assert called["id"] == 1
