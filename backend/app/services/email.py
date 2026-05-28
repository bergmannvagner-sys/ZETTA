import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def build_password_reset_link(token: str) -> str:
    settings = get_settings()
    separator = "&" if "?" in settings.password_reset_url else "?"
    return f"{settings.password_reset_url}{separator}{urlencode({'token': token})}"


def send_password_reset_email(to_email: str, token: str) -> bool:
    settings = get_settings()
    if not settings.smtp_configured:
        logger.warning("Password reset email not sent: SMTP is not configured")
        return False

    reset_link = build_password_reset_link(token)
    message = EmailMessage()
    message["Subject"] = "Recuperacao de senha Bergmann"
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(
        "\n".join(
            [
                "Recebemos uma solicitacao para recuperar sua senha no Bergmann.",
                "",
                f"Abra este link para criar uma nova senha: {reset_link}",
                "",
                "Este link expira em 30 minutos. Se voce nao pediu isso, ignore esta mensagem.",
            ]
        )
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception as exc:
        logger.error("Password reset email failed: %s", exc.__class__.__name__)
        return False
