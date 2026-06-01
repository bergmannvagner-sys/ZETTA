from __future__ import annotations

from dataclasses import dataclass
import hmac
from hashlib import sha256
from typing import Any, Mapping, Protocol


class PaymentAdapterError(ValueError):
    pass


class PaymentProviderNotConfigured(PaymentAdapterError):
    pass


@dataclass(frozen=True)
class PaymentAdapterCapabilities:
    provider: str
    checkout_enabled: bool
    provider_configured: bool
    production_enabled: bool
    webhook_signature_headers: tuple[str, ...]
    customer_reference_fields: tuple[str, ...]
    event_reference_fields: tuple[str, ...]
    required_env_names: tuple[str, ...]
    activation_checkpoints: tuple[str, ...]


class PaymentProviderAdapter(Protocol):
    provider: str

    def capabilities(
        self,
        *,
        provider_configured: bool = False,
        production_enabled: bool = False,
    ) -> PaymentAdapterCapabilities:
        ...

    def verify_provider_signature(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
        secret: str | None,
    ) -> bool:
        ...

    def extract_event_reference(self, payload: Mapping[str, Any]) -> str | None:
        ...

    def extract_customer_reference(self, payload: Mapping[str, Any]) -> str | None:
        ...

    def extract_subscription_reference(self, payload: Mapping[str, Any]) -> str | None:
        ...


class LocalOnlyPaymentAdapter:
    provider = "LOCAL"
    webhook_signature_headers: tuple[str, ...] = ()
    customer_reference_fields: tuple[str, ...] = ()
    event_reference_fields: tuple[str, ...] = ()
    required_env_names: tuple[str, ...] = ()
    activation_checkpoints: tuple[str, ...] = ()

    def capabilities(
        self,
        *,
        provider_configured: bool = False,
        production_enabled: bool = False,
    ) -> PaymentAdapterCapabilities:
        return PaymentAdapterCapabilities(
            provider=self.provider,
            checkout_enabled=False,
            provider_configured=provider_configured,
            production_enabled=production_enabled,
            webhook_signature_headers=self.webhook_signature_headers,
            customer_reference_fields=self.customer_reference_fields,
            event_reference_fields=self.event_reference_fields,
            required_env_names=self.required_env_names,
            activation_checkpoints=self.activation_checkpoints,
        )

    def verify_provider_signature(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
        secret: str | None,
    ) -> bool:
        raise PaymentProviderNotConfigured(
            f"{self.provider} signature validation is not active. "
            "Configure the real provider first."
        )

    def extract_event_reference(self, payload: Mapping[str, Any]) -> str | None:
        return _as_text(payload.get("event_id") or payload.get("id"))

    def extract_customer_reference(self, payload: Mapping[str, Any]) -> str | None:
        return _as_text(payload.get("customer_id") or payload.get("customer"))

    def extract_subscription_reference(self, payload: Mapping[str, Any]) -> str | None:
        return _as_text(payload.get("subscription_id") or payload.get("subscription"))


class MercadoPagoPaymentAdapter(LocalOnlyPaymentAdapter):
    provider = "MERCADO_PAGO"
    webhook_signature_headers = ("x-signature", "x-request-id")
    customer_reference_fields = ("payer.email", "external_reference")
    event_reference_fields = ("id", "data.id", "external_reference")
    required_env_names = (
        "MERCADO_PAGO_ACCESS_TOKEN",
        "MERCADO_PAGO_PUBLIC_KEY",
        "MERCADO_PAGO_WEBHOOK_SECRET",
        "MERCADO_PAGO_SUCCESS_URL",
        "MERCADO_PAGO_PENDING_URL",
        "MERCADO_PAGO_FAILURE_URL",
    )
    activation_checkpoints = (
        "Usar credenciais definitivas do Mercado Pago no ambiente seguro de producao.",
        "Configurar MERCADO_PAGO_WEBHOOK_SECRET fora do repositorio.",
        "Validar x-signature e x-request-id antes de processar notificacoes.",
        "Conferir pagamento real no Mercado Pago antes de liberar acesso pago.",
        "Aceitar apenas status de pagamento previstos e manter idempotencia por evento.",
    )

    def verify_provider_signature(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
        secret: str | None,
    ) -> bool:
        if not secret:
            raise PaymentProviderNotConfigured("Mercado Pago webhook secret is not configured")
        signature = _header_value(headers, "x-signature")
        request_id = _header_value(headers, "x-request-id")
        if not signature or not request_id:
            return False
        signature_parts = _signature_parts(signature)
        timestamp = signature_parts.get("ts")
        expected_hash = signature_parts.get("v1")
        if not timestamp or not expected_hash:
            return False
        data_id = _extract_data_id_from_body(raw_body)
        manifest = f"id:{data_id};request-id:{request_id};ts:{timestamp};"
        actual_hash = hmac.new(secret.encode("utf-8"), manifest.encode("utf-8"), sha256).hexdigest()
        return hmac.compare_digest(actual_hash, expected_hash)

    def extract_event_reference(self, payload: Mapping[str, Any]) -> str | None:
        data = payload.get("data")
        if isinstance(data, Mapping):
            return _as_text(data.get("id")) or super().extract_event_reference(payload)
        return super().extract_event_reference(payload)

    def extract_customer_reference(self, payload: Mapping[str, Any]) -> str | None:
        payer = payload.get("payer")
        if isinstance(payer, Mapping):
            return _as_text(payer.get("email")) or super().extract_customer_reference(payload)
        return _as_text(payload.get("external_reference")) or super().extract_customer_reference(payload)

    def extract_subscription_reference(self, payload: Mapping[str, Any]) -> str | None:
        return _as_text(payload.get("preference_id")) or _as_text(payload.get("id")) or super().extract_subscription_reference(payload)

PAYMENT_ADAPTERS: dict[str, PaymentProviderAdapter] = {
    "MERCADO_PAGO": MercadoPagoPaymentAdapter(),
}


def get_payment_adapter(provider: str) -> PaymentProviderAdapter:
    adapter = PAYMENT_ADAPTERS.get(provider.strip().upper())
    if adapter is None:
        raise PaymentAdapterError("Unsupported payment provider")
    return adapter


def list_payment_adapter_capabilities() -> list[PaymentAdapterCapabilities]:
    return [adapter.capabilities() for adapter in PAYMENT_ADAPTERS.values()]


def validate_billing_reference(
    *,
    provider: str | None,
    customer_id: str | None,
    subscription_id: str | None,
    last_event_id: str | None,
) -> list[str]:
    normalized_provider = provider.strip().upper() if provider else None
    errors: list[str] = []
    if normalized_provider is None:
        if customer_id or subscription_id or last_event_id:
            errors.append("Provider NONE cannot keep external billing IDs")
        return errors

    if normalized_provider not in PAYMENT_ADAPTERS:
        errors.append("Unsupported payment provider")
        return errors

    if not customer_id:
        errors.append("Customer ID is required for paid providers")
    if not subscription_id:
        errors.append("Subscription ID is required for paid providers")

    if normalized_provider == "MERCADO_PAGO":
        if customer_id and len(customer_id) > 150:
            errors.append("Mercado Pago payer/customer reference is too long")
        if last_event_id and len(last_event_id) > 160:
            errors.append("Mercado Pago event ID is too long")

    return errors


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _header_value(headers: Mapping[str, str], name: str) -> str | None:
    lowered = name.lower()
    for key, value in headers.items():
        if key.lower() == lowered:
            return value
    return None


def _signature_parts(signature: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for item in signature.split(","):
        key, separator, value = item.partition("=")
        if separator:
            parts[key.strip()] = value.strip()
    return parts


def _extract_data_id_from_body(raw_body: bytes) -> str:
    try:
        import json

        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, ValueError):
        return ""
    if isinstance(payload, Mapping):
        data = payload.get("data")
        if isinstance(data, Mapping):
            return _as_text(data.get("id")) or ""
    return ""
