from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import uuid4

import httpx

from app.core.config import Settings
from app.models.telecare import TelecareSession
from app.models.user import User, UserRole

CLINICAL_TELECARE_ROLES = {UserRole.PSYCHOLOGIST, UserRole.CLINIC, UserRole.HOSPITAL}
PLATFORM_FEE_BPS = 2000

SESSION_PRICE_CENTS_BY_ROLE = {
    UserRole.PSYCHOLOGIST: 18000,
    UserRole.CLINIC: 22000,
    UserRole.HOSPITAL: 22000,
}


def role_accepts_telecare(role: UserRole) -> bool:
    return role in CLINICAL_TELECARE_ROLES


def session_price_cents_for_provider(provider: User) -> int:
    return SESSION_PRICE_CENTS_BY_ROLE.get(provider.role, 18000)


def platform_fee_cents_for_price(price_cents: int) -> int:
    return round(price_cents * PLATFORM_FEE_BPS / 10000)


def provider_payout_cents_for_price(price_cents: int) -> int:
    return price_cents - platform_fee_cents_for_price(price_cents)


def cents_to_brl(value: int) -> float:
    return round(value / 100, 2)


def platform_fee_percent() -> float:
    return round(PLATFORM_FEE_BPS / 100, 2)


def new_room_code() -> str:
    return f"ZT-{uuid4().hex[:8].upper()}"


class DailyTelecareError(RuntimeError):
    pass


class DailyTelecareNotConfigured(DailyTelecareError):
    pass


@dataclass(frozen=True)
class DailyRoom:
    name: str
    url: str


@dataclass(frozen=True)
class DailyJoin:
    join_url: str
    expires_at: datetime


def daily_room_name_for_session(session: TelecareSession) -> str:
    return f"zetta-{session.id.replace('-', '')}"[:64]


def daily_video_status_for_session(session: TelecareSession, settings: Settings) -> str:
    if session.daily_room_url:
        return "DAILY_READY"
    if settings.daily_configured:
        return "DAILY_PENDING_ROOM"
    return "DAILY_NOT_CONFIGURED"


def _daily_headers(settings: Settings) -> dict[str, str]:
    if not settings.daily_api_key:
        raise DailyTelecareNotConfigured("Daily is not configured")
    return {
        "Authorization": f"Bearer {settings.daily_api_key}",
        "Content-Type": "application/json",
    }


def _daily_url(settings: Settings, path: str) -> str:
    return f"{settings.daily_api_url.rstrip('/')}/{path.lstrip('/')}"


def create_daily_room(session: TelecareSession, settings: Settings) -> DailyRoom:
    room_name = session.daily_room_name or daily_room_name_for_session(session)
    expires_at = datetime.now(UTC) + timedelta(hours=settings.daily_room_expire_hours)
    payload = {
        "name": room_name,
        "privacy": "private",
        "properties": {
            "exp": int(expires_at.timestamp()),
            "eject_at_room_exp": True,
            "enable_chat": False,
            "enable_people_ui": False,
            "enable_prejoin_ui": True,
            "max_participants": 2,
            "start_audio_off": False,
            "start_video_off": False,
        },
    }
    try:
        response = httpx.post(
            _daily_url(settings, "/rooms"),
            headers=_daily_headers(settings),
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise DailyTelecareError(f"Daily room creation failed: {exc.response.text}") from exc
    except httpx.HTTPError as exc:
        raise DailyTelecareError("Daily room creation failed") from exc

    body = response.json()
    name = str(body.get("name") or room_name)
    url = body.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise DailyTelecareError("Daily room response did not include a secure room URL")
    return DailyRoom(name=name, url=url)


def create_daily_join(
    session: TelecareSession,
    user: User,
    settings: Settings,
    *,
    owner: bool,
) -> DailyJoin:
    if not session.daily_room_name or not session.daily_room_url:
        raise DailyTelecareError("Daily room has not been created")

    expires_at = datetime.now(UTC) + timedelta(minutes=settings.daily_join_token_expire_minutes)
    payload = {
        "properties": {
            "room_name": session.daily_room_name,
            "exp": int(expires_at.timestamp()),
            "eject_at_token_exp": True,
            "is_owner": owner,
            "user_name": user.full_name[:80],
            "enable_prejoin_ui": True,
            "lang": "pt-BR",
        }
    }
    try:
        response = httpx.post(
            _daily_url(settings, "/meeting-tokens"),
            headers=_daily_headers(settings),
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise DailyTelecareError(f"Daily token creation failed: {exc.response.text}") from exc
    except httpx.HTTPError as exc:
        raise DailyTelecareError("Daily token creation failed") from exc

    token = response.json().get("token")
    if not isinstance(token, str) or not token:
        raise DailyTelecareError("Daily token response did not include a token")
    separator = "&" if "?" in session.daily_room_url else "?"
    return DailyJoin(
        join_url=f"{session.daily_room_url}{separator}{urlencode({'t': token})}",
        expires_at=expires_at,
    )
