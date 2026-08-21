from functools import lru_cache

from app.config import getLLM
from app.email_pipeline.prompts import SYSTEM_PROMPT, build_user_prompt
from app.email_pipeline.schemas import CategorizedEmail, CategoryResult, EmailInput


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


if __name__ == "__main__":
    sample = EmailInput(
        subject="Your invoice #4471 is ready",
        sender="billing@example.com",
        snippet="Your payment of $42.00 was processed successfully. View your invoice attached.",
    )
    result = categorize_email(sample)
    print(result.model_dump_json(indent=2))
