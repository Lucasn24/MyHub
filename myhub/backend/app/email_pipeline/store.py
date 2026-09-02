from app.config import get_supabase_client
from app.email_pipeline.schemas import DetectedEvent, EmailInput, ExtractedExpense, ExtractedTask


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


def list_expenses(limit: int = 200) -> list[dict]:
    result = (
        get_supabase_client()
        .table("expenses")
        .select("*")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


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


def save_expenses(expenses: list[ExtractedExpense]) -> None:
    # Expenses are no longer tied to a gmail_message_id (they must survive
    # deletion of the source email), so there's nothing to scope a delete to
    # before inserting -- each extraction just appends its expenses.
    if expenses:
        get_supabase_client().table("expenses").insert(
            [
                {
                    "title": expense.title,
                    "type": expense.type.value,
                    "cost": expense.cost,
                    "date": expense.date.isoformat(),
                }
                for expense in expenses
            ]
        ).execute()


def update_expense(expense_id: str, updates: dict) -> dict:
    result = get_supabase_client().table("expenses").update(updates).eq("id", expense_id).execute()
    return result.data[0]


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
