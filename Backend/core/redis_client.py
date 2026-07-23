import redis
import logging
from core.config import settings

logger = logging.getLogger(__name__)

try:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis successfully.")
except Exception as e:
    logger.warning(f"Redis connection failed ({e}). Fallback in-memory storage will be used.")
    redis_client = None
