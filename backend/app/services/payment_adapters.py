from __future__ import annotations

from dataclasses import dataclass
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
    sandbox_enabled: bool
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
        sandbox_enabled: bool = False,
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
        sandbox_enabled: bool = False,
    ) -> PaymentAdapterCapabilities:
        return PaymentAdapterCapabilities(
            provider=self.provider,
            checkout_enabled=False,
            provider_configured=provider_configured,
            sandbox_enabled=sandbox_enabled,
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


class StripePaymentAdapter(LocalOnlyPaymentAdapter):
    provider = "STRIPE"
    webhook_signature_headers = ("Stripe-Signature",)
    customer_reference_fields = ("customer",)
    event_reference_fields = ("id", "type", "data.object.id")
    required_env_names = (
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRICE_IDS",
    )
    activation_checkpoints = (
        "Configurar STRIPE_WEBHOOK_SECRET fora do repositorio.",
        "Validar Stripe-Signature usando SDK oficial antes de processar evento.",
        "Buscar customer e subscription reais no Stripe antes de liberar acesso pago.",
        "Aceitar apenas eventos de assinatura e pagamento previstos.",
    )

    def extract_customer_reference(self, payload: Mapping[str, Any]) -> str | None:
        data_object = _data_object(payload)
        return _as_text(data_object.get("customer")) or super().extract_customer_reference(payload)

    def extract_subscription_reference(self, payload: Mapping[str, Any]) -> str | None:
        data_object = _data_object(payload)
        return (
            _as_text(data_object.get("subscription"))
            or _as_text(data_object.get("id"))
            or super().extract_subscription_reference(payload)
        )


class MercadoPagoPaymentAdapter(LocalOnlyPaymentAdapter):
    provider = "MERCADO_PAGO"
    webhook_signature_headers = ("x-signature", "x-request-id")
    customer_reference_fields = ("payer.id", "external_reference")
    event_reference_fields = ("id", "type", "action", "data.id")
    required_env_names = (
        "MERCADO_PAGO_ACCESS_TOKEN",
        "MERCADO_PAGO_PUBLIC_KEY",
        "MERCADO_PAGO_WEBHOOK_SECRET",
        "MERCADO_PAGO_SANDBOX_MODE",
    )
    activation_checkpoints = (
        "Comecar em sandbox/teste, sem checkout publico.",
        "Configurar segredo de webhook Mercado Pago fora do repositorio.",
        "Validar x-signature e x-request-id antes de processar evento.",
        "Consultar pagamento/preapproval no Mercado Pago para confirmar status real.",
        "Vincular external_reference ao usuario antes de liberar acesso pago.",
    )

    def extract_event_reference(self, payload: Mapping[str, Any]) -> str | None:
        data = payload.get("data")
        if isinstance(data, Mapping):
            return _as_text(data.get("id")) or super().extract_event_reference(payload)
        return super().extract_event_reference(payload)

    def extract_customer_reference(self, payload: Mapping[str, Any]) -> str | None:
        payer = payload.get("payer")
        if isinstance(payer, Mapping):
            return _as_text(payer.get("id")) or self._external_reference(payload)
        return self._external_reference(payload) or super().extract_customer_reference(payload)

    def _external_reference(self, payload: Mapping[str, Any]) -> str | None:
        return _as_text(payload.get("external_reference"))


PAYMENT_ADAPTERS: dict[str, PaymentProviderAdapter] = {
    "STRIPE": StripePaymentAdapter(),
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

    if normalized_provider == "STRIPE":
        if customer_id and not customer_id.startswith("cus_"):
            errors.append("Stripe Customer ID must start with cus_")
        if subscription_id and not subscription_id.startswith("sub_"):
            errors.append("Stripe Subscription ID must start with sub_")
        if last_event_id and not last_event_id.startswith("evt_"):
            errors.append("Stripe event ID must start with evt_")

    if normalized_provider == "MERCADO_PAGO":
        stripe_like_values = [
            value for value in (customer_id, subscription_id, last_event_id) if value
        ]
        if any(value.startswith(("cus_", "sub_", "evt_")) for value in stripe_like_values):
            errors.append("Mercado Pago reference cannot use Stripe ID prefixes")

    return errors


def _data_object(payload: Mapping[str, Any]) -> Mapping[str, Any]:
    data = payload.get("data")
    if not isinstance(data, Mapping):
        return {}
    data_object = data.get("object")
    return data_object if isinstance(data_object, Mapping) else {}


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
