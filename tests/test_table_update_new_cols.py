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
    "source_kind": "volume",
    "catalog": "c",
    "schema_name": "s",
    "table_name": "t",
    "source_path": "/path",
    "file_format": "parquet",
    "connection_id": 2,
    "load_type": "full",
    "pk_columns": ["id"],
    "watermark_col": None,
    "ingest_options": {},
    "quarantine": False,
    "is_enabled": False,
}

def stub_update_bronze(id: int, payload: BronzeConfigUpdate) -> BronzeConfigOut:
    return BronzeConfigOut(**{**SAMPLE_ROW, **payload.dict(exclude_none=True)})


def test_patch_update_new_columns(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch(
        "/api/bronze-config/1",
        json={
            "source_kind": "external",
            "source_path": "/new",
            "file_format": "csv",
            "ingest_options": {"mode": "auto"},
        },
    )
    assert resp.status_code == 200
    assert resp.json()["source_kind"] == "external"
    assert resp.json()["source_path"] == "/new"
    assert resp.json()["file_format"] == "csv"
    assert resp.json()["ingest_options"] == {"mode": "auto"}


def test_patch_bad_source_kind():
    resp = client.patch("/api/bronze-config/1", json={"source_kind": "foo"})
    assert resp.status_code == 422


def test_patch_bad_file_format(monkeypatch):
    monkeypatch.setattr(crud, "update_bronze", stub_update_bronze)
    resp = client.patch("/api/bronze-config/1", json={"file_format": "orc"})
    assert resp.status_code == 200
