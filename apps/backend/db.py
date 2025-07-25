import os
import uuid
import psycopg2
from functools import lru_cache
from databricks.sdk import WorkspaceClient
from databricks.sdk.config import Config
from dotenv import load_dotenv

load_dotenv()

# Lakebase connection settings
INSTANCE = os.getenv("PGAPPNAME")
HOST = os.getenv("PGHOST")
DB_NAME = os.getenv("PGDATABASE")
SCHEMA = os.getenv("PG_SCHEMA")
DB_USER = os.getenv("PGUSER")

# VERSION 2:
@lru_cache(maxsize=1)
def ws() -> WorkspaceClient:
    """
    * In Databricks Apps: OAuth M2M env vars are injected -> use oauth-m2m.
    * In local dev: PAT env vars are set -> use pat.
    The client is cached on first use.
    """
    cid = os.getenv("DATABRICKS_CLIENT_ID")
    csec = os.getenv("DATABRICKS_CLIENT_SECRET")
    pat = os.getenv("DATABRICKS_TOKEN")
    host = os.environ["DATABRICKS_HOST"]

    if cid and csec:  # ← Deployed Apps path (OAuth M2M)
        cfg = Config(
            host=host,
            auth_type="oauth-m2m",
            client_id=cid,
            client_secret=csec,
        )
    elif pat:  # ← local dev path (PAT)
        cfg = Config(
            host=host,
            token=pat,
            auth_type="pat",
        )
        DB_USER = os.getenv("PGUSER_LOCAL")
    else:
        raise RuntimeError(
            "No OAuth client vars (CLIENT_ID/SECRET) and no PAT found. "
            "Set a PAT locally or run inside Databricks Apps."
        )
    return WorkspaceClient(config=cfg)


# ── Resolve Lakebase DNS once ─────────────────────────────────────
@lru_cache(maxsize=1)
def lakebase_dns() -> str:
    """
    • In Apps    → always ask the SDK for read_write_dns
    • Locally    → honour LAKEBASE_DNS override if the user set it
    """
    running_in_app = bool(os.getenv("DATABRICKS_APP_NAME"))

    if not running_in_app:
        if dns := os.getenv("LAKEBASE_DNS"):
            return dns  # developer override

    # default: look it up via Lakebase API
    try:
        inst = ws().database.get_database_instance(name=INSTANCE)
        return inst.read_write_dns  # e.g. lakebase-prod-rw...
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"Cannot resolve Lakebase DNS: {e}") from e


def fresh_token():
    cred = ws().database.generate_database_credential(
        request_id=str(uuid.uuid4()), instance_names=[INSTANCE]
    )
    return cred.token


def get_conn():
    """Return a *new* psycopg2 connection to Lakebase."""
    return psycopg2.connect(
        host=lakebase_dns(),
        port=5432,
        dbname=DB_NAME,
        user=DB_USER,
        password=fresh_token(),  # short-lived OAuth
        sslmode="require",
    )


# Old code to connect to sql warehouse (Databricks)
# from databricks import sql
# import os, functools

# @functools.lru_cache
# def _sql_conn():
#     return sql.connect(
#         server_hostname = os.environ["DATABRICKS_HOST"],
#         http_path       = os.environ["DATABRICKS_WAREHOUSE_HTTP_PATH"],
#         auth_type       = "oauth-m2m",        # Apps runtime creds
#         client_id       = os.environ["DATABRICKS_CLIENT_ID"],
#         client_secret   = os.environ["DATABRICKS_CLIENT_SECRET"],
#     )

# def get_cursor():
#     return _sql_conn().cursor()
