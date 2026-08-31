import os

from fastapi import Header, HTTPException


def require_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    """Shared-secret gate: only the Next.js server (which holds INTERNAL_API_KEY)
    should ever be able to reach this API. Primary defense is deploying this
    service on a private network with no public URL; this header is the
    fallback if that gets misconfigured.
    """
    expected = os.getenv("INTERNAL_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY is not configured on the server")
    if x_internal_api_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
