import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import BronzeConfigOut, BronzeConfigUpdate

client = TestClient(app)

SAMPLE_ROW = {
    "id": 1,
    "group_id": None,
    "raw_config_id": 1,
    "catalog": "c",
    "schema_name": "s",
    "table_name": "t",
    "connection_id": 2,
    "load_type": "full",
    "pk_columns": ["id"],
    "watermark_col": None,
    "ingest_options": {},
    "quarantine": False,
    "is_enabled": False,
}


def stub_update_bronze(id: int, payload: BronzeConfigUpdate) -> BronzeConfigOut:
    return BronzeConfigOut(**SAMPLE_ROW)


def test_patch_happy(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch("/api/bronze-config/1", json={"catalog": "d"})
    assert resp.status_code == 200
    assert resp.json()["id"] == 1
    assert resp.json()["pk_columns"] == ["id"]


def test_bad_enum(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch("/api/bronze-config/1", json={"load_type": "bad"})
    assert resp.status_code == 422


def test_empty_pk_columns(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch(
        "/api/bronze-config/1",
        json={"load_type": "incremental", "pk_columns": []},
    )
    assert resp.status_code == 422


def test_unknown_field(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch("/api/bronze-config/1", json={"bogus": 1})
    assert resp.status_code == 422
