from fastapi import APIRouter
from pydantic import BaseModel

from app.email_pipeline.agents import categorize_email, detect_events, extract_tasks
from app.email_pipeline.schemas import CategoryResult, DetectedEvent, EmailInput, ExtractedTask
from app.email_pipeline.store import replace_events, replace_tasks, set_email_category, upsert_email_base

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
