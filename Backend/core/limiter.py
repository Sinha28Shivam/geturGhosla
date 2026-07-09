from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from fastapi import Request

# In-memory limiter for Phase 1. 
# In production, this can be backed by Redis using `limits` storage integration.
limiter = Limiter(key_func=get_remote_address)
