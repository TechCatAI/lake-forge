import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app

client = TestClient(app)


def test_delete_table(monkeypatch):
    called = {}
    def stub(id: int):
        called['id'] = id
    monkeypatch.setattr(crud, 'delete_table', stub)
    resp = client.delete('/api/tables/1')
    assert resp.status_code == 204
    assert called['id'] == 1


def test_delete_rule(monkeypatch):
    called = {}
    def stub(id: int):
        called['id'] = id
    monkeypatch.setattr(crud, 'delete_rule', stub)
    resp = client.delete('/api/rules/1')
    assert resp.status_code == 204
    assert called['id'] == 1

