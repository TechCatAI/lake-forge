import json
import psycopg2.extras
from psycopg2 import sql
from fastapi import HTTPException
from db import get_conn
from models import (
    TableConfigIn,
    TableConfigOut,
    TableConfigUpdate,
    DQRuleIn,
    DQRuleOut,
)


def build_update_sql(
    table: str, cols: dict[str, object]
) -> tuple[sql.SQL, dict[str, object]]:
    """Return UPDATE statement and params for given columns."""
    if not cols:
        raise ValueError("No columns provided")

    assignments = [sql.SQL(f"{col} = %({col})s") for col in cols.keys()]
    assignments.append(sql.SQL("updated_at = now()"))
    assignments.append(sql.SQL("updated_by = %(updated_by)s"))

    stmt = sql.SQL("UPDATE {} SET {} WHERE id = %(id)s RETURNING *;").format(
        sql.SQL(table), sql.SQL(", ").join(assignments)
    )

    return stmt, cols.copy()


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
    data = cfg.dict()
    required = [
        "source_system",
        "catalog",
        "schema_name",
        "table_name",
        "source_path",
    ]
    for f in required:
        val = data.get(f)
        if isinstance(val, str) and not val.strip():
            raise ValueError(f"{f} is required")
    pk_columns = data.get("pk_columns")
    if pk_columns in (None, ""):
        pk_columns = []
    if isinstance(pk_columns, dict):
        pk_columns = list(pk_columns.values())
    if isinstance(pk_columns, str):
        pk_columns = [pk_columns]
    data["pk_columns"] = list(pk_columns)

    if data.get("load_type") == "incremental" and not pk_columns:
        raise ValueError("pk_columns is required for incremental load")

    data["ingest_options"] = psycopg2.extras.Json(
        data.get("ingest_options", {}), dumps=lambda v: json.dumps(v, default=str)
    )

    if data.get("load_type") == "full" and not data["pk_columns"]:
        data["pk_columns"] = []

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
    with get_conn() as c, c.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    ) as cur:
        cur.execute(q, {**data, "user": "lake-forge-api"})
        row = cur.fetchone()
    return TableConfigOut(**dict(row))


def update_table(id: int, payload: TableConfigUpdate) -> TableConfigOut:
    """Partially update a table configuration."""

    fields = payload.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"

    invalid = [
        c
        for c, v in fields.items()
        if c not in {"pk_columns", "ingest_options"} and isinstance(v, (list, dict))
    ]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body", f], "msg": "must be scalar"} for f in invalid],
        )

    if "ingest_options" in fields:
        fields["ingest_options"] = psycopg2.extras.Json(
            fields["ingest_options"], dumps=lambda v: json.dumps(v, default=str)
        )

    stmt, params = build_update_sql("mdf_app.table_config", fields)
    params.update({"id": id, "updated_by": user})

    with get_conn() as c, c.cursor(
        cursor_factory=psycopg2.extras.RealDictCursor
    ) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()

    return TableConfigOut(**dict(row))


def list_rules() -> list[DQRuleOut]:
    """List all data quality rules."""
    raise NotImplementedError


def create_rule(cfg: DQRuleIn) -> DQRuleOut:
    """Placeholder for rule creation logic."""
    raise NotImplementedError
