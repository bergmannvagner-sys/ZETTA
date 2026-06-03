from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock

from fastapi import HTTPException, Request, status


_buckets: dict[str, deque[datetime]] = defaultdict(deque)
_lock = Lock()


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


def enforce_rate_limit(*, key: str, max_requests: int, window_seconds: int) -> None:
    if max_requests <= 0 or window_seconds <= 0:
        return
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
