# backend

LangGraph agent served behind a FastAPI endpoint, for the `myhub` Next.js frontend (one directory up) to call.

## Structure

```
app/
  config.py  # getLLM() — Gemini Flash client
  graph.py   # LangGraph graph (nodes, edges, checkpointer)
  main.py    # FastAPI app exposing the graph over HTTP
```

## Setup

```
cd myhub/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Env vars live in one shared file at the `myhub` root: copy `myhub/.env_sample` to `myhub/.env` and fill in `GOOGLE_API_KEY` (free at https://aistudio.google.com/apikey). `app/config.py` finds it automatically (python-dotenv walks up from `app/` to `myhub/`) — no separate backend `.env` needed.

## Run the API

```
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

- `GET /health` — liveness check
- `POST /chat` — body `{"message": "hi", "thread_id": "optional-existing-thread"}`, returns `{"reply": "...", "thread_id": "..."}`. Omit `thread_id` on the first call and reuse the one returned to keep conversation history (kept in-memory per server process; swap `MemorySaver` in `app/graph.py` for a persistent checkpointer before deploying).

CORS is currently open to `http://localhost:3000` (the Next.js dev server) in `app/main.py` — add your deployed frontend origin there when you deploy.

## Run the graph directly (no API)

```
.venv\Scripts\python.exe -m app.graph
```

Build on `builder` in `app/graph.py` to add more nodes/edges.
