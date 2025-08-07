# Lake‑Forge

> **Metadata‑driven Lakehouse ingestion & orchestration framework**

LakeForge is a new metadata driven framework built on a Next.js 15 frontend, FastAPI backend, a PostgreSQL database and an ingestion/orchestration framework of Databricks notebooks / Jobs to provide an end‑to‑end, low‑code experience for managing metadata configuration on Databricks + Lakebase.

---

## ✨ Key features

| Area                         | Highlights                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Metadata‑first**           | All ingestion logic lives in the `mdf_app.*` PostgreSQL schema – change metadata, redeploy nothing.                     |
| **UI editing**               | Next.js grid editors for Raw/Bronze configs, DQ rules, groups & schedules – no SQL required.                            |
| **Raw → Bronze pipeline**    | Notebooks `SourceToRaw.py`, `RawToBronze.py` & `RawToBronze‑DLT.py` put data into managed volumes & Delta tables.       |
| **Server‑cost optimisation** | *SyncJobs* notebook creates **just‑in‑time Databricks Jobs** from your `schedule` rows and pauses them when not needed. |
| **Dynamic orchestration**    | *OrchestrateBatch* spins up per‑group Jobs at run‑time and executes table configs in parallel.                          |
| **Comprehensive logging**    | `batch_run`, `table_run`, `step_run`, `dq_run` tables capture every run with row counts, metrics and status.            |

---

## 🏗️ Architecture overview

```text
┌──────────────┐    REST/WS   ┌──────────────┐        ┌────────────┐
│ Next.js 15   │ ◀──────────▶ │ FastAPI      │  Lakebase views  │  
│ (frontend)   │              │ (backend)    │────────▶│  vw_*      │
└──────────────┘              └──────────────┘        └────────────┘
       ▲                              │                      ▲
       │     Databricks Apps (container)│JDBC/OAuth           │
       │                              ▼                      │
       │                      ┌────────────────┐             │
       │  Jobs API            │ Databricks     │ Delta &     │
       └─────────────────────▶│ Jobs &         │ Volume I/O  │
                              │ Notebooks      │             │
                              └────────────────┘             │
                                                          PostgreSQL
```

---

## 📁 Repository layout (top‑level)

| Path                       | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `apps/backend`             | FastAPI service (`main.py`) + CRUD routes                           |
| `apps/frontend`            | Next.js 15 UI (React 18, shadcn/ui, Tailwind 4)                     |
| `DBX_Shared/Common/Python` | Re‑usable Lake‑Forge helper library (JDBC, extractors, transforms…) |
| `DBX_Shared/Orchestration` | **SyncJobs**, **OrchestrateBatch**, **RunGroup** notebooks          |
| `DBX_Shared/Raw/Python`    | Data‑ingestion notebooks (Source→Raw, Raw→Bronze)                   |
| `sql/`                     | Lakebase bootstrap DDL & view definitions                           |

---

## 🚀 Getting started

### Prerequisites

- **Databricks CLI** ≥ 0.258.0 (`pip install databricks-cli --upgrade`)
- **Python 3.11** (tested on 3.11.9)
- **Node 22** for the frontend
- Access to a **Databricks workspace** with Lakebase enabled

### 1 · Clone & install

```bash
# clone
git clone https://github.com/your‑org/lake-forge.git && cd lake-forge

# Python virtual‑env
python -m venv .venv
source .venv/bin/activate
pip install uv && uv pip install -r requirements.txt

# Node deps (frontend)
cd apps/frontend && pnpm install   # or npm / yarn
```

### 2 · Local run (FastAPI + Next.js)
If you'd like to run the backend and frontend locally, you can use the following commands. You'll want to do this if you'd like to quickly test live changes.
```bash
# terminal ① – backend
export DATABRICKS_SERVER_HOSTNAME=<workspace-url>
export DATABRICKS_TOKEN=<personal-access-token>
uvicorn --app-dir apps/backend main:app --reload --port 9000

# terminal ② – frontend
cd apps/frontend
pnpm dev   # http://localhost:4000
```

### 3 · Local Databricks App (full stack)
Run the following to simulate a Databricks App environment locally. This builds the frontend and runs it in a Docker container that mimics the Apps runtime. 
```bash
export DATABRICKS_SERVER_HOSTNAME=<workspace-url>
export DATABRICKS_TOKEN=<personal-access-token>

databricks apps run-local --prepare-environment
```

The command builds the frontend, sets up a Docker container mimicking the Apps runtime and mounts it on `http://127.0.0.1:8000`.If it works here, it's likely good to deploy to Databricks.

### 4 · Deploy to Databricks

```bash
databricks bundle deploy --target dev   # uses databricks.yml
```

A new App appears under *Workspace ▶ Apps*.

### 5 · Notes on Build Process 
When building our Databricks App, we run scripts/build_frontend.sh. This builds our Next.js frontend and copies the output to the `apps/backend/static` directory. This is where the FastAPI backend serves the static files from. 

---

## 🔧 Environment variables

| Name                         | Local dev | Apps runtime | Description                                |
| ---------------------------- | --------- | ------------ | ------------------------------------------ |
| `DATABRICKS_SERVER_HOSTNAME` | ✅         | –            | Workspace URL                              |
| `DATABRICKS_TOKEN`           | ✅ (PAT)   | –            | API token for local dev                    |
| `PGAPPNAME`                  | ✅         | via `env:`   | Lakebase instance name (e.g. `lake-forge`) |
| `LAKEBASE_DNS`               | optional  | optional     | Override Lakebase DNS lookup               |
| `PGUSER`                     | optional  | via `env:`   | DB user / service principal                |
| `NODE_ENV`                   | –         | auto         | Frontend build mode                        |

Secrets can be injected in `databricks.yml` using `{{secrets/<scope>/<key>}}`.

---

## ⏱️ Orchestration flow

1. **Schedules** (`mdf_app.schedule`) define either *month_days* or *weekdays* and the *times*.
2. Notebook **SyncJobs.ipynb** converts each schedule into a **Databricks Job** with a Quartz cron trigger.
3. At run‑time the generated Schedule Job executes **OrchestrateBatch** with `schedule_id` parameter.
4. **OrchestrateBatch** looks up *active* groups tied to that schedule and spawns a per‑group Job via the Jobs API.
5. The group Job runs **RunGroup**, which loops (or parallel‑maps) over all enabled Raw/Bronze table configs.
6. Ingestion notebooks write data & log progress into `batch_run`, `table_run`, `step_run` etc.

> 🪄 Because Jobs are created/paused automatically, **no cluster is left idling** when there is nothing to do.

---

## 🧪 Testing

```bash
# Backend unit tests (pytest)
pytest -q tests/

# Frontend unit tests (vitest)
cd apps/frontend && pnpm test
```

---

## 🛠️ Useful commands

| Task                     | Command                                  |
| ------------------------ | ---------------------------------------- |
| Build frontend only      | `npm run build:frontend`                 |
| Run UI lint              | `pnpm lint`                              |
| Update packages          | `pnpm up`                                |
| Format SQL in `sql/`     | `sqlfluff fix`                           |
| Deploy production bundle | `databricks bundle deploy --target prod` |

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss your ideas or report bugs.

1. Fork & branch from `main`.
2. Follow the coding standards (`ruff`, `black`, ESLint).
3. Add tests for new features.
4. Create a PR and fill out the template.

---

## 📄 License

© 2025 Technology Catalyst — MIT License. See `LICENSE` for details.

---

## 📬 Support / Contact

*Project lead* → **Patrick Kelly** · [patrick@techcat.ai](mailto\:patrick@techcat.ai)

