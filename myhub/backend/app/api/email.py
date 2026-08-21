from fastapi import APIRouter

from app.config import get_supabase_client
from app.email_pipeline.agents import categorize_email
from app.email_pipeline.schemas import CategoryResult, EmailInput

router = APIRouter(prefix="/email", tags=["email"])


class CategorizeEmailRequest(EmailInput):
    id: str | None = None


class CategorizeEmailResponse(CategoryResult):
    id: str | None = None


@router.post("/categorize", response_model=CategorizeEmailResponse)
def categorize(req: CategorizeEmailRequest):
    email = EmailInput(**req.model_dump(exclude={"id"}))
    result = categorize_email(email)

    if req.id:
        get_supabase_client().table("emails").upsert(
            {
                "gmail_message_id": req.id,
                "subject": result.subject,
                "sender": result.sender,
                "snippet": result.snippet,
                "body": result.body,
                "category": result.category.value,
            },
            on_conflict="gmail_message_id",
        ).execute()

    return CategorizeEmailResponse(id=req.id, category=result.category)
