import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
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
    if settings.super_admin_bootstrap_on_startup:
        db = SessionLocal()
        try:
            sync_super_admin(db, settings)
            logger.info("Super admin bootstrap completed for configured email")
        finally:
            db.close()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


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
