import json
import datetime as dt
import psycopg2.extras
from psycopg2 import sql
from fastapi import HTTPException
from db import get_conn
from models import (
    RawConfigIn,
    RawConfigOut,
    RawConfigUpdate,
    BronzeConfigIn,
    BronzeConfigOut,
    BronzeConfigUpdate,
    DQRuleIn,
    DQRuleOut,
    DQRuleUpdate,
    DQSuggestionOut,
    DQSuggestionUpdate,
    GroupIn,
    GroupOut,
    GroupUpdate,
    ComputeProfileIn,
    ComputeProfileOut,
    ComputeProfileUpdate,
    ScheduleIn,
    ScheduleOut,
    ScheduleUpdate,
    ConnectionIn,
    ConnectionOut,
    ConnectionUpdate,
    SourceSystemIn,
    SourceSystemOut,
    SourceSystemUpdate,
)
import logging

def build_update_sql(
    table: str,
    cols: dict[str, object],
    *,
    include_user: bool = True,
) -> tuple[sql.SQL, dict[str, object]]:
    """Return UPDATE statement and params for given columns.

    Parameters
    ----------
    table:
        Fully qualified table name to update.
    cols:
        Mapping of column names to values to be updated.
    include_user:
        If ``True`` (default) add ``updated_by`` to the statement. Some legacy
        tables do not include this column so callers can disable it.
    """

    if not cols:
        raise ValueError("No columns provided")

    assignments = [sql.SQL(f"{col} = %({col})s") for col in cols.keys()]
    assignments.append(sql.SQL("updated_at = now()"))
    if include_user:
        assignments.append(sql.SQL("updated_by = %(updated_by)s"))

    stmt = sql.SQL("UPDATE {} SET {} WHERE id = %(id)s RETURNING *;").format(
        sql.SQL(table), sql.SQL(", ").join(assignments)
    )

    return stmt, cols.copy()


def list_raw(db=None) -> list[RawConfigOut]:
    conn = db or get_conn()
    with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM mdf_app.raw_config ORDER BY id;")
        rows = cur.fetchall()
    return [RawConfigOut(**row) for row in rows]


def create_raw(p: RawConfigIn, db=None) -> RawConfigOut:
    data = p.dict()
    if "copy_options" in data:
        data["copy_options"] = psycopg2.extras.Json(data["copy_options"], dumps=lambda v: json.dumps(v, default=str))
    q = """
        INSERT INTO mdf_app.raw_config
            (group_id, source_system_id, connection_id, source_path,
             ingestion_type, copy_options, output_directory,
             file_format, watermark_col, watermark, watermark_increment_sec,
             watermark_initial, is_enabled, created_by, updated_by)
        VALUES (%(group_id)s, %(source_system_id)s, %(connection_id)s,
                %(source_path)s, %(ingestion_type)s,
                %(copy_options)s, %(output_directory)s, %(file_format)s,
                %(watermark_col)s, %(watermark)s,
                %(watermark_increment_sec)s, %(watermark_initial)s,
                %(is_enabled)s, %(user)s, %(user)s)
        RETURNING *;
    """
    conn = db or get_conn()
    with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**data, "user": "lake-forge-api"})
        row = cur.fetchone()
    return RawConfigOut(**row)


def update_raw(id: int, delta: RawConfigUpdate, db=None) -> RawConfigOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"
    if "copy_options" in fields:
        fields["copy_options"] = psycopg2.extras.Json(fields["copy_options"], dumps=lambda v: json.dumps(v, default=str))
    stmt, params = build_update_sql("mdf_app.raw_config", fields)
    params.update({"id": id, "updated_by": user})
    conn = db or get_conn()
    with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return RawConfigOut(**row)


def delete_raw(id: int, db=None) -> None:
    conn = db or get_conn()
    with conn as c, c.cursor() as cur:
        cur.execute("SELECT 1 FROM mdf_app.bronze_config WHERE raw_config_id = %s LIMIT 1", (id,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Raw config still referenced")
        cur.execute("DELETE FROM mdf_app.raw_config WHERE id = %s", (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Raw config not found")


def list_bronze(db=None) -> list[BronzeConfigOut]:
    try:
        conn = db or get_conn()
        with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM mdf_app.bronze_config ORDER BY id;")
            rows = [BronzeConfigOut(**row) for row in cur.fetchall()]
        return rows
    except Exception as e:
        logging.error(f"Error listing tables: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while listing tables")


def create_bronze(cfg: BronzeConfigIn, db=None) -> BronzeConfigOut:
    data = cfg.dict()
    required = [
        "raw_config_id",
        "catalog",
        "schema_name",
        "table_name",
    ]
    for f in required:
        val = data.get(f)
        if isinstance(val, str) and not val.strip():
            raise ValueError(f"{f} is required")
    for field in ["pk_columns", "partition_cols", "zorder_cols"]:
        cols = data.get(field)
        if cols in (None, ""):
            cols = []
        if isinstance(cols, dict):
            cols = list(cols.values())
        if isinstance(cols, str):
            cols = [cols]
        data[field] = list(cols)
    pk_columns = data["pk_columns"]

    if data.get("load_type") == "incremental" and not pk_columns:
        raise ValueError("pk_columns is required for incremental load")

    data["ingest_options"] = psycopg2.extras.Json(
        data.get("ingest_options", {}), dumps=lambda v: json.dumps(v, default=str)
    )

    if data.get("load_type") == "full" and not data["pk_columns"]:
        data["pk_columns"] = []

    q = """
    INSERT INTO mdf_app.bronze_config
      (group_id, raw_config_id, source_kind, catalog, schema_name, table_name,
       connection_id, load_type, is_stream, pk_columns,
       partition_cols, zorder_cols, watermark_col, scd_type, ingest_options,
       quarantine, is_enabled, created_by, updated_by)
    VALUES (%(group_id)s, %(raw_config_id)s, %(source_kind)s, %(catalog)s,
            %(schema_name)s, %(table_name)s,
            %(connection_id)s, %(load_type)s, %(is_stream)s, %(pk_columns)s,
            %(partition_cols)s, %(zorder_cols)s, %(watermark_col)s, %(scd_type)s,
            %(ingest_options)s, %(quarantine)s, %(is_enabled)s,
            %(user)s, %(user)s)
    RETURNING *;
    """
    conn = db or get_conn()
    with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**data, "user": "lake-forge-api"})
        row = cur.fetchone()
    return BronzeConfigOut(**dict(row))


def update_bronze(id: int, payload: BronzeConfigUpdate, db=None) -> BronzeConfigOut:
    """Partially update a table configuration."""

    fields = payload.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"

    allowed_lists = {"pk_columns", "partition_cols", "zorder_cols", "ingest_options"}
    invalid = [
        c
        for c, v in fields.items()
        if c not in allowed_lists and isinstance(v, (list, dict))
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
    for f in ["pk_columns", "partition_cols", "zorder_cols"]:
        if f in fields and isinstance(fields[f], str):
            fields[f] = [part.strip() for part in fields[f].split(",") if part.strip()]

    stmt, params = build_update_sql("mdf_app.bronze_config", fields)
    params.update({"id": id, "updated_by": user})

    conn = db or get_conn()
    with conn as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()

    return BronzeConfigOut(**dict(row))


def list_rules() -> list[DQRuleOut]:
    """List all data quality rules."""
    q = """
        SELECT
            dq.id,
            dq.bronze_config_id AS table_config_id,
            dq.rule_name,
            dq.rule_sql,
            dq.severity,
            dq.is_enabled,
            dq.updated_at,
            tc.catalog || '.' || tc.schema_name || '.' || tc.table_name AS fqtn
        FROM mdf_app.dq_rule dq
        JOIN mdf_app.bronze_config tc ON tc.id = dq.bronze_config_id
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
                (bronze_config_id, rule_name, rule_sql, severity, is_enabled, created_by, updated_by)
            VALUES (%(bronze_config_id)s, %(rule_name)s, %(rule_sql)s, %(severity)s, %(is_enabled)s, %(user)s, %(user)s)
            RETURNING *
        )
        SELECT
            i.id,
            i.bronze_config_id AS table_config_id,
            i.rule_name,
            i.rule_sql,
            i.severity,
            i.is_enabled,
            i.updated_at,
            tc.catalog || '.' || tc.schema_name || '.' || tc.table_name AS fqtn
        FROM inserted i
        JOIN mdf_app.bronze_config tc ON tc.id = i.bronze_config_id;
    """
    params = cfg.dict()
    params = {"bronze_config_id": params.pop("table_config_id"), **params}
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**params, "user": "lake-forge-api"})
        row = cur.fetchone()
    return DQRuleOut(**dict(row))


def update_rule(id: int, payload: DQRuleUpdate) -> DQRuleOut:
    """Partially update a DQ rule."""

    fields = payload.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"

    if "table_config_id" in fields:
        fields["bronze_config_id"] = fields.pop("table_config_id")

    stmt, params = build_update_sql("mdf_app.dq_rule", fields)
    params.update({"id": id, "updated_by": user})

    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
        if row:
            cur.execute(
                """
                SELECT catalog || '.' || schema_name || '.' || table_name AS fqtn
                FROM mdf_app.bronze_config
                WHERE id = %s;
                """,
                (row["bronze_config_id"],),
            )
            row["fqtn"] = cur.fetchone()["fqtn"]

        if row and "bronze_config_id" in row:
            row["table_config_id"] = row.pop("bronze_config_id")

    return DQRuleOut(**dict(row))


def delete_bronze(id: int, db=None) -> None:
    """Delete a bronze configuration by ID."""
    conn = db or get_conn()
    with conn as c, c.cursor() as cur:
        cur.execute("DELETE FROM mdf_app.bronze_config WHERE id = %s", (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Table not found")


def delete_rule(id: int) -> None:
    """Delete a DQ rule by ID."""
    with get_conn() as c, c.cursor() as cur:
        cur.execute("DELETE FROM mdf_app.dq_rule WHERE id = %s", (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not found")


def list_dq_suggestions() -> list[DQSuggestionOut]:
    q = """
    SELECT s.*, bc.catalog||'.'||bc.schema_name||'.'||bc.table_name AS table_name
      FROM mdf_app.dq_suggestion s
      JOIN mdf_app.bronze_config bc ON bc.id = s.table_config_id
     ORDER BY profiled_at DESC;
    """
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q)
        rows = cur.fetchall()
    return [DQSuggestionOut(**row) for row in rows]


def update_dq_suggestion(id: int, delta: DQSuggestionUpdate) -> DQSuggestionOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop("updated_by", None) or "system"
    stmt, params = build_update_sql("mdf_app.dq_suggestion", fields)
    params.update({"id": id, "updated_by": user})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Suggestion not found")
    return DQSuggestionOut(**row)


def bulk_update_dq_suggestions(ids: list[int], status: str) -> None:
    if status not in {"accepted", "rejected"}:
        raise ValueError("status must be 'accepted' or 'rejected'")
    with get_conn() as c, c.cursor() as cur:
        cur.execute(
            """
            UPDATE mdf_app.dq_suggestion
               SET suggestion_status = %s,
                   updated_at = now(),
                   updated_by = 'system'
             WHERE id = ANY(%s)
             RETURNING id;
            """,
            (status, ids),
        )
        rows = cur.fetchall()
        if len(rows) != len(ids):
            raise HTTPException(status_code=404, detail="Suggestion not found")


def implement_dq_suggestions(ids: list[int], user: str) -> list[int]:
    if not ids:
        return []
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, table_config_id, rule_name, rule_sql, severity, suggestion_status
                  FROM mdf_app.dq_suggestion
                 WHERE id = ANY(%s)
                 FOR UPDATE;
                """,
                (ids,),
            )
            rows = cur.fetchall()
            if len(rows) != len(ids):
                raise HTTPException(status_code=404, detail="Suggestion not found")
            for row in rows:
                if row["suggestion_status"] != "accepted":
                    raise HTTPException(status_code=409, detail="Suggestion not accepted")

            rule_ids: list[int] = []
            for row in rows:
                cur.execute(
                    """
                    INSERT INTO mdf_app.dq_rule
                        (bronze_config_id, rule_name, rule_sql, severity, is_enabled, created_by, updated_by)
                    VALUES (%s, %s, TRIM(%s), %s, true, %s, %s)
                    ON CONFLICT (bronze_config_id, rule_name)
                    DO UPDATE SET
                        rule_sql = EXCLUDED.rule_sql,
                        severity = EXCLUDED.severity,
                        updated_at = now(),
                        updated_by = EXCLUDED.updated_by
                    RETURNING id;
                    """,
                    (
                        row["table_config_id"],
                        row["rule_name"],
                        row["rule_sql"],
                        row["severity"],
                        user,
                        user,
                    ),
                )
                rule_id = cur.fetchone()["id"]
                rule_ids.append(rule_id)
                cur.execute(
                    """
                    UPDATE mdf_app.dq_suggestion
                       SET suggestion_status = 'implemented',
                           dq_rule_id = %s,
                           updated_at = now(),
                           updated_by = %s
                     WHERE id = %s;
                    """,
                    (rule_id, user, row["id"]),
                )
        conn.commit()
    return rule_ids


def list_groups() -> list[GroupOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app."group" ORDER BY id;')
        rows = cur.fetchall()
    return [GroupOut(**row) for row in rows]


def create_group(payload: GroupIn) -> GroupOut:
    q = (
        "INSERT INTO mdf_app.\"group\" (name, description, is_enabled, is_raw, is_bronze, schedule_id, compute_profile_id) "
        "VALUES (%(name)s, %(description)s, %(is_enabled)s, %(is_raw)s, %(is_bronze)s, %(schedule_id)s, %(compute_profile_id)s) RETURNING *;"
    )
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, payload.dict())
        row = cur.fetchone()
    return GroupOut(**row)


def update_group(id: int, delta: GroupUpdate) -> GroupOut:
    fields = delta.dict(exclude_none=True)
    stmt, params = build_update_sql('mdf_app."group"', fields, include_user=False)
    params.update({"id": id})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return GroupOut(**row)


def delete_group(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('SELECT 1 FROM mdf_app.bronze_config WHERE group_id = %s LIMIT 1', (id,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail='Group still referenced')
        cur.execute('DELETE FROM mdf_app."group" WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Group not found')


def list_compute_profiles() -> list[ComputeProfileOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app.compute_profile ORDER BY id;')
        rows = cur.fetchall()
    return [ComputeProfileOut(**row) for row in rows]


def create_compute_profile(p: ComputeProfileIn) -> ComputeProfileOut:
    data = p.dict()
    data['cluster_json'] = psycopg2.extras.Json(data['cluster_json'], dumps=lambda v: json.dumps(v, default=str))
    data['default_libraries'] = psycopg2.extras.Json(data['default_libraries'], dumps=lambda v: json.dumps(v, default=str))
    q = (
        'INSERT INTO mdf_app.compute_profile '
        '(name, description, policy_id, cluster_json, default_libraries, is_default, created_by, updated_by) '
        'VALUES (%(name)s, %(description)s, %(policy_id)s, %(cluster_json)s, %(default_libraries)s, %(is_default)s, %(user)s, %(user)s) '
        'RETURNING *;'
    )
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**data, 'user': 'lake-forge-api'})
        row = cur.fetchone()
    return ComputeProfileOut(**row)


def update_compute_profile(id: int, delta: ComputeProfileUpdate) -> ComputeProfileOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop('updated_by', None) or 'system'
    if 'cluster_json' in fields:
        fields['cluster_json'] = psycopg2.extras.Json(fields['cluster_json'], dumps=lambda v: json.dumps(v, default=str))
    if 'default_libraries' in fields:
        fields['default_libraries'] = psycopg2.extras.Json(fields['default_libraries'], dumps=lambda v: json.dumps(v, default=str))
    stmt, params = build_update_sql('mdf_app.compute_profile', fields)
    params.update({'id': id, 'updated_by': user})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return ComputeProfileOut(**row)


def delete_compute_profile(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('DELETE FROM mdf_app.compute_profile WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Compute profile not found')


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


def list_connections() -> list[ConnectionOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app.connection ORDER BY id;')
        rows = cur.fetchall()
    return [ConnectionOut(**row) for row in rows]


def create_connection(p: ConnectionIn) -> ConnectionOut:
    data = p.dict()
    if 'options' in data:
        data['options'] = psycopg2.extras.Json(data['options'], dumps=lambda v: json.dumps(v, default=str))
    q = (
        'INSERT INTO mdf_app.connection '
        '(name, conn_type, driver_class, endpoint_url, secret_scope, secret_key, options, created_by, updated_by) '
        'VALUES (%(name)s, %(conn_type)s, %(driver_class)s, %(endpoint_url)s, %(secret_scope)s, %(secret_key)s, %(options)s, %(user)s, %(user)s) '
        'RETURNING *;'
    )
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, {**data, 'user': 'lake-forge-api'})
        row = cur.fetchone()
    return ConnectionOut(**row)


def update_connection(id: int, delta: ConnectionUpdate) -> ConnectionOut:
    fields = delta.dict(exclude_none=True)
    user = fields.pop('updated_by', None) or 'system'
    if 'options' in fields:
        fields['options'] = psycopg2.extras.Json(fields['options'], dumps=lambda v: json.dumps(v, default=str))
    stmt, params = build_update_sql('mdf_app.connection', fields)
    params.update({'id': id, 'updated_by': user})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return ConnectionOut(**row)


def delete_connection(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('SELECT 1 FROM mdf_app.raw_config WHERE connection_id = %s LIMIT 1', (id,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail='Connection still referenced')
        cur.execute('DELETE FROM mdf_app.connection WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Connection not found')


def list_source_systems() -> list[SourceSystemOut]:
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute('SELECT * FROM mdf_app.source_system ORDER BY id;')
        rows = cur.fetchall()
    return [SourceSystemOut(**row) for row in rows]


def create_source_system(p: SourceSystemIn) -> SourceSystemOut:
    q = (
        'INSERT INTO mdf_app.source_system (name, server, description, type) '
        'VALUES (%(name)s, %(server)s, %(description)s, %(type)s) '
        'RETURNING *;'
    )
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, p.dict())
        row = cur.fetchone()
    return SourceSystemOut(**row)


def update_source_system(id: int, delta: SourceSystemUpdate) -> SourceSystemOut:
    fields = delta.dict(exclude_none=True)
    stmt, params = build_update_sql('mdf_app.source_system', fields, include_user=False)
    params.update({'id': id})
    with get_conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(stmt, params)
        row = cur.fetchone()
    return SourceSystemOut(**row)


def delete_source_system(id: int) -> None:
    with get_conn() as c, c.cursor() as cur:
        cur.execute('SELECT 1 FROM mdf_app.raw_config WHERE source_system_id = %s LIMIT 1', (id,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail='Source system still referenced')
        cur.execute('DELETE FROM mdf_app.source_system WHERE id = %s', (id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Source system not found')
