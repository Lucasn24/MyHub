from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.email_pipeline.agents import categorize_email, detect_events, extract_tasks
from app.email_pipeline.graph import run_email_pipeline
from app.email_pipeline.schemas import CategoryResult, DetectedEvent, EmailInput, ExtractedTask
from app.email_pipeline.store import (
    confirm_event,
    confirm_task,
    delete_email,
    list_inbox_emails,
    list_known_message_ids,
    replace_events,
    replace_tasks,
    set_email_category,
    upsert_email_base,
)

router = APIRouter(prefix="/email", tags=["email"])


class EmailRequest(EmailInput):
    id: str | None = None


class CategorizeEmailResponse(CategoryResult):
    id: str | None = None


class TaskExtractionResponse(BaseModel):
    id: str | None = None
    tasks: list[ExtractedTask]


class EventDetectionResponse(BaseModel):
    id: str | None = None
    events: list[DetectedEvent]


class ProcessEmailResponse(CategoryResult):
    id: str | None = None
    tasks: list[ExtractedTask]
    events: list[DetectedEvent]


class ConfirmTaskRequest(BaseModel):
    description: str
    due_date: date | None = None
    due_date_text: str | None = None


class ConfirmEventRequest(BaseModel):
    title: str
    status: Literal["proposed", "confirmed", "rescheduled", "cancelled"]
    location: str | None = None
    start: datetime | None = None
    end: datetime | None = None


@router.post("/categorize", response_model=CategorizeEmailResponse)
def categorize(req: EmailRequest):
    email = EmailInput(**req.model_dump(exclude={"id"}))
    result = categorize_email(email)
    if req.id:
        upsert_email_base(req.id, email)
        set_email_category(req.id, result.category.value)
    return CategorizeEmailResponse(id=req.id, category=result.category)


@router.post("/extract-tasks", response_model=TaskExtractionResponse)
def extract_tasks_route(req: EmailRequest):
    email = EmailInput(**req.model_dump(exclude={"id"}))
    tasks = extract_tasks(email)
    if req.id:
        upsert_email_base(req.id, email)
        replace_tasks(req.id, tasks)
    return TaskExtractionResponse(id=req.id, tasks=tasks)


@router.post("/extract-events", response_model=EventDetectionResponse)
def extract_events_route(req: EmailRequest):
    email = EmailInput(**req.model_dump(exclude={"id"}))
    events = detect_events(email)
    if req.id:
        upsert_email_base(req.id, email)
        replace_events(req.id, events)
    return EventDetectionResponse(id=req.id, events=events)


@router.post("/process", response_model=ProcessEmailResponse)
def process(req: EmailRequest):
    """Run the full langgraph pipeline: categorize, then route to task/event detection."""
    email = EmailInput(**req.model_dump(exclude={"id"}))
    result = run_email_pipeline(email)
    if req.id:
        upsert_email_base(req.id, email)
        set_email_category(req.id, result["category"].value)
        if result["tasks"]:
            replace_tasks(req.id, result["tasks"])
        if result["events"]:
            replace_events(req.id, result["events"])
    return ProcessEmailResponse(
        id=req.id,
        category=result["category"],
        tasks=result["tasks"],
        events=result["events"],
    )


@router.get("/inbox")
def inbox(limit: int = 100):
    return {"emails": list_inbox_emails(limit)}


@router.get("/known-ids")
def known_ids():
    return {"ids": sorted(list_known_message_ids())}


@router.delete("/{gmail_message_id}")
def delete_email_route(gmail_message_id: str):
    delete_email(gmail_message_id)
    return {"ok": True}


@router.patch("/tasks/{task_id}/confirm")
def confirm_task_route(task_id: str, req: ConfirmTaskRequest):
    confirm_task(
        task_id,
        {
            "description": req.description,
            "due_date": req.due_date.isoformat() if req.due_date else None,
            "due_date_text": req.due_date_text,
        },
    )
    return {"ok": True}


@router.patch("/events/{event_id}/confirm")
def confirm_event_route(event_id: str, req: ConfirmEventRequest):
    confirm_event(
        event_id,
        {
            "title": req.title,
            "status": req.status,
            "location": req.location,
            "candidate_times": [
                {
                    "start": req.start.isoformat() if req.start else None,
                    "end": req.end.isoformat() if req.end else None,
                    "time_text": None,
                }
            ],
        },
    )
    return {"ok": True}
