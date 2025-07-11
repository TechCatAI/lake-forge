import pathlib
import sys
from fastapi.testclient import TestClient
from fastapi import HTTPException

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import (
    RawConfigIn,
    RawConfigOut,
    RawConfigUpdate,
    BronzeConfigIn,
    BronzeConfigOut,
    BronzeConfigUpdate,
)

client = TestClient(app)

RAW_ROW = {
    "id": 1,
    "group_id": None,
    "source_kind": "sftp",
    "source_system": "sys",
    "connection_id": None,
    "source_path": "/src",
    "ingestion_type": "databricks",
    "schedule_id": None,
    "copy_options": {},
    "output_directory": "/out",
    "is_enabled": True,
    "updated_at": None,
}

BRONZE_ROW = {
    "id": 1,
    "group_id": None,
    "raw_config_id": 1,
    "source_kind": "volume",
    "catalog": "c",
    "schema_name": "s",
    "table_name": "t",
    "source_path": "/raw",
    "file_format": None,
    "connection_id": None,
    "load_type": "full",
    "pk_columns": ["id"],
    "watermark_col": None,
    "ingest_options": {},
    "quarantine": False,
    "is_enabled": False,
    "updated_at": None,
}


def stub_create_raw(p: RawConfigIn) -> RawConfigOut:
    return RawConfigOut(**RAW_ROW)


def stub_update_raw(id: int, delta: RawConfigUpdate) -> RawConfigOut:
    return RawConfigOut(**RAW_ROW)


def stub_create_bronze(p: BronzeConfigIn) -> BronzeConfigOut:
    return BronzeConfigOut(**BRONZE_ROW)


def stub_update_bronze(id: int, delta: BronzeConfigUpdate) -> BronzeConfigOut:
    return BronzeConfigOut(**BRONZE_ROW)


def raw_payload():
    return {
        "group_id": None,
        "source_kind": "sftp",
        "source_system": "sys",
        "connection_id": None,
        "source_path": "/src",
        "ingestion_type": "databricks",
        "schedule_id": None,
        "copy_options": {},
        "output_directory": "/out",
        "is_enabled": True,
    }


def bronze_payload():
    return {
        "group_id": None,
        "raw_config_id": 1,
        "source_kind": "volume",
        "catalog": "c",
        "schema_name": "s",
        "table_name": "t",
        "source_path": "/raw",
        "file_format": None,
        "connection_id": None,
        "load_type": "full",
        "pk_columns": ["id"],
        "watermark_col": None,
        "ingest_options": {},
        "quarantine": False,
        "is_enabled": False,
        "manual_raw": False,
    }


def bronze_manual_payload():
    data = bronze_payload()
    data.pop("raw_config_id")
    data["manual_raw"] = True
    return data


def test_raw_flow(monkeypatch):
    monkeypatch.setattr(crud, "list_raw", lambda: [])
    resp = client.get("/api/raw-config")
    assert resp.status_code == 200
    assert resp.json() == []

    monkeypatch.setattr(crud, "create_raw", stub_create_raw)
    resp = client.post("/api/raw-config", json=raw_payload())
    assert resp.status_code == 201
    assert resp.json()["id"] == 1

    monkeypatch.setattr(crud, "update_raw", stub_update_raw)
    resp = client.patch("/api/raw-config/1", json={"source_system": "x"})
    assert resp.status_code == 200

    called = {}
    def del_stub(id: int):
        called["id"] = id
    monkeypatch.setattr(crud, "delete_raw", del_stub)
    resp = client.delete("/api/raw-config/1")
    assert resp.status_code == 204
    assert called["id"] == 1


def test_bronze_flow(monkeypatch):
    monkeypatch.setattr(crud, "list_bronze", lambda: [])
    resp = client.get("/api/bronze-config")
    assert resp.status_code == 200
    assert resp.json() == []

    monkeypatch.setattr(crud, "create_bronze", stub_create_bronze)
    resp = client.post("/api/bronze-config", json=bronze_payload())
    assert resp.status_code == 201
    assert resp.json()["id"] == 1

    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch("/api/bronze-config/1", json={"catalog": "x"})
    assert resp.status_code == 200

    called = {}
    def delb(id: int):
        called["id"] = id
    monkeypatch.setattr(crud, "delete_bronze", delb)
    resp = client.delete("/api/bronze-config/1")
    assert resp.status_code == 204
    assert called["id"] == 1


def test_bronze_manual(monkeypatch):
    captured = {}

    def create_stub(p: BronzeConfigIn):
        captured["payload"] = p.dict()
        return BronzeConfigOut(**BRONZE_ROW)

    monkeypatch.setattr(crud, "create_bronze", create_stub)
    resp = client.post("/api/bronze-config", json=bronze_manual_payload())
    assert resp.status_code == 201
    assert captured["payload"]["manual_raw"] is True


def test_delete_raw_conflict(monkeypatch):
    def bad(id: int):
        raise HTTPException(status_code=409, detail="ref")
    monkeypatch.setattr(crud, "delete_raw", bad)
    resp = client.delete("/api/raw-config/1")
    assert resp.status_code == 409


def test_create_bronze_validation(monkeypatch):
    def bad(p: BronzeConfigIn):
        raise HTTPException(status_code=422, detail="bad")
    monkeypatch.setattr(crud, "create_bronze", bad)
    resp = client.post("/api/bronze-config", json=bronze_payload())
    assert resp.status_code == 422


def test_tables_endpoint_gone():
    resp = client.get("/api/tables")
    assert resp.status_code == 404

