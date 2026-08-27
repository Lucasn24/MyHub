# backend

Email pipeline agents served behind a FastAPI endpoint, for the `myhub` Next.js frontend (one directory up) to call.

## Structure

```
app/
  api/
    email.py   # POST /email/categorize, /email/extract-tasks, /email/extract-events
  email_pipeline/
    schemas.py   # EmailInput, EmailCategory, CategoryResult, ExtractedTask, DetectedEvent, ...
    prompts.py   # system prompts + prompt builders, one pair per agent
    agents.py    # categorize_email(), extract_tasks(), detect_events()
    store.py     # all Supabase reads/writes for the emails/tasks/events tables
  config.py    # getLLM() — Gemini Flash client; get_supabase_client()
  main.py      # FastAPI app assembly, includes the routers above
supabase/
  schema.sql   # emails/tasks/events tables — paste into the Supabase SQL Editor and run
```

## Setup

```
cd myhub/backend
python -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Env vars live in one shared file at the `myhub` root: copy `myhub/.env_sample` to `myhub/.env` and fill in `GOOGLE_API_KEY` (free at https://aistudio.google.com/apikey) and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (Supabase project Settings > API). `app/config.py` finds it automatically (python-dotenv walks up from `app/` to `myhub/`) — no separate backend `.env` needed.

Before using any endpoint that persists data, paste `supabase/schema.sql` into the Supabase dashboard's SQL Editor and run it (no DB password needed there, only your dashboard login) — it creates the `emails`, `tasks`, and `events` tables.

## Run the API

```
# macOS/Linux
.venv/bin/uvicorn app.main:app --reload --port 8000

# Windows
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

All three routes below take the same base body — `{"subject": "...", "sender": "...", "snippet": "...", "body": "optional full text", "received_at": "optional ISO datetime", "id": "optional Gmail message id"}` — `id` is only needed if you want the result persisted to Supabase; omit it to just get a result back.

- `GET /health` — liveness check
- `POST /email/categorize` — returns `{"category": "...", "id": "..."}`. Category is one of `urgent`/`action_required`/`meeting`/`acknowledgment`/`newsletter`/`promotional`/`receipt`/`personal`/`social`/`spam`/`other` (see `app/email_pipeline/schemas.py`).
- `POST /email/extract-tasks` — returns `{"tasks": [{"description", "due_date", "due_date_text", "addressed_to_user"}, ...], "id": "..."}`. `due_date` is only resolved when `received_at` is given and the email states a resolvable relative date; otherwise the original phrase lands in `due_date_text`.
- `POST /email/extract-events` — returns `{"events": [{"title", "status", "location", "attendees", "candidate_times": [{"start", "end", "time_text"}, ...]}, ...], "id": "..."}`. `candidate_times` has one entry per proposed time slot (more than one if the email offers options).

All three endpoints are independent — calling any of them first (with an `id`) creates/updates the base `emails` row, so there's no required call order.

CORS is currently open to `http://localhost:3000` (the Next.js dev server) in `app/main.py` — add your deployed frontend origin there when you deploy.
