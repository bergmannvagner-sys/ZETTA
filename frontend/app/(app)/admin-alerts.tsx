import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AdminAlertEntry } from "@/types/auth";

const alertFilters: Array<{ label: string; value?: string }> = [
  { label: "Todos" },
  { label: "Webhooks", value: "WEBHOOK_FAILURE" },
  { label: "Financeiro", value: "PENDING_FINANCIAL" }
];

const deliveryFilters: Array<{ label: string; value?: boolean }> = [
  { label: "Todos" },
  { label: "Enviados", value: true },
  { label: "Não enviados", value: false }
];

const triggerFilters: Array<{ label: string; value?: string }> = [
  { label: "Todos" },
  { label: "Automáticos", value: "scheduled" },
  { label: "Manuais", value: "manual" }
];

function alertsPath(search: string, alertType?: string, emailSent?: boolean, trigger?: string): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (alertType) params.set("alert_type", alertType);
  if (emailSent !== undefined) params.set("email_sent", String(emailSent));
  if (trigger) params.set("trigger", trigger);
  const query = params.toString();
  return `/admin/alerts${query ? `?${query}` : ""}`;
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function alertLabel(value: string): string {
  if (value === "WEBHOOK_FAILURE") return "Falha de webhook";
  if (value === "PENDING_FINANCIAL") return "Pendência financeira";
  return value;
}

function triggerLabel(value?: string | null): string {
  if (value === "scheduled") return "automático";
  if (value === "manual") return "manual";
  return value ?? "sem gatilho";
}

export default function AdminAlerts() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [alertType, setAlertType] = useState<string | undefined>();
  const [emailSent, setEmailSent] = useState<boolean | undefined>();
  const [trigger, setTrigger] = useState<string | undefined>();
  const alerts = useQuery({
    queryKey: ["admin-alerts", search.trim(), alertType, emailSent, trigger],
    queryFn: () => apiRequest<AdminAlertEntry[]>(alertsPath(search, alertType, emailSent, trigger)),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const entries = alerts.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Alertas administrativos"
          subtitle="Histórico dos avisos enviados por e-mail para falhas de webhook e pendências financeiras."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 960, gap: 16 }}>
          <Field label="Buscar por assunto, evento, erro ou provedor" value={search} onChangeText={setSearch} />

          <View className="gap-2">
            <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
              {alertFilters.map((filter) => {
                const selected = alertType === filter.value;
                return (
                  <Pressable
                    key={filter.label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    className={`rounded-full border px-4 py-2 ${
                      selected
                        ? "border-primary bg-primaryLight"
                        : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
                    }`}
                    onPress={() => setAlertType(filter.value)}
                  >
                    <Text className="text-sm font-semibold text-ink dark:text-white">{filter.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
              {deliveryFilters.map((filter) => {
                const selected = emailSent === filter.value;
                return (
                  <Pressable
                    key={filter.label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    className={`rounded-full border px-4 py-2 ${
                      selected
                        ? "border-primaryDark bg-primaryDark/80"
                        : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
                    }`}
                    onPress={() => setEmailSent(filter.value)}
                  >
                    <Text className="text-sm font-semibold text-ink dark:text-white">{filter.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
              {triggerFilters.map((filter) => {
                const selected = trigger === filter.value;
                return (
                  <Pressable
                    key={filter.label}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    className={`rounded-full border px-4 py-2 ${
                      selected
                        ? "border-primary bg-primaryLight/70"
                        : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
                    }`}
                    onPress={() => setTrigger(filter.value)}
                  >
                    <Text className="text-sm font-semibold text-ink dark:text-white">{filter.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ErrorText message={alerts.error?.message} />
          {alerts.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {entries.length === 0 && !alerts.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhum alerta administrativo registrado.</Text>
          ) : null}

          <View className="gap-3">
            {entries.map((entry: AdminAlertEntry) => (
              <Card key={entry.id}>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="text-lg font-semibold text-ink dark:text-white">{alertLabel(entry.alert_type)}</Text>
                  <Text className={`text-xs font-semibold ${entry.email_sent ? "text-primary" : "text-rose"}`}>
                    {entry.email_sent ? "E-mail enviado" : "E-mail não enviado"}
                  </Text>
                </View>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  {entry.subject ?? "Sem assunto registrado"}
                </Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Origem: {entry.source}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Criado em: {displayDate(entry.created_at)}</Text>
                {entry.trigger ? <Text className="text-sm text-muted dark:text-[#D1D5DB]">Gatilho: {triggerLabel(entry.trigger)}</Text> : null}
              {entry.provider ? <Text className="text-sm text-muted dark:text-[#D1D5DB]">Provedor: {entry.provider}</Text> : null}
                {entry.event_id ? <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Evento: {entry.event_id}</Text> : null}
                {entry.days_threshold !== null && entry.days_threshold !== undefined ? (
                  <Text className="text-sm text-muted dark:text-[#D1D5DB]">Limite: {entry.days_threshold} dia(s)</Text>
                ) : null}
                {entry.checked_accounts !== null && entry.checked_accounts !== undefined ? (
                  <Text className="text-sm text-muted dark:text-[#D1D5DB]">
                    Verificadas: {entry.checked_accounts} | Pendentes: {entry.pending_accounts ?? 0}
                  </Text>
                ) : null}
                {entry.alerted_accounts !== null && entry.alerted_accounts !== undefined ? (
                  <Text className="text-sm text-muted dark:text-[#D1D5DB]">Contas no alerta: {entry.alerted_accounts}</Text>
                ) : null}
                {entry.error ? (
                  <View className="rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
                    <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      {entry.error}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
