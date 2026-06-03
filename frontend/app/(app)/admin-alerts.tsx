import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AdminAlertEntry } from "@/types/auth";

const alertFilters: Array<{ label: string; value?: string }> = [
  { label: "Todos" },
  { label: "Webhooks", value: "WEBHOOK_FAILURE" },
  { label: "Financeiro", value: "PENDING_FINANCIAL" }
];

function alertsPath(alertType?: string): string {
  const params = new URLSearchParams();
  if (alertType) params.set("alert_type", alertType);
  const query = params.toString();
  return `/admin/alerts${query ? `?${query}` : ""}`;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function alertLabel(value: string): string {
  if (value === "WEBHOOK_FAILURE") return "Falha de webhook";
  if (value === "PENDING_FINANCIAL") return "Pendencia financeira";
  return value;
}

export default function AdminAlerts() {
  const user = useAuthStore((state) => state.user);
  const [alertType, setAlertType] = useState<string | undefined>();
  const alerts = useQuery({
    queryKey: ["admin-alerts", alertType],
    queryFn: () => apiRequest<AdminAlertEntry[]>(alertsPath(alertType)),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const entries = alerts.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Alertas administrativos</Text>
        <Text className="text-base leading-6 text-muted">
          Historico dos avisos enviados por email para falhas de webhook e pendencias financeiras.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
        {alertFilters.map((filter) => {
          const selected = alertType === filter.value;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={`rounded-full border px-4 py-2 ${
                selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
              onPress={() => setAlertType(filter.value)}
            >
              <Text className={`text-sm font-semibold ${selected ? "text-ink" : "text-white"}`}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={alerts.error?.message} />
      {alerts.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {entries.length === 0 && !alerts.isLoading ? (
        <Text className="text-muted">Nenhum alerta administrativo registrado.</Text>
      ) : null}

      <View className="gap-3">
        {entries.map((entry: AdminAlertEntry) => (
          <Card key={entry.id}>
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-lg font-semibold text-white">{alertLabel(entry.alert_type)}</Text>
              <Text className={`text-xs font-semibold ${entry.email_sent ? "text-mint" : "text-rose"}`}>
                {entry.email_sent ? "Email enviado" : "Email nao enviado"}
              </Text>
            </View>
            <Text selectable className="text-sm text-muted">{entry.subject ?? "Sem assunto registrado"}</Text>
            <Text className="text-sm text-muted">Origem: {entry.source}</Text>
            <Text className="text-sm text-muted">Criado em: {displayDate(entry.created_at)}</Text>
            {entry.provider ? <Text className="text-sm text-muted">Provider: {entry.provider}</Text> : null}
            {entry.event_id ? <Text selectable className="text-sm text-muted">Evento: {entry.event_id}</Text> : null}
            {entry.alerted_accounts !== null && entry.alerted_accounts !== undefined ? (
              <Text className="text-sm text-muted">Contas no alerta: {entry.alerted_accounts}</Text>
            ) : null}
            {entry.error ? (
              <View className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <Text selectable className="text-xs leading-5 text-muted">{entry.error}</Text>
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
