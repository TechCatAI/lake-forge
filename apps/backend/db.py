# backend/lakeforge/db.py
from databricks import sql
import os

def get_conn():
    return sql.connect(
        server_hostname=os.getenv("DATABRICKS_SERVER_HOSTNAME"),
        http_path=os.getenv("DATABRICKS_WAREHOUSE_HTTP_PATH"),
        access_token=os.getenv("DATABRICKS_TOKEN"),
    )
