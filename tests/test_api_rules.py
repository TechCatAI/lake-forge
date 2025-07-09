import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app
from apps.backend.models import DQRuleIn, DQRuleOut, DQRuleUpdate

client = TestClient(app)

SAMPLE_ROW = {
    "id": 1,
    "table_config_id": 2,
    "rule_name": "rule",
    "rule_sql": "select 1",
    "severity": "warn",
    "updated_at": None,
    "fqtn": "c.s.t",
}


def stub_create_rule(cfg: DQRuleIn) -> DQRuleOut:
    return DQRuleOut(**SAMPLE_ROW)


def stub_update_rule(id: int, payload: DQRuleUpdate) -> DQRuleOut:
    return DQRuleOut(**SAMPLE_ROW)


def test_get(monkeypatch):
    monkeypatch.setattr(crud, "list_rules", lambda: [DQRuleOut(**SAMPLE_ROW)])
    resp = client.get("/api/rules")
    assert resp.status_code == 200
    assert resp.json()[0]["id"] == 1


def valid_payload():
    return {
        "table_config_id": 2,
        "rule_name": "r",
        "rule_sql": "select 1",
        "severity": "warn",
    }


def test_post_happy(monkeypatch):
    monkeypatch.setattr(crud, "create_rule", stub_create_rule)
    resp = client.post("/api/rules", json=valid_payload())
    assert resp.status_code == 201
    assert resp.json()["id"] == 1


def test_post_validation_error():
    bad = valid_payload()
    bad.pop("rule_name")
    resp = client.post("/api/rules", json=bad)
    assert resp.status_code == 422


def test_patch_happy(monkeypatch):
    monkeypatch.setattr(crud, "update_rule", stub_update_rule)
    resp = client.patch("/api/rules/1", json={"rule_name": "x"})
    assert resp.status_code == 200
    assert resp.json()["id"] == 1


def test_patch_bad_enum(monkeypatch):
    monkeypatch.setattr(crud, "update_rule", stub_update_rule)
    resp = client.patch("/api/rules/1", json={"severity": "bad"})
    assert resp.status_code == 422
