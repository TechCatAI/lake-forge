import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "backend"))

from crud import build_update_sql


def test_build_update_sql_basic():
    q, params = build_update_sql("mdf_app.bronze_config", {"catalog": "c"})
    assert q.as_string(None) == (
        "UPDATE mdf_app.bronze_config SET catalog = %(catalog)s, updated_at = now(), updated_by = %(updated_by)s WHERE id = %(id)s RETURNING *;"
    )
    assert params == {"catalog": "c"}


def test_multiple_fields():
    q, params = build_update_sql("tbl", {"a": 1, "b": 2})
    assert q.as_string(None).startswith("UPDATE tbl SET")
    assert "a = %(a)s" in q.as_string(None)
    assert "b = %(b)s" in q.as_string(None)
    assert params == {"a": 1, "b": 2}
