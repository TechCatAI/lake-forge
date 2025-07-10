import pathlib
import sys
from fastapi.testclient import TestClient
from fastapi import HTTPException

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import GroupIn, GroupOut, GroupUpdate, ScheduleIn, ScheduleOut, ScheduleUpdate

client = TestClient(app)

GROUP_ROW = {"id": 1, "name": "g", "description": None, "is_enabled": True}
SCHED_ROW = {"id": 1, "name": "s", "description": None, "days": [1], "times": ["05:00"], "is_enabled": True}


def stub_create_group(p: GroupIn) -> GroupOut:
    return GroupOut(**GROUP_ROW)


def stub_update_group(id: int, payload: GroupUpdate) -> GroupOut:
    return GroupOut(**GROUP_ROW)


def stub_create_schedule(p: ScheduleIn) -> ScheduleOut:
    return ScheduleOut(**SCHED_ROW)


def stub_update_schedule(id: int, payload: ScheduleUpdate) -> ScheduleOut:
    return ScheduleOut(**SCHED_ROW)


def test_groups_flow(monkeypatch):
    monkeypatch.setattr(crud, "list_groups", lambda: [])
    resp = client.get("/api/groups")
    assert resp.status_code == 200
    assert resp.json() == []

    monkeypatch.setattr(crud, "create_group", stub_create_group)
    resp = client.post("/api/groups", json={"name": "g", "description": None, "is_enabled": True})
    assert resp.status_code == 201
    assert resp.json()["id"] == 1

    monkeypatch.setattr(crud, "update_group", stub_update_group)
    resp = client.patch("/api/groups/1", json={"name": "x"})
    assert resp.status_code == 200
    assert resp.json()["id"] == 1

    called = {}
    def del_stub(id: int):
        called["id"] = id
    monkeypatch.setattr(crud, "delete_group", del_stub)
    resp = client.delete("/api/groups/1")
    assert resp.status_code == 204
    assert called["id"] == 1


def test_delete_group_referenced(monkeypatch):
    def bad(id: int):
        raise HTTPException(status_code=400, detail="ref")
    monkeypatch.setattr(crud, "delete_group", bad)
    resp = client.delete("/api/groups/1")
    assert resp.status_code == 400


def test_schedules_flow(monkeypatch):
    monkeypatch.setattr(crud, "list_schedules", lambda: [])
    resp = client.get("/api/schedules")
    assert resp.status_code == 200
    assert resp.json() == []

    monkeypatch.setattr(crud, "create_schedule", stub_create_schedule)
    payload = {"name": "s", "description": None, "days": [1], "times": ["05:00"], "is_enabled": True}
    resp = client.post("/api/schedules", json=payload)
    assert resp.status_code == 201
    assert resp.json()["id"] == 1

    monkeypatch.setattr(crud, "update_schedule", stub_update_schedule)
    resp = client.patch("/api/schedules/1", json={"name": "x"})
    assert resp.status_code == 200
    assert resp.json()["id"] == 1

    called = {}
    def del_s(id: int):
        called["id"] = id
    monkeypatch.setattr(crud, "delete_schedule", del_s)
    resp = client.delete("/api/schedules/1")
    assert resp.status_code == 204
    assert called["id"] == 1


def test_schedule_validation_errors():
    payload = {"name": "bad", "days": [8], "times": ["05:00"], "is_enabled": True}
    resp = client.post("/api/schedules", json=payload)
    assert resp.status_code == 422

    payload = {"name": "bad", "days": [1], "times": ["25:00"], "is_enabled": True}
    resp = client.post("/api/schedules", json=payload)
    assert resp.status_code == 422
