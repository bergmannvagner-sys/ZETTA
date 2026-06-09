import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
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
  "Ativar BILLING_WEBHOOKS_ENABLED somente depois de validar assinatura do webhook.",
  "Cadastrar a URL /billing/mercado-pago/webhook nas notificações do Mercado Pago.",
  "Confirmar eventos de assinatura ativa, vencida e cancelada.",
  "Verificar auditoria antes de liberar cobrança para clientes reais."
];

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <View className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary/15" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"}`}>
      <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted dark:text-[#D1D5DB]"}`}>{label}</Text>
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
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Configuração de pagamentos"
          subtitle="Preparação operacional para Mercado Pago definitivo. Esta tela não exibe segredos e não cria checkout público."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <ErrorText message={config.error?.message} />
          {config.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando configuração...</Text> : null}

          {data ? (
            <>
              <Card>
                <Text className="text-base font-semibold text-ink dark:text-white">Webhook</Text>
                <View className="flex-row flex-wrap gap-2">
                  <StatusPill active={data.webhooks_enabled} label={data.webhooks_enabled ? "Ativo" : "Desativado"} />
                  <StatusPill
                    active={data.webhook_secret_configured}
                    label={data.webhook_secret_configured ? "Segredo configurado" : "Sem segredo"}
                  />
                </View>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Caminho: {data.webhook_path}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Cabeçalho: {data.signature_header}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Variável de ativação: {data.enabled_env_name}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Variável do segredo: {data.secret_env_name}</Text>
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  O valor do segredo nunca aparece no app. Configure-o apenas no ambiente seguro do backend.
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
                  Checkout público desativado. O administrador interno pode gerar cobrança real somente para contas comerciais
                  validadas, com assinatura e auditoria.
                </Text>
                {data.provider_capabilities.map((capability: PaymentAdapterCapability) => (
                  <View
                    key={capability.provider}
                    className="gap-2 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/60 p-4"
                  >
                    <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-base font-semibold text-ink dark:text-white">{capability.provider}</Text>
                      <StatusPill
                        active={capability.checkout_enabled}
                        label={capability.checkout_enabled ? "Checkout ativo" : "Sem checkout real"}
                      />
                      <StatusPill
                        active={capability.provider_configured}
                    label={capability.provider_configured ? "Provedor configurado" : "Provedor pendente"}
                      />
                      {capability.production_enabled ? <StatusPill active label="Produção pronta" /> : null}
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
                {Object.entries(data.status_mapping).map(([external, internal]: [string, string]) => (
                  <Text key={external} selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    {external} para {internal}
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
