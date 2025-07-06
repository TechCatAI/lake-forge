import psycopg2.extras
from db import get_conn
from models import TableConfigIn, TableConfigOut, DQRuleIn, DQRuleOut

def list_tables() -> list[TableConfigOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur: # makes every row behave like a dict
        cur.execute("SELECT * FROM mdf_app.table_config ORDER BY id;")
        rows = [TableConfigOut(**row) for row in cur.fetchall()]   # row is already dict-like
    return rows

def create_table(cfg: TableConfigIn) -> TableConfigOut:
    q = """
    INSERT INTO mdf_app.table_config
      (source_kind, source_system, catalog, schema_name, table_name,
       is_enabled, source_path, file_format, connection_id,
       load_type, pk_columns, ingest_options,
       created_by, updated_by)
    VALUES (%(source_kind)s, %(source_system)s, %(catalog)s, %(schema_name)s,
            %(table_name)s, %(is_enabled)s, %(source_path)s, %(file_format)s,
            %(connection_id)s, %(load_type)s, %(pk_columns)s, %(ingest_options)s,
            %(user)s, %(user)s)
    RETURNING *;
    """
    with get_conn() as c, c.cursor() as cur:
        cur.execute(q, {**cfg.model_dump(), "user": "lake-forge-api"})
        row = cur.fetchone()
    return TableConfigOut(**dict(row))

def list_rules() -> list[DQRuleOut]:
    """List all data quality rules."""
    return rows

def create_rule(cfg: DQRuleIn) -> DQRuleOut:
    """placeholder for rule creation logic"""
    return DQRuleOut(**dict(row))