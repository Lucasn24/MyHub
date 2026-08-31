import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from supabase import Client, create_client

load_dotenv()

DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5"


@lru_cache
def getLLM() -> ChatAnthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Set ANTHROPIC_API_KEY (see .env_sample) — get a key at https://console.anthropic.com/settings/keys"
        )
    return ChatAnthropic(
        model=os.getenv("ANTHROPIC_MODEL") or DEFAULT_ANTHROPIC_MODEL,
        api_key=api_key,
    )


@lru_cache
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env_sample) — "
            "found in your Supabase project's Settings > API."
        )
    return create_client(url, key)
