from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import email

app = FastAPI(title="langgraph-agent")

# Next.js dev server default origin. Add your deployed frontend origin(s) too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(email.router)


@app.get("/health")
def health():
    return {"status": "ok"}
