from app.email_pipeline.schemas import EmailInput

SYSTEM_PROMPT = """You classify emails into exactly one category. Categories:
- urgent: Time-sensitive, needs attention soon (deadlines, emergencies).
- action_required: Asks the recipient to do something, but isn't urgent.
- meeting: Proposes, confirms, reschedules, or cancels a meeting or event (invites, calendar links, availability requests).
- acknowledgment: Confirms something was received (auto-replies, 'we got your message', support ticket confirmations) with no action needed.
- newsletter: Recurring editorial content the user subscribed to.
- promotional: Marketing, sales, or advertising content.
- receipt: Order confirmations, invoices, payment receipts, and bank/card transaction alerts (e.g. "Your card ending 1234 was charged $45.00", purchase notifications, ATM withdrawal alerts, account activity summaries).
- personal: One-to-one correspondence from a person the user knows.
- social: Notifications from social networks or community platforms.
- spam: Unsolicited or malicious content.
- other: Doesn't clearly fit any other category.

If more than one category could apply, prefer the one listed first here:
spam, urgent, meeting, action_required, receipt, acknowledgment, newsletter, promotional, social, personal, other

Examples:
- A meeting invite that also asks you to confirm attendance or bring something -> meeting, not action_required.
- A subscribed newsletter that includes a seasonal sale -> newsletter, not promotional, unless the email is sales-only.
- An auto-reply confirming receipt of your request (even if it says 'we'll follow up') -> acknowledgment, not action_required.
- A bank notification that a charge or withdrawal was processed on your card/account -> receipt, not acknowledgment, even if it's phrased as a confirmation with no action needed."""


def build_user_prompt(email: EmailInput) -> str:
    content = email.body if email.body else email.snippet
    return (
        f"Subject: {email.subject}\n"
        f"From: {email.sender}\n"
        f"Content: {content}"
    )


TASK_EXTRACTION_SYSTEM_PROMPT = """You extract concrete action items ("tasks") from an email, addressed to the recipient.

Rules:
- Only extract asks directed at the recipient. If the email is addressing someone else (e.g. a CC'd third party, or a group instruction that doesn't clearly include the recipient), set addressed_to_user to false for that item, or omit it entirely if you're confident it isn't the recipient's task.
- Each task's description should be a short imperative phrase (e.g. "Send the signed contract", not "The sender wants you to send the contract").
- If the email states a relative due date (e.g. "by Friday", "end of week") and the email's send time is given below, resolve it to an absolute due_date. If no send time is given, or the phrase can't be confidently resolved, leave due_date null and put the original phrase in due_date_text instead.
- If there are no genuine action items, return an empty list.
- Do not invent tasks that aren't actually requested."""


def build_task_extraction_prompt(email: EmailInput) -> str:
    content = email.body if email.body else email.snippet
    sent_line = f"Email sent at: {email.received_at.isoformat()}\n" if email.received_at else ""
    return (
        f"Subject: {email.subject}\n"
        f"From: {email.sender}\n"
        f"{sent_line}"
        f"Content: {content}"
    )


EVENT_DETECTION_SYSTEM_PROMPT = """You detect meetings or events proposed, confirmed, rescheduled, or cancelled in an email.

Rules:
- status must reflect the email's intent: "proposed" (suggesting a time, not yet confirmed), "confirmed" (a specific time is settled), "rescheduled" (an existing meeting is being moved), or "cancelled" (an existing meeting is being called off).
- If multiple candidate times are offered (e.g. "Tuesday 2pm or Wednesday 10am"), include one entry per option in candidate_times rather than picking one.
- Resolve each candidate time to absolute start/end datetimes only when the email's send time and enough context are given below to do so confidently; otherwise leave start/end null and put the original phrase in time_text.
- Do not assume a timezone beyond what's stated in the email.
- If the email doesn't actually describe a meeting/event, return an empty list."""


def build_event_detection_prompt(email: EmailInput) -> str:
    content = email.body if email.body else email.snippet
    sent_line = f"Email sent at: {email.received_at.isoformat()}\n" if email.received_at else ""
    return (
        f"Subject: {email.subject}\n"
        f"From: {email.sender}\n"
        f"{sent_line}"
        f"Content: {content}"
    )


EXPENSE_EXTRACTION_SYSTEM_PROMPT = """You extract every purchase/charge/withdrawal described in a receipt, order confirmation, invoice, or account activity summary email.

Rules:
- If the email lists multiple distinct transactions (e.g. a "recent purchases and ATM withdrawals" digest, a monthly statement, an order with multiple separately-charged items), extract one entry per transaction rather than a single combined total.
- title: a short name for the purchase — the merchant name, or a brief order description if that's clearer (e.g. "Uber ride", "Amazon order #123-4567", "ATM withdrawal").
- type: pick the single best-fitting category per transaction: groceries, dining, transport, travel, shopping, subscription, utilities, entertainment, health, housing, or other.
- cost: the amount actually charged for that transaction (not a subtotal, and not a listed original price if a discount was applied), as a plain number.
- date: the date each transaction occurred, per the receipt itself. If a transaction doesn't state its own date but the email's send time is given below, use that as the date.
- Do not merge separate transactions into one entry, and do not also add a combined "total" entry alongside the individual ones.
- If this email doesn't actually contain any real purchase/charge to extract (e.g. it's a shipping notice with no amount, or a promotional email misfiled as a receipt), return an empty list instead of guessing."""


def build_expense_extraction_prompt(email: EmailInput) -> str:
    content = email.body if email.body else email.snippet
    sent_line = f"Email sent at: {email.received_at.isoformat()}\n" if email.received_at else ""
    return (
        f"Subject: {email.subject}\n"
        f"From: {email.sender}\n"
        f"{sent_line}"
        f"Content: {content}"
    )
