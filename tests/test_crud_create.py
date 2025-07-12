import pathlib
import sys
from types import SimpleNamespace

BASE = pathlib.Path(__file__).resolve().parents[1]
sys.path.append(str(BASE))
sys.path.append(str(BASE / "apps" / "backend"))

import crud
from apps.backend.models import BronzeConfigIn


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
            called['params'] = p2

        def fetchone(self):
            p = self.params
            return {
                'id': 1,
                'group_id': p['group_id'],
                'raw_config_id': p['raw_config_id'],
                'source_kind': p['source_kind'],
                'catalog': p['catalog'],
                'schema_name': p['schema_name'],
                'table_name': p['table_name'],
                'source_path': p['source_path'],
                'file_format': p['file_format'],
                'connection_id': p['connection_id'],
                'load_type': p['load_type'],
                'pk_columns': p['pk_columns'],
                'watermark_col': p['watermark_col'],
                'ingest_options': (
                    p['ingest_options'].adapted if hasattr(p['ingest_options'], 'adapted') else p['ingest_options']
                ),
                'quarantine': p['quarantine'],
                'is_enabled': p['is_enabled'],
            }

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def cursor(self, *a, **kw):
            return DummyCursor()

    monkeypatch.setattr(crud, 'get_conn', lambda: DummyConn())

    cfg = BronzeConfigIn(
        group_id=None,
        raw_config_id=1,
        manual_raw=False,
        source_kind='volume',
        catalog='c',
        schema_name='s',
        table_name='t',
        source_path='/p',
        file_format=None,
        connection_id=None,
        load_type='full',
        pk_columns=[],
        ingest_options={},
        watermark_col=None,
        quarantine=False,
        is_enabled=False,
    )

    row = crud.create_bronze(cfg)
    assert row.pk_columns == []
    assert called['params']['pk_columns'] == []


def test_create_bronze_manual(monkeypatch):
    called = {}

    def stub_create_raw(p, db=None):
        called['raw'] = p
        return SimpleNamespace(
            id=99,
            group_id=p.group_id,
            source_kind=p.source_kind,
            source_system=p.source_system,
            connection_id=None,
            source_path=p.source_path,
            ingestion_type=p.ingestion_type,
            schedule_id=None,
            copy_options={},
            output_directory=p.output_directory,
            is_enabled=False,
            updated_at=None,
        )

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
                'group_id': p['group_id'],
                'raw_config_id': p['raw_config_id'],
                'source_kind': p['source_kind'],
                'catalog': p['catalog'],
                'schema_name': p['schema_name'],
                'table_name': p['table_name'],
                'source_path': p['source_path'],
                'file_format': p['file_format'],
                'connection_id': p['connection_id'],
                'load_type': p['load_type'],
                'pk_columns': p['pk_columns'],
                'watermark_col': p['watermark_col'],
                'ingest_options': (
                    p['ingest_options'].adapted if hasattr(p['ingest_options'], 'adapted') else p['ingest_options']
                ),
                'quarantine': p['quarantine'],
                'is_enabled': p['is_enabled'],
            }

    class DummyConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def cursor(self, *a, **kw):
            return DummyCursor()

    monkeypatch.setattr(crud, 'create_raw', stub_create_raw)
    monkeypatch.setattr(crud, 'get_conn', lambda: DummyConn())

    cfg = BronzeConfigIn(
        group_id=1,
        raw_config_id=None,
        manual_raw=True,
        source_kind='volume',
        catalog='c',
        schema_name='s',
        table_name='t',
        source_path='/p',
        file_format=None,
        connection_id=None,
        load_type='full',
        pk_columns=[],
        ingest_options={},
        watermark_col=None,
        quarantine=False,
        is_enabled=False,
    )

    row = crud.create_bronze(cfg)
    assert called['raw'].source_kind == 'manual'
    assert row.raw_config_id == 99
    assert called['params']['raw_config_id'] == 99
