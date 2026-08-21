# backend

Email pipeline agents served behind a FastAPI endpoint, for the `myhub` Next.js frontend (one directory up) to call.

## Structure

```
app/
  api/
    email.py   # POST /email/categorize
  email_pipeline/
    schemas.py   # EmailInput, EmailCategory, CategoryResult
    prompts.py   # system prompt + prompt builder
    agents.py    # categorize_email()
  config.py    # getLLM() — Gemini Flash client
  main.py      # FastAPI app assembly, includes the routers above
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
- `POST /email/categorize` — body `{"subject": "...", "sender": "...", "snippet": "...", "body": "optional full text", "id": "optional passthrough"}`, returns `{"category": "...", "confidence": 0-1, "reason": "...", "id": "..."}`. Category is one of `urgent`/`action_required`/`newsletter`/`promotional`/`receipt`/`personal`/`social`/`spam`/`other` (see `app/email_pipeline/schemas.py`).

CORS is currently open to `http://localhost:3000` (the Next.js dev server) in `app/main.py` — add your deployed frontend origin there when you deploy.
