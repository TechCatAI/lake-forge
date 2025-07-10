import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import TableConfigOut, TableConfigUpdate

client = TestClient(app)

SAMPLE_ROW = {
    "id": 1,
    "source_kind": "volume",
    "source_system": "sys",
    "catalog": "c",
    "schema_name": "s",
    "table_name": "t",
    "is_enabled": True,
    "source_path": "/path",
    "file_format": "csv",
    "connection_id": 2,
    "load_type": "full",
    "pk_columns": ["id"],
    "ingest_options": {},
    "quarantine": False,
}


def stub_update_table(id: int, payload: TableConfigUpdate) -> TableConfigOut:
    return TableConfigOut(**SAMPLE_ROW)


def test_patch_happy(monkeypatch):
    monkeypatch.setattr(crud, "update_table", stub_update_table)
    resp = client.patch("/api/tables/1", json={"source_kind": "volume"})
    assert resp.status_code == 200
    assert resp.json()["id"] == 1
    assert resp.json()["pk_columns"] == ["id"]


def test_bad_enum(monkeypatch):
    monkeypatch.setattr(crud, "update_table", stub_update_table)
    resp = client.patch("/api/tables/1", json={"load_type": "bad"})
    assert resp.status_code == 422


def test_empty_pk_columns(monkeypatch):
    monkeypatch.setattr(crud, "update_table", stub_update_table)
    resp = client.patch(
        "/api/tables/1",
        json={"load_type": "incremental", "pk_columns": []},
    )
    assert resp.status_code == 422


def test_unknown_field(monkeypatch):
    monkeypatch.setattr(crud, "update_table", stub_update_table)
    resp = client.patch("/api/tables/1", json={"bogus": 1})
    assert resp.status_code == 422
