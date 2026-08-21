from functools import lru_cache

from app.config import getLLM
from app.email_pipeline.prompts import (
    EVENT_DETECTION_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    TASK_EXTRACTION_SYSTEM_PROMPT,
    build_event_detection_prompt,
    build_task_extraction_prompt,
    build_user_prompt,
)
from app.email_pipeline.schemas import (
    CategorizedEmail,
    CategoryResult,
    DetectedEvent,
    EmailInput,
    EventDetectionResult,
    ExtractedTask,
    TaskExtractionResult,
)


@lru_cache
def _get_categorizer():
    return getLLM().with_structured_output(CategoryResult)


def categorize_email(email: EmailInput) -> CategorizedEmail:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(email)},
    ]
    result = _get_categorizer().invoke(messages)
    return CategorizedEmail(**email.model_dump(), **result.model_dump())


@lru_cache
def _get_task_extractor():
    return getLLM().with_structured_output(TaskExtractionResult)


def extract_tasks(email: EmailInput) -> list[ExtractedTask]:
    messages = [
        {"role": "system", "content": TASK_EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": build_task_extraction_prompt(email)},
    ]
    result = _get_task_extractor().invoke(messages)
    return [t for t in result.tasks if t.addressed_to_user]


@lru_cache
def _get_event_detector():
    return getLLM().with_structured_output(EventDetectionResult)


def detect_events(email: EmailInput) -> list[DetectedEvent]:
    messages = [
        {"role": "system", "content": EVENT_DETECTION_SYSTEM_PROMPT},
        {"role": "user", "content": build_event_detection_prompt(email)},
    ]
    return _get_event_detector().invoke(messages).events


if __name__ == "__main__":
    sample = EmailInput(
        subject="Your invoice #4471 is ready",
        sender="billing@example.com",
        snippet="Your payment of $42.00 was processed successfully. View your invoice attached.",
    )
    result = categorize_email(sample)
    print(result.model_dump_json(indent=2))
