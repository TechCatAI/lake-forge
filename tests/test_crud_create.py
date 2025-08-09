import pathlib
import sys

BASE = pathlib.Path(__file__).resolve().parents[1]
sys.path.append(str(BASE))
sys.path.append(str(BASE / "apps" / "backend"))

import crud  # noqa: E402
from apps.backend.models import BronzeConfigIn  # noqa: E402


def test_create_bronze_allows_empty_pk_for_full(monkeypatch):
    called = {}

    class DummyCursor:
        def __init__(self):
            self.params = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def execute(self, q2, p2):
            self.params = p2
            called["params"] = p2

        def fetchone(self):
            p = self.params
            return {
                "id": 1,
                "group_id": p["group_id"],
                "raw_config_id": p["raw_config_id"],
                "catalog": p["catalog"],
                "schema_name": p["schema_name"],
                "table_name": p["table_name"],
                "connection_id": p["connection_id"],
                "load_type": p["load_type"],
                "pk_columns": p["pk_columns"],
                "watermark_col": p["watermark_col"],
                "ingest_options": (
                    p["ingest_options"].adapted
                    if hasattr(p["ingest_options"], "adapted")
                    else p["ingest_options"]
                ),
                "quarantine": p["quarantine"],
                "is_enabled": p["is_enabled"],
            }

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def cursor(self, *a, **kw):
            return DummyCursor()

    monkeypatch.setattr(crud, "get_conn", lambda: DummyConn())

    cfg = BronzeConfigIn(
        group_id=None,
        raw_config_id=1,
        catalog="c",
        schema_name="s",
        table_name="t",
        connection_id=None,
        load_type="full",
        pk_columns=[],
        ingest_options={},
        watermark_col=None,
        quarantine=False,
        is_enabled=False,
    )

    row = crud.create_bronze(cfg)
    assert row.pk_columns == []
    assert called["params"]["pk_columns"] == []
