# backend

Email pipeline agents and the Tasks page's planner CRUD, both served behind a FastAPI app, for the `myhub` Next.js frontend (one directory up) to call.

## Structure

```
app/
  api/
    email.py     # POST /email/categorize, /email/extract-tasks, /email/extract-events, ...
    planner.py   # CRUD for the Tasks page: GET /planner/state, /planner/tasks, /planner/blocks, ...
  email_pipeline/
    schemas.py   # EmailInput, EmailCategory, CategoryResult, ExtractedTask, DetectedEvent, ...
    prompts.py   # system prompts + prompt builders, one pair per agent
    agents.py    # categorize_email(), extract_tasks(), detect_events()
    store.py     # all Supabase reads/writes for the emails/tasks/events tables
  planner_store.py   # all Supabase reads/writes for the planner_* tables (no LLM involved)
  config.py    # getLLM() — Claude Haiku client; get_supabase_client()
  main.py      # FastAPI app assembly, includes the routers above
  security.py  # require_internal_key() — shared-secret dependency guarding every route below /health
supabase/
  schema.sql   # emails/tasks/events/expenses + google_tokens + planner_* tables — paste into the Supabase SQL Editor and run
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

Env vars live in one shared file at the `myhub` root: copy `myhub/.env_sample` to `myhub/.env` and fill in `ANTHROPIC_API_KEY` (get one at https://console.anthropic.com/settings/keys) and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (Supabase project Settings > API). `app/config.py` finds it automatically (python-dotenv walks up from `app/` to `myhub/`) — no separate backend `.env` needed.

Before using any endpoint that persists data, paste `supabase/schema.sql` into the Supabase dashboard's SQL Editor and run it (no DB password needed there, only your dashboard login) — it creates the `emails`, `tasks`, `events`, `expenses`, `google_tokens`, and `planner_*` tables.

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

### Planner (Tasks page)

Plain CRUD over the `planner_tags`/`planner_tasks`/`planner_blocks` tables — no LLM involved. Snake_case field names match the Postgres columns exactly; the frontend maps them to/from its camelCase `Task`/`ScheduleBlock`/`Tag` types in `app/tasks/serialization.ts`. `planner_tags` is the single categorization/goal-tracking entity — tasks and events (blocks) each optionally reference one via `tag_id`.

- `GET /planner/state` — returns `{"tasks": [...], "blocks": [...], "tags": [...]}` in one call.
- `POST/PATCH/DELETE /planner/tasks[/{id}]`, same shape for `/planner/blocks` and `/planner/tags`.
- Create requests take a client-supplied `id` (the frontend already generates one with `crypto.randomUUID()` for optimistic UI) rather than a server-generated one.
- Tasks are never scheduled on the timetable themselves — `planner_tasks.event_id` optionally links a task to an existing event (`planner_blocks` row) for organization only. Deleting that event clears the link (`on delete set null`); deleting a tag clears `tag_id` on anything tagged with it, same way.

CORS is open to `http://localhost:3000` (the Next.js dev server) plus any origins listed in `FRONTEND_ORIGINS` (comma-separated) in `app/main.py` — defense in depth only, since this API is only ever meant to be called server-side by the Next.js app, never from a browser. The real defense is that it has **no public URL at all** in production (see below); every route except `/health` also requires an `X-Internal-Api-Key` header matching `INTERNAL_API_KEY` (see `app/security.py`) as a second layer in case that ever gets misconfigured.

## Deploy (Railway)

Both `myhub` (this repo's root, the Next.js app) and `myhub/backend` deploy as two services **in the same Railway project**, so they share Railway's private network and the backend never needs a public URL. The repo root has its own `railway.toml` for the frontend service; this directory has the backend's: `railway.toml` (start command + healthcheck), `Procfile` (fallback/portable start command), `.python-version` (pins the runtime).

1. In one Railway project, create two services from this GitHub repo (`Lucasn24/MyHub` — note the repo root is one level above `myhub/`, so both paths below need that prefix):
   - **backend**: Root Directory `myhub/backend` (Settings → Source).
   - **frontend**: Root Directory `myhub` (Settings → Source).
2. Backend env vars: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (optional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_KEY` (generate with `openssl rand -base64 32`), `FRONTEND_ORIGINS` (the frontend service's public domain, e.g. `https://myhub-production.up.railway.app`).
3. Frontend env vars: everything in `.env_sample`, plus `INTERNAL_API_KEY` (same value as the backend's) and `PYTHON_API_URL` set to the backend's **private** domain — Railway gives every service one automatically at `<service-name>.railway.internal`, reachable only from other services in the same project, over HTTP on the backend's `$PORT` (e.g. `http://backend.railway.internal:8000`; check Settings → Networking on the backend service for its exact private hostname).
4. Only the frontend service needs a public domain (Settings → Networking → Generate Domain). Leave the backend without one — that's what makes it unreachable from outside Railway.
5. Confirm `GET http://<backend-private-domain>/health` returns `{"status": "ok"}` from inside the project (e.g. via `railway run` or a Railway shell), and that a request to the backend's other routes from outside the project has no route to even reach it.
