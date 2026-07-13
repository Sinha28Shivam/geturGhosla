from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from fastapi import Request

# In-memory limiter for Phase 1. 
# IMPORTANT: slowapi's default DictStorage (in-memory) won't survive a restart and 
# will not work across multiple server instances or processes.
# In production, this MUST be backed by Redis using `limits` storage integration:
# e.g. limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
limiter = Limiter(key_func=get_remote_address)
