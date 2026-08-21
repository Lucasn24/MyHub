from enum import Enum

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


class EmailInput(BaseModel):
    subject: str
    sender: str = Field(description="Raw From header, e.g. 'Jane Doe <jane@example.com>'")
    snippet: str = Field(description="Short preview text from the mail provider")
    body: str | None = Field(default=None, description="Full email body, when available")


class CategoryResult(BaseModel):
    category: EmailCategory


class CategorizedEmail(EmailInput, CategoryResult):
    pass
