# Lake Forge
This project is a Lakehouse application that integrates a FastAPI backend with a Next.js frontend.

## Required Setup
- databricks-cli version 0.258.0 or higher
- Python 3.11.9

## HOW TO RUN

To run the FASTAPI server, you can use the following command from root of the project:
```bash
uvicorn main:app --reload --app-dir apps/backend --port 9000
```

To run the Databricks App locally, you can use the following command:
```bash
export DATABRICKS_SERVER_HOSTNAME=adb-1654813071808666.6.azuredatabricks.net DATABRICKS_TOKEN=<YOUR_TOKEN>
databricks apps run-local --prepare-environment
```

An alternate method to separate two app.yaml files (one local, one cloud) consider creating two app.cloud.yaml and app.local.yaml files, and then use the `--app-yaml` flag to specify which one to use when running the app locally or in the cloud.
```bash
databricks apps run-local --app-yaml app.local.yaml --prepare-environment
```

When running this initial build, and you encounter an error related to the `requirements.txt` file, you can try the following steps:
1. Deactivate any existing virtual environment you're in
2. Remove the existing `.venv` directory if it exists
3. Create a new virtual environment
4. Activate the new virtual environment
5. Install the required packages using `uv` to ensure compatibility
6. Retry running the app again
```bash
# If .venv exists from the previous run-local attempt, wipe it:
rm -rf .venv

# Create a fresh virtual-env (mimic what run-local does)
python -m venv .venv
source .venv/bin/activate

# Install using uv directly
pip install uv          # uv is tiny
uv pip install -r requirements.txt
```

## HOW TO DEPLOY
To deploy the app to Databricks, you can use the following command:
```bash
npm run build:frontend
databricks bundle deploy --target dev
```
This command will build the frontend and deploy the app to the `dev` environment on Databricks.

## NOTE ON AUTHENTICATION
The app, when deployed locally, relies on the `DATABRICKS_SERVER_HOSTNAME` and `DATABRICKS_TOKEN` environment variables for authentication. Ensure these are set correctly in your environment before running the app.
When deployed to Databricks, the app will use Oauth authentication. Logic for this is handled in teh `db.py` file, where if the `DATABRICKS_SERVER_HOSTNAME` and `DATABRICKS_TOKEN` environment variables are not set, it will use the Databricks Oauth flow to authenticate users.

### Database Connection setup


### Table Config Editing
Changes made in the Table Config grid are now kept locally until you click
**Save changes**. Edit any cell with a single click, then use the button in the
header to persist all pending updates at once.


# CURRENT LIMITATIONS ENCOUNTERED
- I encountered an issue where we can connect to postgres through notebooks, but not from a databricks app. Clusters and notebooks live inside the workspace VNet and can hit thenative Postgres port 5432. 
  Lakehouse Apps run in a locked-down serverless network where only HTTPS/443 is open. The serverless egress policy blocks communication to Postgres. At the time of writing (2025-07-05), there is no "native resource type" in the Databricks app configuration that allows you to connect to Postgres Lakebase resource directly.

## Environment -- What happens?
- Local dev:	        You hit the public DNS entry → Azure LB → Lakebase. No egress policy blocks you, and you’re using a PAT (or a manually generated credential) that the instance accepts, so the connection succeeds.
- Databricks Notebook:	Same as local dev; notebooks run on Workspace compute where the workspace VNet already trusts Lakebase.
- Databricks App:	    The container runs in a locked-down serverless subnet. Until you attach a Lakebase resource to the App, outbound TCP packets to the Lakebase private IP are dropped/reset by the App firewall.
  - Even after you attach the resource, if you still try to connect with a PAT or an expired OAuth token (you generated it at module-import time), Lakebase drops the TLS session. Both cases surface to psycopg2 as server closed the connection unexpectedly.
- There was an issue with adding new dependencies to the requirements files, regarding a "-" in the requirements.txt file. This occurs in dbx cli 0.252.0 or lower.
  - Upgrading databricks cli version to 0.258.0 resolves this issue.