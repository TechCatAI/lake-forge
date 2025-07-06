import os, uuid, psycopg2
from databricks.sdk import WorkspaceClient
from dotenv import load_dotenv
load_dotenv()

# read once at import
INSTANCE  = os.getenv("LAKEBASE_INSTANCE")
DB_NAME   = os.getenv("LAKEBASE_DB")
SCHEMA    = os.getenv("LAKEBASE_SCHEMA")
DB_USER   = os.getenv("LAKEBASE_USER")
# DBX_HOST  = os.getenv("DATABRICKS_HOST")
# DBX_PAT   = os.getenv("DATABRICKS_TOKEN")

ws = WorkspaceClient()                          # uses workspace’s PAT
instance = ws.database.get_database_instance(name=INSTANCE)

def fresh_token():
    cred = ws.database.generate_database_credential(
        request_id=str(uuid.uuid4()),
        instance_names=[INSTANCE]
    )
    return cred.token

def get_conn():
    """Return a *new* psycopg2 connection to Lakebase."""
    return psycopg2.connect(
        host     = instance.read_write_dns,
        port     = 5432,
        dbname   = DB_NAME,
        user     = DB_USER,
        password = fresh_token(),          # short-lived OAuth
        sslmode  = "require"
    )



# Old code to connect to sql warehouse (Databricks)
# from databricks import sql
# import os

# def get_conn():
#     return sql.connect(
#         server_hostname=os.getenv("DATABRICKS_SERVER_HOSTNAME"),
#         http_path=os.getenv("DATABRICKS_WAREHOUSE_HTTP_PATH"),
#         access_token=os.getenv("DATABRICKS_TOKEN"),
#     )
