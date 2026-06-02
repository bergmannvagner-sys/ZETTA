import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.billing import BillingWebhookPayload, BillingWebhookResponse
from app.services.billing_webhooks import apply_billing_webhook, verify_signature
from app.services.mercado_pago import (
    MercadoPagoIntegrationError,
    billing_payload_from_mercado_pago_payment,
    fetch_mercado_pago_payment,
    verify_mercado_pago_signature,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/success", response_class=HTMLResponse)
def billing_success() -> HTMLResponse:
    return _billing_return_page(
        title="Pagamento recebido",
        message=(
            "Recebemos o retorno do Mercado Pago. A assinatura sera liberada "
            "quando o webhook de confirmacao for validado pelo Bergmann."
        ),
    )


@router.get("/pending", response_class=HTMLResponse)
def billing_pending() -> HTMLResponse:
    return _billing_return_page(
        title="Pagamento em analise",
        message=(
            "O pagamento ainda esta pendente. Assim que o Mercado Pago confirmar "
            "o status pelo webhook, o acesso comercial sera atualizado."
        ),
    )


@router.get("/failure", response_class=HTMLResponse)
def billing_failure() -> HTMLResponse:
    return _billing_return_page(
        title="Pagamento nao concluido",
        message=(
            "O Mercado Pago nao concluiu esta cobranca. Nenhum acesso pago foi "
            "liberado automaticamente sem webhook validado. Tente novamente ou fale com a administracao."
        ),
    )


@router.post("/webhook", response_model=BillingWebhookResponse)
async def billing_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    x_bergmann_billing_signature: str | None = Header(default=None),
) -> BillingWebhookResponse:
    settings = get_settings()
    if not settings.billing_webhooks_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing webhooks disabled")
    if not settings.billing_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing webhook secret missing")

    body = await request.body()
    if not verify_signature(body, settings.billing_webhook_secret, x_bergmann_billing_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid billing signature")

    try:
        payload = BillingWebhookPayload.model_validate(json.loads(body.decode("utf-8")))
    except (json.JSONDecodeError, UnicodeDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid billing payload") from exc

    try:
        user, duplicate = apply_billing_webhook(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing account not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported billing status") from exc

    return BillingWebhookResponse(
        status="duplicate" if duplicate else "processed",
        user_id=user.id,
        subscription_status=user.subscription_status.value,
        duplicate=duplicate,
    )


@router.post("/mercado-pago/webhook", response_model=BillingWebhookResponse)
async def mercado_pago_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    x_signature: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
) -> BillingWebhookResponse:
    settings = get_settings()
    if not settings.billing_webhooks_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing webhooks disabled")
    if not settings.mercado_pago_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Mercado Pago webhook secret missing")

    body = await request.body()
    data_id = request.query_params.get("data.id") or _data_id_from_body(body)
    if not data_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mercado Pago payment id missing")
    if not verify_mercado_pago_signature(
        data_id=data_id,
        request_id=x_request_id,
        signature=x_signature,
        secret=settings.mercado_pago_webhook_secret,
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Mercado Pago signature")

    try:
        payment = fetch_mercado_pago_payment(settings=settings, payment_id=data_id)
        payload = billing_payload_from_mercado_pago_payment(payment)
        user, duplicate = apply_billing_webhook(db, payload)
    except MercadoPagoIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Billing account not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported billing status") from exc

    return BillingWebhookResponse(
        status="duplicate" if duplicate else "processed",
        user_id=user.id,
        subscription_status=user.subscription_status.value,
        duplicate=duplicate,
    )


def _data_id_from_body(body: bytes) -> str | None:
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, dict):
            value = data.get("id")
            if value is not None:
                text = str(value).strip()
                return text or None
    return None


def _billing_return_page(*, title: str, message: str) -> HTMLResponse:
    html = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZETTA Bergmann - {title}</title>
  <style>
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0A0F1F;
      color: #F7FAFA;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      width: min(560px, calc(100vw - 40px));
      padding: 32px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 16px;
      background: rgba(18, 24, 48, 0.82);
    }}
    .brand {{
      color: #22E6F2;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 14px 0 12px;
      font-size: clamp(28px, 6vw, 42px);
      line-height: 1.08;
    }}
    p {{
      margin: 0;
      color: #B8C1D9;
      font-size: 16px;
      line-height: 1.65;
    }}
  </style>
</head>
<body>
  <main>
    <div class="brand">ZETTA BERGMANN</div>
    <h1>{title}</h1>
    <p>{message}</p>
  </main>
</body>
</html>"""
    return HTMLResponse(content=html)
