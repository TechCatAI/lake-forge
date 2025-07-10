import pathlib
import sys
from types import SimpleNamespace

BASE = pathlib.Path(__file__).resolve().parents[1]
sys.path.append(str(BASE))
sys.path.append(str(BASE / "apps" / "backend"))

import crud
from apps.backend.models import TableConfigIn


def test_create_table_allows_empty_pk_for_full(monkeypatch):
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
            called['params'] = p2

        def fetchone(self):
            p = self.params
            return {
                'id': 1,
                'source_kind': p['source_kind'],
                'source_system': p['source_system'],
                'catalog': p['catalog'],
                'schema_name': p['schema_name'],
                'table_name': p['table_name'],
                'is_enabled': p['is_enabled'],
                'source_path': p['source_path'],
                'file_format': p['file_format'],
                'connection_id': p['connection_id'],
                'load_type': p['load_type'],
                'pk_columns': p['pk_columns'],
                'ingest_options': (
                    p['ingest_options'].adapted
                    if hasattr(p['ingest_options'], 'adapted')
                    else p['ingest_options']
                ),
                'quarantine': p['quarantine'],
            }

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def cursor(self, *a, **kw):
            return DummyCursor()

    monkeypatch.setattr(crud, 'get_conn', lambda: DummyConn())

    cfg = TableConfigIn(
        source_kind='volume',
        source_system='sys',
        catalog='c',
        schema_name='s',
        table_name='t',
        is_enabled=True,
        source_path='/p',
        file_format=None,
        connection_id=None,
        load_type='full',
        pk_columns=[],
        ingest_options={},
    )

    row = crud.create_table(cfg)
    assert row.pk_columns == []
    assert called['params']['pk_columns'] == []
