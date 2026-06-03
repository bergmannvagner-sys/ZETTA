import logging
import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, assistant, auth, billing, chat, connections, emotional, privacy, sos, users
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.super_admin import sync_super_admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    billing_pending_alert_task: asyncio.Task[None] | None = None
    if settings.super_admin_bootstrap_on_startup:
        db = SessionLocal()
        try:
            sync_super_admin(db, settings)
            logger.info("Super admin bootstrap completed for configured email")
        finally:
            db.close()
    if settings.billing_pending_alerts_auto_enabled:
        billing_pending_alert_task = asyncio.create_task(periodic_billing_pending_alerts())
        logger.info("Automated billing pending alerts enabled")
    try:
        yield
    finally:
        if billing_pending_alert_task:
            billing_pending_alert_task.cancel()
            try:
                await billing_pending_alert_task
            except asyncio.CancelledError:
                logger.info("Automated billing pending alerts stopped")


async def periodic_billing_pending_alerts() -> None:
    await asyncio.sleep(5)
    interval_seconds = max(settings.billing_pending_alerts_auto_interval_hours, 1) * 60 * 60
    while True:
        try:
            await asyncio.to_thread(run_billing_pending_alert_once)
        except Exception as exc:
            logger.error("Automated billing pending alert failed: %s", exc.__class__.__name__)
        await asyncio.sleep(interval_seconds)


def run_billing_pending_alert_once() -> None:
    db = SessionLocal()
    try:
        if admin.recent_scheduled_billing_pending_alert_exists(
            db,
            interval_hours=settings.billing_pending_alerts_auto_interval_hours,
        ):
            logger.info("Automated billing pending alert skipped: recent scheduled alert exists")
            return
        result = admin.run_billing_pending_alert(
            db,
            days=settings.billing_pending_alerts_auto_days,
            limit=settings.billing_pending_alerts_auto_limit,
            trigger="scheduled",
        )
        logger.info(
            "Automated billing pending alert completed: pending=%s alerted=%s email_sent=%s",
            result.pending_accounts,
            result.alerted_accounts,
            result.email_sent,
        )
    finally:
        db.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(assistant.router)
app.include_router(billing.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(connections.router)
app.include_router(emotional.router)
app.include_router(sos.router)
app.include_router(privacy.router)
app.include_router(admin.router)
