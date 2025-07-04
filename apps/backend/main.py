# apps/backend/main.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from db import get_conn          # relative import still works

app = FastAPI(title="Lake-Forge API")

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


