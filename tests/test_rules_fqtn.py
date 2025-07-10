import pathlib
import sys
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

import crud
from apps.backend.main import app

client = TestClient(app)


def test_list_rules_includes_fqtn(monkeypatch):
    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def execute(self, q, params=None):
            pass

        def fetchall(self):
            return [
                {
                    "id": 1,
                    "table_config_id": 1,
                    "rule_name": "r",
                    "rule_sql": "select 1",
                    "severity": "warn",
                    "is_enabled": True,
                    "updated_at": None,
                    "fqtn": "c.s.t",
                }
            ]

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def cursor(self, *a, **kw):
            return DummyCursor()

    monkeypatch.setattr(crud, "get_conn", lambda: DummyConn())

    resp = client.get("/api/rules")
    assert resp.status_code == 200
    assert resp.json()[0]["fqtn"] == "c.s.t"

