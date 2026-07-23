from fastapi import Request, HTTPException, status
from core.redis_client import redis_client
import json

IDEMPOTENCY_CACHE = {}

def check_idempotency(request: Request, lock_timeout: int = 120):
    """
    Idempotency middleware helper for write operations (POST/PATCH/DELETE).
    Reads 'Idempotency-Key' from request headers.
    """
    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idempotency_key:
        return None

    redis_key = f"idempotency:{idempotency_key}"

    if redis_client:
        cached = redis_client.get(redis_key)
        if cached:
            try:
                data = json.loads(cached)
                return data
            except Exception:
                pass
    else:
        if idempotency_key in IDEMPOTENCY_CACHE:
            return IDEMPOTENCY_CACHE[idempotency_key]

    return None

def save_idempotency_response(request: Request, response_data: dict, ttl_seconds: int = 86400):
    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idempotency_key:
        return

    redis_key = f"idempotency:{idempotency_key}"
    serialized = json.dumps(response_data, default=str)

    if redis_client:
        redis_client.setex(redis_key, ttl_seconds, serialized)
    else:
        IDEMPOTENCY_CACHE[idempotency_key] = response_data
