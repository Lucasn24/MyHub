import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


@lru_cache
def getLLM() -> ChatGoogleGenerativeAI:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Set GOOGLE_API_KEY (see .env.example) — free key at https://aistudio.google.com/apikey"
        )
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
        google_api_key=api_key,
    )
