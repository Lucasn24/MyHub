import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from supabase import Client, create_client

load_dotenv()

DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"


@lru_cache
def getLLM() -> ChatGoogleGenerativeAI:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Set GOOGLE_API_KEY (see .env_sample) — free key at https://aistudio.google.com/apikey"
        )
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
        google_api_key=api_key,
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
