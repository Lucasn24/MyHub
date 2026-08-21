from app.email_pipeline.schemas import EmailInput

SYSTEM_PROMPT = """You classify emails into exactly one category. Categories:
- urgent: Time-sensitive, needs attention soon (deadlines, emergencies).
- action_required: Asks the recipient to do something, but isn't urgent.
- meeting: Proposes, confirms, reschedules, or cancels a meeting or event (invites, calendar links, availability requests).
- acknowledgment: Confirms something was received (auto-replies, 'we got your message', support ticket confirmations) with no action needed.
- newsletter: Recurring editorial content the user subscribed to.
- promotional: Marketing, sales, or advertising content.
- receipt: Order confirmations, invoices, payment receipts.
- personal: One-to-one correspondence from a person the user knows.
- social: Notifications from social networks or community platforms.
- spam: Unsolicited or malicious content.
- other: Doesn't clearly fit any other category.

If more than one category could apply, prefer the one listed first here:
spam, urgent, meeting, action_required, acknowledgment, receipt, newsletter, promotional, social, personal, other

Examples:
- A meeting invite that also asks you to confirm attendance or bring something -> meeting, not action_required.
- A subscribed newsletter that includes a seasonal sale -> newsletter, not promotional, unless the email is sales-only.
- An auto-reply confirming receipt of your request (even if it says 'we'll follow up') -> acknowledgment, not action_required."""


def build_user_prompt(email: EmailInput) -> str:
    content = email.body if email.body else email.snippet
    return (
        f"Subject: {email.subject}\n"
        f"From: {email.sender}\n"
        f"Content: {content}"
    )
