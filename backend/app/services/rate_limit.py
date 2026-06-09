from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock
from uuid import uuid4

from fastapi import HTTPException, Request, status
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings


_buckets: dict[str, deque[datetime]] = defaultdict(deque)
_lock = Lock()
_redis_client: Redis | None = None
_redis_lock = Lock()
_redis_disabled_until: datetime | None = None


def client_identifier(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit_key(*parts: str | None) -> str:
    return ":".join((part or "unknown").strip().lower() for part in parts)


def clear_rate_limits() -> None:
    with _lock:
        _buckets.clear()
    client = _get_redis_client()
    if not client:
        return
    try:
        for key in client.scan_iter(match="bergmann:rate_limit:*", count=100):
            client.delete(key)
    except RedisError:
        _disable_redis_temporarily()


def enforce_rate_limit(*, key: str, max_requests: int, window_seconds: int) -> None:
    if max_requests <= 0 or window_seconds <= 0:
        return
    if _enforce_redis_rate_limit(key=key, max_requests=max_requests, window_seconds=window_seconds):
        return
    _enforce_memory_rate_limit(key=key, max_requests=max_requests, window_seconds=window_seconds)


def _enforce_memory_rate_limit(*, key: str, max_requests: int, window_seconds: int) -> None:
    now = datetime.now(UTC)
    threshold = now - timedelta(seconds=window_seconds)
    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] <= threshold:
            bucket.popleft()
        if len(bucket) >= max_requests:
            retry_after = max(1, int((bucket[0] + timedelta(seconds=window_seconds) - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Tente novamente em instantes.",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)


def _get_redis_client() -> Redis | None:
    global _redis_client
    settings = get_settings()
    if not settings.is_production or not settings.redis_url:
        return None

    now = datetime.now(UTC)
    if _redis_disabled_until and _redis_disabled_until > now:
        return None

    with _redis_lock:
        if _redis_client is not None:
            return _redis_client
        try:
            client = Redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2,
            )
            client.ping()
        except RedisError:
            _disable_redis_temporarily()
            return None
        _redis_client = client
        return _redis_client


def _disable_redis_temporarily() -> None:
    global _redis_client, _redis_disabled_until
    _redis_client = None
    _redis_disabled_until = datetime.now(UTC) + timedelta(seconds=30)


def _enforce_redis_rate_limit(*, key: str, max_requests: int, window_seconds: int) -> bool:
    client = _get_redis_client()
    if not client:
        return False

    now = datetime.now(UTC)
    now_ms = int(now.timestamp() * 1000)
    threshold_ms = now_ms - (window_seconds * 1000)
    redis_key = f"bergmann:rate_limit:{key}"
    member = f"{now_ms}:{uuid4()}"
    try:
        pipe = client.pipeline()
        pipe.zremrangebyscore(redis_key, 0, threshold_ms)
        pipe.zcard(redis_key)
        _, current_count = pipe.execute()
        if int(current_count) >= max_requests:
            oldest = client.zrange(redis_key, 0, 0, withscores=True)
            retry_after = 1
            if oldest:
                retry_after = max(1, int((oldest[0][1] + (window_seconds * 1000) - now_ms) / 1000))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas. Tente novamente em instantes.",
                headers={"Retry-After": str(retry_after)},
            )
        pipe = client.pipeline()
        pipe.zadd(redis_key, {member: now_ms})
        pipe.expire(redis_key, window_seconds)
        pipe.execute()
        return True
    except HTTPException:
        raise
    except RedisError:
        _disable_redis_temporarily()
        return False
