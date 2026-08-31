import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import email, planner
from app.security import require_internal_key

app = FastAPI(title="langgraph-agent")

# Next.js dev server default origin, plus the deployed frontend origin(s) via
# FRONTEND_ORIGINS (comma-separated). This is defense in depth only -- the
# backend is only ever called server-side by Next.js, never from a browser.
extra_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", *extra_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every route below requires the X-Internal-Api-Key header (see app/security.py)
# -- primary defense is deploying this service with no public URL at all.
app.include_router(email.router, dependencies=[Depends(require_internal_key)])
app.include_router(planner.router, dependencies=[Depends(require_internal_key)])


@app.get("/health")
def health():
    return {"status": "ok"}
