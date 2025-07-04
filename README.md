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

# CURRENT LIMITATIONS
- There was an issue with adding new dependencies to the requirements files, regarding a "-" in the requirements.txt file. This occurs in dbx cli 0.252.0 or lower.
  - Upgrading databricks cli version to 0.258.0 resolves this issue.