import psycopg2.extras
from sqlalchemy import text
from db import get_conn
from models import (
    TableConfigIn,
    TableConfigOut,
    TableConfigUpdate,
    DQRuleIn,
    DQRuleOut,
)


def list_tables() -> list[TableConfigOut]:
    with get_conn() as c, c.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    ) as cur:  # makes every row behave like a dict
        cur.execute("SELECT * FROM mdf_app.table_config ORDER BY id;")
        rows = [
            TableConfigOut(**row) for row in cur.fetchall()
        ]  # row is already dict-like
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
        cur.execute(q, {**cfg.dict(), "user": "lake-forge-api"})
        row = cur.fetchone()
    return TableConfigOut(**dict(row))


def update_table(id: int, payload: TableConfigUpdate) -> TableConfigOut:
    """Partially update a table configuration."""

    fields = payload.dict(exclude_none=True)
    if not fields:
        raise ValueError("No fields provided for update")

    set_clauses = [f"{col} = :{col}" for col in fields]
    set_clauses.append("updated_by = :user")
    q = text(
        f"""
        UPDATE mdf_app.table_config
        SET {', '.join(set_clauses)}
        WHERE id = :id
        RETURNING *;
        """
    )

    params = {**fields, "id": id, "user": "lake-forge-api"}

    with get_conn() as c, c.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    ) as cur:
        cur.execute(str(q), params)
        row = cur.fetchone()

    return TableConfigOut(**dict(row))


def list_rules() -> list[DQRuleOut]:
    """List all data quality rules."""
    raise NotImplementedError


def create_rule(cfg: DQRuleIn) -> DQRuleOut:
    """Placeholder for rule creation logic."""
    raise NotImplementedError
