import datetime as dt
from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class EmailCategory(str, Enum):
    URGENT = "urgent"
    ACTION_REQUIRED = "action_required"
    MEETING = "meeting"
    ACKNOWLEDGMENT = "acknowledgment"
    NEWSLETTER = "newsletter"
    PROMOTIONAL = "promotional"
    RECEIPT = "receipt"
    PERSONAL = "personal"
    SOCIAL = "social"
    SPAM = "spam"
    OTHER = "other"


class AttachmentInfo(BaseModel):
    filename: str
    size: int


class EmailInput(BaseModel):
    subject: str
    sender: str = Field(description="Raw From header, e.g. 'Jane Doe <jane@example.com>'")
    snippet: str = Field(description="Short preview text from the mail provider")
    body: str | None = Field(default=None, description="Full email body, when available")
    links: list[str] = Field(default_factory=list, description="URLs found in the email body")
    attachments: list[AttachmentInfo] = Field(
        default_factory=list, description="Attachment filename/size metadata (no file bytes)"
    )
    received_at: datetime | None = Field(
        default=None, description="When the email was sent/received, per the mail provider"
    )


class CategoryResult(BaseModel):
    category: EmailCategory


class CategorizedEmail(EmailInput, CategoryResult):
    pass


class ExtractedTask(BaseModel):
    description: str = Field(description="The concrete action requested, in imperative form")
    due_date: date | None = Field(default=None, description="Resolved absolute due date, if determinable")
    due_date_text: str | None = Field(
        default=None, description="Original relative phrase (e.g. 'by Friday') when due_date can't be resolved"
    )
    addressed_to_user: bool = Field(
        description="True only if the ask is directed at the recipient, not a CC'd third party"
    )


class TaskExtractionResult(BaseModel):
    tasks: list[ExtractedTask] = Field(default_factory=list)


class EventTime(BaseModel):
    start: datetime | None = None
    end: datetime | None = None
    time_text: str | None = Field(
        default=None, description="Original phrase when start/end can't be resolved to absolute datetimes"
    )


class DetectedEvent(BaseModel):
    title: str
    status: Literal["proposed", "confirmed", "rescheduled", "cancelled"]
    location: str | None = None
    attendees: list[str] = Field(default_factory=list)
    candidate_times: list[EventTime] = Field(
        default_factory=list,
        description="One entry per proposed time; length 1 for a confirmed single time, "
        ">1 for e.g. 'Tuesday 2pm or Wednesday 10am'",
    )


class EventDetectionResult(BaseModel):
    events: list[DetectedEvent] = Field(default_factory=list)


class ExpenseType(str, Enum):
    GROCERIES = "groceries"
    DINING = "dining"
    TRANSPORT = "transport"
    TRAVEL = "travel"
    SHOPPING = "shopping"
    SUBSCRIPTION = "subscription"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    HOUSING = "housing"
    OTHER = "other"


class ExtractedExpense(BaseModel):
    title: str = Field(description="Short name for the purchase, e.g. the merchant or order description")
    type: ExpenseType
    cost: float = Field(description="Total amount charged, per the receipt")
    date: "dt.date" = Field(description="Date the purchase/charge occurred, per the receipt")


class ExpenseExtractionResult(BaseModel):
    expenses: list[ExtractedExpense] = Field(
        default_factory=list,
        description="One entry per distinct purchase/charge/withdrawal. Empty if the email isn't actually "
        "a receipt with an extractable charge.",
    )
