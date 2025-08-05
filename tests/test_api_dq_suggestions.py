import pathlib
import sys
from fastapi.testclient import TestClient
from fastapi import HTTPException

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import DQSuggestionOut, DQSuggestionUpdate

client = TestClient(app)

SAMPLE = {
    "id": 1,
    "table_config_id": 2,
    "table_name": "c.s.t",
    "rule_name": "r",
    "rule_sql": "select 1",
    "severity": "warn",
    "suggestion_status": "new",
    "profiled_at": "2024-01-01T00:00:00Z",
    "note": None,
}


def test_list(monkeypatch):
    monkeypatch.setattr(crud, "list_dq_suggestions", lambda: [DQSuggestionOut(**SAMPLE)])
    resp = client.get("/api/dq-suggestions")
    assert resp.status_code == 200
    assert resp.json()[0]["id"] == 1


def test_bulk_accept(monkeypatch):
    called = {}

    def stub(ids, status):
        called["ids"] = ids
        called["status"] = status

    monkeypatch.setattr(crud, "bulk_update_dq_suggestions", stub)
    resp = client.patch(
        "/api/dq-suggestions/bulk", json={"ids": [1], "action": "accept"}
    )
    assert resp.status_code == 200
    assert called["status"] == "accepted"


def test_bulk_missing(monkeypatch):
    def stub(ids, status):
        raise HTTPException(status_code=404, detail="not found")

    monkeypatch.setattr(crud, "bulk_update_dq_suggestions", stub)
    resp = client.patch(
        "/api/dq-suggestions/bulk", json={"ids": [99], "action": "reject"}
    )
    assert resp.status_code == 404


def test_implement(monkeypatch):
    monkeypatch.setattr(
        crud, "implement_dq_suggestions", lambda ids, user: [10]
    )
    resp = client.post("/api/dq-suggestions/implement", json={"ids": [1]})
    assert resp.status_code == 200
    assert resp.json()["rule_ids"] == [10]


def test_implement_conflict(monkeypatch):
    def stub(ids, user):
        raise HTTPException(status_code=409, detail="bad state")

    monkeypatch.setattr(crud, "implement_dq_suggestions", stub)
    resp = client.post("/api/dq-suggestions/implement", json={"ids": [1]})
    assert resp.status_code == 409
