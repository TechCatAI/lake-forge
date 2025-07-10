import json
import datetime as dt
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
    DQRuleUpdate,
    GroupIn,
    GroupOut,
    GroupUpdate,
    ScheduleIn,
    ScheduleOut,
    ScheduleUpdate,
)
import logging

def build_update_sql(table: str, cols: dict[str, object]) -> tuple[sql.SQL, dict[str, object]]:
    """Return UPDATE statement and params for given columns."""
    if not cols:
        raise ValueError("No columns provided")

    assignments = [sql.SQL(f"{col} = %({col})s") for col in cols.keys()]
    assignments.append(sql.SQL("updated_at = now()"))
    assignments.append(sql.SQL("updated_by = %(updated_by)s"))

    stmt = sql.SQL("UPDATE {} SET {} WHERE id = %(id)s RETURNING *;").format(sql.SQL(table), sql.SQL(", ").join(assignments))

    return stmt, cols.copy()


def list_tables() -> list[TableConfigOut]:
    try:
        with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:  # makes every row behave like a dict
            cur.execute("SELECT * FROM mdf_app.table_config ORDER BY id;")
            rows = [TableConfigOut(**row) for row in cur.fetchall()]  # row is already dict-like
        return rows
    except Exception as e:
        logging.error(f"Error listing tables: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while listing tables")


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
       is_enabled, source_path, file_format, connection_id, group_id,
       load_type, pk_columns, ingest_options, quarantine,
       created_by, updated_by)
    VALUES (%(source_kind)s, %(source_system)s, %(catalog)s, %(schema_name)s,
            %(table_name)s, %(is_enabled)s, %(source_path)s, %(file_format)s,
            %(connection_id)s, %(group_id)s, %(load_type)s, %(pk_columns)s, %(ingest_options)s,
            %(quarantine)s, %(user)s, %(user)s)
    RETURNING *;
    """
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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

    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()

    return TableConfigOut(**dict(row))


def list_rules() -> list[DQRuleOut]:
    """List all data quality rules."""
    q = """
        SELECT
            dq.id,
            dq.table_config_id,
            dq.rule_name,
            dq.rule_sql,
            dq.severity,
            dq.is_enabled,
            dq.updated_at,
            tc.catalog || '.' || tc.schema_name || '.' || tc.table_name AS fqtn
        FROM mdf_app.dq_rule dq
        JOIN mdf_app.table_config tc ON tc.id = dq.table_config_id
        ORDER BY fqtn, rule_name;
    """
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q)
        rows = cur.fetchall()
    return [DQRuleOut(**row) for row in rows]


def create_rule(cfg: DQRuleIn) -> DQRuleOut:
    q = """
        WITH inserted AS (
            INSERT INTO mdf_app.dq_rule
                (table_config_id, rule_name, rule_sql, severity, is_enabled, created_by, updated_by)
            VALUES (%(table_config_id)s, %(rule_name)s, %(rule_sql)s, %(severity)s, %(is_enabled)s, %(user)s, %(user)s)
            RETURNING *
        )
        SELECT
            i.id,
            i.table_config_id,
            i.rule_name,
            i.rule_sql,
            i.severity,
            i.is_enabled,
            i.updated_at,
            tc.catalog || '.' || tc.schema_name || '.' || tc.table_name AS fqtn
        FROM inserted i
        JOIN mdf_app.table_config tc ON tc.id = i.table_config_id;
    """
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**cfg.dict(), "user": "lake-forge-api"})
        row = cur.fetchone()
    return DQRuleOut(**dict(row))


def update_rule(id: int, payload: DQRuleUpdate) -> DQRuleOut:
    """Partially update a DQ rule."""

    fields = payload.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"

    stmt, params = build_update_sql("mdf_app.dq_rule", fields)
    params.update({"id": id, "updated_by": user})

    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                SELECT catalog || '.' || schema_name || '.' || table_name AS fqtn
                FROM mdf_app.table_config
                WHERE id = %s;
                """,
                (row["table_config_id"],),
            )
            row["fqtn"] = cur.fetchone()["fqtn"]

    return DQRuleOut(**dict(row))


def delete_table(id: int) -> None:
    """Delete a table configuration by ID."""
    with get_conn() as c, c.cursor() as cur:
        cur.execute("DELETE FROM mdf_app.table_config WHERE id = %s", (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Table not found")


def delete_rule(id: int) -> None:
    """Delete a DQ rule by ID."""
    with get_conn() as c, c.cursor() as cur:
        cur.execute("DELETE FROM mdf_app.dq_rule WHERE id = %s", (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not found")


def list_groups() -> list[GroupOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app."group" ORDER BY id;')
        rows = cur.fetchall()
    return [GroupOut(**row) for row in rows]


def create_group(payload: GroupIn) -> GroupOut:
    q = (
        "INSERT INTO mdf_app.\"group\" (name, description, is_enabled, created_by, updated_by) "
        "VALUES (%(name)s, %(description)s, %(is_enabled)s, %(user)s, %(user)s) RETURNING *;"
    )
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**payload.dict(), "user": "lake-forge-api"})
        row = cur.fetchone()
    return GroupOut(**row)


def update_group(id: int, delta: GroupUpdate) -> GroupOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"
    stmt, params = build_update_sql('mdf_app."group"', fields)
    params.update({"id": id, "updated_by": user})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return GroupOut(**row)


def delete_group(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('SELECT 1 FROM mdf_app.table_config WHERE group_id = %s LIMIT 1', (id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail='Group still referenced')
        cur.execute('DELETE FROM mdf_app."group" WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Group not found')


def list_schedules() -> list[ScheduleOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app.schedule ORDER BY id;')
        rows = cur.fetchall()
    for r in rows:
        r['times'] = [t.isoformat(timespec='minutes') for t in r['times']]
    return [ScheduleOut(**r) for r in rows]


def create_schedule(p: ScheduleIn) -> ScheduleOut:
    q = (
        "INSERT INTO mdf_app.schedule (name, description, days, times, is_enabled, created_by, updated_by) "
        "VALUES (%(name)s, %(description)s, %(days)s, %(times)s, %(is_enabled)s, %(user)s, %(user)s) RETURNING *;"
    )
    data = p.dict()
    data["times"] = [dt.time.fromisoformat(t) for t in data["times"]]
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**data, "user": "lake-forge-api"})
        row = cur.fetchone()
    row['times'] = [t.isoformat(timespec='minutes') for t in row['times']]
    return ScheduleOut(**row)


def update_schedule(id: int, delta: ScheduleUpdate) -> ScheduleOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"
    if "times" in fields:
        fields["times"] = [dt.time.fromisoformat(t) for t in fields["times"]]
    stmt, params = build_update_sql('mdf_app.schedule', fields)
    params.update({"id": id, "updated_by": user})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    row['times'] = [t.isoformat(timespec='minutes') for t in row['times']]
    return ScheduleOut(**row)


def delete_schedule(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('DELETE FROM mdf_app.schedule WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Schedule not found')
