# apps/backend/main.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes import (
    raw,
    bronze,
    rules,
    groups,
    schedules,
    source_systems,
    connections,
    compute_profiles,
    dq_suggestions,
)

app = FastAPI(title="Lake-Forge API")

# CORS (Next.js will call from same origin in prod; allow localhost dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.databricksusercontent.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(raw.router)
app.include_router(bronze.router)
app.include_router(rules.router)
app.include_router(dq_suggestions.router)
app.include_router(groups.router)
app.include_router(schedules.router)
app.include_router(source_systems.router)
app.include_router(connections.router)
app.include_router(compute_profiles.router)


# Simple health check
@app.get("/api/health")
def health():
    return {"status": "ok"}


# ────────────────────────
# STATIC UI (placeholder)
# ────────────────────────
# After each Next.js build you’ll copy the generated `out/` folder
# into backend/lakeforge/static/.  Then FastAPI will serve it.
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
