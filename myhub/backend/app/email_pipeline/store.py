from app.config import get_supabase_client
from app.email_pipeline.schemas import DetectedEvent, EmailInput, ExtractedTask


def upsert_email_base(gmail_message_id: str, email: EmailInput) -> None:
    get_supabase_client().table("emails").upsert(
        {
            "gmail_message_id": gmail_message_id,
            "subject": email.subject,
            "sender": email.sender,
            "snippet": email.snippet,
            "body": email.body,
            "received_at": email.received_at.isoformat() if email.received_at else None,
        },
        on_conflict="gmail_message_id",
    ).execute()


def set_email_category(gmail_message_id: str, category: str) -> None:
    get_supabase_client().table("emails").update({"category": category}).eq(
        "gmail_message_id", gmail_message_id
    ).execute()


def replace_tasks(gmail_message_id: str, tasks: list[ExtractedTask]) -> None:
    client = get_supabase_client()
    client.table("tasks").delete().eq("gmail_message_id", gmail_message_id).execute()
    if tasks:
        client.table("tasks").insert(
            [
                {
                    "gmail_message_id": gmail_message_id,
                    "description": t.description,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "due_date_text": t.due_date_text,
                    "addressed_to_user": t.addressed_to_user,
                }
                for t in tasks
            ]
        ).execute()


def replace_events(gmail_message_id: str, events: list[DetectedEvent]) -> None:
    client = get_supabase_client()
    client.table("events").delete().eq("gmail_message_id", gmail_message_id).execute()
    if events:
        client.table("events").insert(
            [
                {
                    "gmail_message_id": gmail_message_id,
                    "title": e.title,
                    "status": e.status,
                    "location": e.location,
                    "attendees": e.attendees,
                    "candidate_times": [ct.model_dump(mode="json") for ct in e.candidate_times],
                }
                for e in events
            ]
        ).execute()
