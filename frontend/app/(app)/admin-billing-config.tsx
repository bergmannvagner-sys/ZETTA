import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingConfig, BillingConfigUpdateRequest, PaymentAdapterCapability } from "@/types/auth";

const checklist = [
  "Criar conta real no Mercado Pago.",
  "Obter Access Token, Public Key e segredo de webhook definitivos no Mercado Pago Developers.",
  "Definir MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY e MERCADO_PAGO_WEBHOOK_SECRET no Render.",
  "Definir URLs de retorno MERCADO_PAGO_SUCCESS_URL, MERCADO_PAGO_PENDING_URL e MERCADO_PAGO_FAILURE_URL.",
  "Ativar BILLING_WEBHOOKS_ENABLED somente depois de validar assinatura do webhook.",
  "Cadastrar a URL /billing/mercado-pago/webhook nas notificações do Mercado Pago.",
  "Confirmar eventos de assinatura ativa, vencida e cancelada.",
  "Verificar auditoria antes de liberar cobrança para clientes reais."
];

function SwitchChip({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary/15" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"}`}
      onPress={onPress}
    >
      <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted dark:text-[#D1D5DB]"}`}>{label}</Text>
    </Pressable>
  );
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function currentValue(value?: string | null): string {
  return value?.trim() ?? "";
}

export default function AdminBillingConfig() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const config = useQuery({
    queryKey: ["admin-billing-config"],
    queryFn: () => apiRequest<BillingConfig>("/admin/billing-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const data = config.data;

  const [billingWebhooksEnabled, setBillingWebhooksEnabled] = useState(false);
  const [billingWebhookSecret, setBillingWebhookSecret] = useState("");
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState("");
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState("");
  const [mercadoPagoWebhookSecret, setMercadoPagoWebhookSecret] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [pendingUrl, setPendingUrl] = useState("");
  const [failureUrl, setFailureUrl] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }
    setBillingWebhooksEnabled(data.webhooks_enabled);
    setBillingWebhookSecret("");
    setMercadoPagoAccessToken("");
    setMercadoPagoPublicKey("");
    setMercadoPagoWebhookSecret("");
    setSuccessUrl(currentValue(data.mercado_pago_success_url));
    setPendingUrl(currentValue(data.mercado_pago_pending_url));
    setFailureUrl(currentValue(data.mercado_pago_failure_url));
  }, [data]);

  const dirty =
    billingWebhooksEnabled !== Boolean(data?.webhooks_enabled) ||
    billingWebhookSecret.trim().length > 0 ||
    mercadoPagoAccessToken.trim().length > 0 ||
    mercadoPagoPublicKey.trim().length > 0 ||
    mercadoPagoWebhookSecret.trim().length > 0 ||
    normalizeText(successUrl) !== normalizeText(currentValue(data?.mercado_pago_success_url)) ||
    normalizeText(pendingUrl) !== normalizeText(currentValue(data?.mercado_pago_pending_url)) ||
    normalizeText(failureUrl) !== normalizeText(currentValue(data?.mercado_pago_failure_url));

  const saveConfig = useMutation({
    mutationFn: () => {
      const payload: BillingConfigUpdateRequest = {};
      if (billingWebhooksEnabled !== Boolean(data?.webhooks_enabled)) {
        payload.billing_webhooks_enabled = billingWebhooksEnabled;
      }
      if (billingWebhookSecret.trim()) {
        payload.billing_webhook_secret = billingWebhookSecret.trim();
      }
      if (mercadoPagoAccessToken.trim()) {
        payload.mercado_pago_access_token = mercadoPagoAccessToken.trim();
      }
      if (mercadoPagoPublicKey.trim()) {
        payload.mercado_pago_public_key = mercadoPagoPublicKey.trim();
      }
      if (mercadoPagoWebhookSecret.trim()) {
        payload.mercado_pago_webhook_secret = mercadoPagoWebhookSecret.trim();
      }

      const successValue = normalizeText(successUrl);
      const pendingValue = normalizeText(pendingUrl);
      const failureValue = normalizeText(failureUrl);
      if (successValue !== normalizeText(currentValue(data?.mercado_pago_success_url))) {
        payload.mercado_pago_success_url = successValue || null;
      }
      if (pendingValue !== normalizeText(currentValue(data?.mercado_pago_pending_url))) {
        payload.mercado_pago_pending_url = pendingValue || null;
      }
      if (failureValue !== normalizeText(currentValue(data?.mercado_pago_failure_url))) {
        payload.mercado_pago_failure_url = failureValue || null;
      }

      return apiRequest<BillingConfig>("/admin/billing-config", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-config"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
    }
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Configuração de pagamentos"
          subtitle="Edite a integração real com Mercado Pago e as chaves que o backend usa para cobrança."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <ErrorText message={config.error?.message} />
          {config.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando configuração...</Text> : null}

          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Edição real" tone="info" />
              <Badge label="Persistido no backend" tone="warning" />
              <Badge label="Sem segredos visíveis" tone="soft" />
            </View>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              Campos secretos não são reexibidos. Preencher novamente substitui o valor salvo; deixar em branco preserva a
              configuração atual. URLs em branco restauram o valor padrão do sistema.
            </Text>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">Editor operacional</Text>
            <View className="flex-row flex-wrap gap-2">
              <SwitchChip
                active={billingWebhooksEnabled}
                label={billingWebhooksEnabled ? "Webhooks ativos" : "Webhooks desativados"}
                onPress={() => setBillingWebhooksEnabled((value) => !value)}
              />
            </View>

            <Field
              label="Billing webhook secret"
              value={billingWebhookSecret}
              onChangeText={setBillingWebhookSecret}
              secureTextEntry
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="Mercado Pago access token"
              value={mercadoPagoAccessToken}
              onChangeText={setMercadoPagoAccessToken}
              secureTextEntry
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="Mercado Pago public key"
              value={mercadoPagoPublicKey}
              onChangeText={setMercadoPagoPublicKey}
              secureTextEntry
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="Mercado Pago webhook secret"
              value={mercadoPagoWebhookSecret}
              onChangeText={setMercadoPagoWebhookSecret}
              secureTextEntry
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="URL de sucesso"
              value={successUrl}
              onChangeText={setSuccessUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Field
              label="URL pendente"
              value={pendingUrl}
              onChangeText={setPendingUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Field
              label="URL de falha"
              value={failureUrl}
              onChangeText={setFailureUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
              O backend converte essas configurações em checkout real e usa os segredos persistidos para webhook e
              autenticação Mercado Pago.
            </Text>

            <ErrorText message={saveConfig.error?.message} />
            <Button
              label="Salvar configuração"
              loading={saveConfig.isPending}
              disabled={!dirty}
              onPress={() => saveConfig.mutate()}
            />
          </Card>

          {data ? (
            <>
              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">
                  {data.webhooks_enabled ? "Webhooks de cobrança ativos" : "Webhooks de cobrança desativados"}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Badge
                    label={data.webhook_secret_configured ? "Webhook MP pronto" : "Webhook MP pendente"}
                    tone={data.webhook_secret_configured ? "info" : "soft"}
                  />
                  <Badge
                    label={data.billing_webhook_secret_configured ? "Segredo billing pronto" : "Segredo billing pendente"}
                    tone={data.billing_webhook_secret_configured ? "warning" : "soft"}
                  />
                  <Badge
                    label={data.mercado_pago_access_token_configured ? "Access token pronto" : "Access token pendente"}
                    tone={data.mercado_pago_access_token_configured ? "info" : "soft"}
                  />
                  <Badge
                    label={data.mercado_pago_public_key_configured ? "Public key pronta" : "Public key pendente"}
                    tone={data.mercado_pago_public_key_configured ? "info" : "soft"}
                  />
                  <Badge
                    label={data.mercado_pago_webhook_secret_configured ? "Webhook MP confirmado" : "Webhook MP pendente"}
                    tone={data.mercado_pago_webhook_secret_configured ? "warning" : "soft"}
                  />
                </View>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Caminho: {data.webhook_path}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Cabeçalho: {data.signature_header}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Variável de ativação: {data.enabled_env_name}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Variável do segredo: {data.secret_env_name}
                </Text>
              </Card>

              <Card>
                <Text className="text-base font-semibold text-ink dark:text-white">Provedores preparados</Text>
                <View className="flex-row flex-wrap gap-2">
                  {data.supported_providers.map((provider: string) => (
                    <View
                      key={provider}
                      className="rounded-full border border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70 px-4 py-2"
                    >
                      <Text className="text-sm font-semibold text-ink dark:text-white">{provider}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              <Card>
                <Text className="text-base font-semibold text-ink dark:text-white">Integrações locais</Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Checkout público desativado. O administrador interno pode gerar cobrança real somente para contas
                  comerciais validadas, com assinatura e auditoria.
                </Text>
                {data.provider_capabilities.map((capability: PaymentAdapterCapability) => (
                  <View
                    key={capability.provider}
                    className="gap-2 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/60 p-4"
                  >
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-base font-semibold text-ink dark:text-white">{capability.provider}</Text>
                      <Badge label={capability.checkout_enabled ? "Checkout ativo" : "Sem checkout real"} tone={capability.checkout_enabled ? "info" : "soft"} />
                      <Badge label={capability.provider_configured ? "Provedor configurado" : "Provedor pendente"} tone={capability.provider_configured ? "warning" : "soft"} />
                      {capability.production_enabled ? <Badge label="Produção pronta" tone="info" /> : null}
                    </View>
                    <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      Variáveis obrigatórias: {capability.required_env_names.join(", ") || "nenhuma"}
                    </Text>
                    <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      Cabeçalhos de assinatura: {capability.webhook_signature_headers.join(", ") || "não configurada"}
                    </Text>
                    <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      Referência do cliente: {capability.customer_reference_fields.join(", ")}
                    </Text>
                    <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      Referência do evento: {capability.event_reference_fields.join(", ")}
                    </Text>
                    {capability.activation_checkpoints.map((item: string) => (
                      <Text key={item} className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                        - {item}
                      </Text>
                    ))}
                  </View>
                ))}
              </Card>

              <Card>
                <Text className="text-base font-semibold text-ink dark:text-white">Mapeamento de status</Text>
                {(Object.entries(data.status_mapping) as Array<[string, string]>).map(([external, internal]) => (
                  <Text key={external} selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    {external} {"->"} {internal}
                  </Text>
                ))}
              </Card>
            </>
          ) : null}

          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">Checklist antes de ativar</Text>
            {checklist.map((item) => (
              <Text key={item} className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                - {item}
              </Text>
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
