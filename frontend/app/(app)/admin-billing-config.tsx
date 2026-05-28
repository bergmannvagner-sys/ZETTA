import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingConfig } from "@/types/auth";

const checklist = [
  "Criar conta real no Stripe ou Mercado Pago.",
  "Configurar produto e planos reais fora do app.",
  "Definir BILLING_WEBHOOK_SECRET com segredo forte no Render.",
  "Ativar BILLING_WEBHOOKS_ENABLED somente depois do teste de assinatura.",
  "Cadastrar a URL /billing/webhook no provedor.",
  "Confirmar eventos de assinatura ativa, vencida e cancelada.",
  "Verificar auditoria antes de liberar cobranca publica."
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
          Preparacao operacional para Stripe ou Mercado Pago. Esta tela nao exibe segredo e nao cria checkout.
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
