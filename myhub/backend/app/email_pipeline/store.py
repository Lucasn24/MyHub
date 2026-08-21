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
            "links": email.links,
            "attachments": [a.model_dump() for a in email.attachments],
            "received_at": email.received_at.isoformat() if email.received_at else None,
        },
        on_conflict="gmail_message_id",
    ).execute()


def list_known_message_ids() -> set[str]:
    result = get_supabase_client().table("emails").select("gmail_message_id").execute()
    return {row["gmail_message_id"] for row in result.data}


def list_inbox_emails(limit: int = 100) -> list[dict]:
    result = (
        get_supabase_client()
        .table("emails")
        .select("*, tasks(*), events(*)")
        .order("received_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


def delete_email(gmail_message_id: str) -> None:
    get_supabase_client().table("emails").delete().eq("gmail_message_id", gmail_message_id).execute()


def confirm_task(task_id: str, updates: dict) -> None:
    get_supabase_client().table("tasks").update({**updates, "confirmed": True}).eq("id", task_id).execute()


def confirm_event(event_id: str, updates: dict) -> None:
    get_supabase_client().table("events").update({**updates, "confirmed": True}).eq("id", event_id).execute()


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
