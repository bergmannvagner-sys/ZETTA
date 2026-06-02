import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingConfig, PaymentAdapterCapability } from "@/types/auth";

const checklist = [
  "Criar conta real no Mercado Pago.",
  "Obter Access Token, Public Key e segredo de webhook definitivos no Mercado Pago Developers.",
  "Definir MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY e MERCADO_PAGO_WEBHOOK_SECRET no Render.",
  "Definir URLs de retorno MERCADO_PAGO_SUCCESS_URL, MERCADO_PAGO_PENDING_URL e MERCADO_PAGO_FAILURE_URL.",
  "Definir MERCADO_PAGO_WEBHOOK_SECRET com segredo forte no Render.",
  "Ativar BILLING_WEBHOOKS_ENABLED somente depois de validar assinatura do webhook.",
  "Cadastrar a URL /billing/mercado-pago/webhook nas notificacoes do Mercado Pago.",
  "Confirmar eventos de assinatura ativa, vencida e cancelada.",
  "Verificar auditoria antes de liberar cobranca para clientes reais."
];

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <View className={`rounded-full border px-4 py-2 ${active ? "border-mint bg-mint/15" : "border-white/10 bg-surface/70"}`}>
      <Text className={`text-sm font-semibold ${active ? "text-mint" : "text-muted"}`}>{label}</Text>
    </View>
  );
}

export default function AdminBillingConfig() {
  const user = useAuthStore((state) => state.user);
  const config = useQuery({
    queryKey: ["admin-billing-config"],
    queryFn: () => apiRequest<BillingConfig>("/admin/billing-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const data: BillingConfig | undefined = config.data;

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Configuracao de pagamentos</Text>
        <Text className="text-base leading-6 text-muted">
          Preparacao operacional para Mercado Pago definitivo. Esta tela nao exibe segredo e nao cria checkout publico.
        </Text>
      </View>

      <ErrorText message={config.error?.message} />
      {config.isLoading ? <Text className="text-muted">Carregando configuracao...</Text> : null}

      {data ? (
        <>
          <Card>
            <Text className="text-base font-semibold text-white">Webhook</Text>
            <View className="flex-row flex-wrap gap-2">
              <StatusPill active={data.webhooks_enabled} label={data.webhooks_enabled ? "Ativo" : "Desativado"} />
              <StatusPill
                active={data.webhook_secret_configured}
                label={data.webhook_secret_configured ? "Segredo configurado" : "Sem segredo"}
              />
            </View>
            <Text selectable className="text-sm text-muted">Rota: {data.webhook_path}</Text>
            <Text selectable className="text-sm text-muted">Header: {data.signature_header}</Text>
            <Text selectable className="text-sm text-muted">Env ativacao: {data.enabled_env_name}</Text>
            <Text selectable className="text-sm text-muted">Env segredo: {data.secret_env_name}</Text>
            <Text className="text-xs leading-5 text-muted">
              O valor do segredo nunca aparece no app. Configure apenas no ambiente seguro do backend.
            </Text>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-white">Provedores preparados</Text>
            <View className="flex-row flex-wrap gap-2">
              {data.supported_providers.map((provider: string) => (
                <View key={provider} className="rounded-full border border-white/10 bg-surface/70 px-4 py-2">
                  <Text className="text-sm font-semibold text-white">{provider}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-white">Adapters locais</Text>
            <Text className="text-sm leading-5 text-muted">
              Checkout publico desativado. O super admin pode gerar cobranca real somente para contas comerciais
              validadas, com assinatura e auditoria.
            </Text>
            {data.provider_capabilities.map((capability: PaymentAdapterCapability) => (
              <View key={capability.provider} className="gap-2 rounded-2xl border border-white/10 bg-ink/60 p-4">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-base font-semibold text-white">{capability.provider}</Text>
                  <StatusPill
                    active={capability.checkout_enabled}
                    label={capability.checkout_enabled ? "Checkout ativo" : "Sem checkout real"}
                  />
                  <StatusPill
                    active={capability.provider_configured}
                    label={capability.provider_configured ? "Provider configurado" : "Provider pendente"}
                  />
                  {capability.production_enabled ? <StatusPill active label="Producao pronta" /> : null}
                </View>
                <Text selectable className="text-xs leading-5 text-muted">
                  Env obrigatorias: {capability.required_env_names.join(", ") || "nenhuma"}
                </Text>
                <Text selectable className="text-xs leading-5 text-muted">
                  Assinatura: {capability.webhook_signature_headers.join(", ") || "nao configurada"}
                </Text>
                <Text selectable className="text-xs leading-5 text-muted">
                  Cliente: {capability.customer_reference_fields.join(", ")}
                </Text>
                <Text selectable className="text-xs leading-5 text-muted">
                  Evento: {capability.event_reference_fields.join(", ")}
                </Text>
                {capability.activation_checkpoints.map((item: string) => (
                  <Text key={item} className="text-xs leading-5 text-muted">- {item}</Text>
                ))}
              </View>
            ))}
          </Card>

          <Card>
            <Text className="text-base font-semibold text-white">Mapeamento de status</Text>
            {Object.entries(data.status_mapping).map(([external, internal]: [string, string]) => (
              <Text key={external} selectable className="text-sm leading-5 text-muted">
                {external} para {internal}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      <Card>
        <Text className="text-base font-semibold text-white">Checklist antes de ativar</Text>
        {checklist.map((item) => (
          <Text key={item} className="text-sm leading-5 text-muted">- {item}</Text>
        ))}
      </Card>
    </Screen>
  );
}
