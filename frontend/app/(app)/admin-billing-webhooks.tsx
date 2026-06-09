import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingWebhookMonitorEntry } from "@/types/auth";

const statusFilters: Array<{ label: string; value?: string }> = [
  { label: "Todos" },
  { label: "Processados", value: "processed" },
  { label: "Duplicados", value: "duplicate" },
  { label: "Erros", value: "error" }
];

function webhooksPath(search: string, status?: string): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (status) params.set("processing_status", status);
  params.set("provider", "MERCADO_PAGO");
  params.set("limit", "100");
  return `/admin/billing-webhooks?${params.toString()}`;
}

function displayValue(value?: string | null): string {
  return value?.trim() ? value : "Sem registro";
}

function displayDate(value: string): string {
  return new Date(value).toLocaleString();
}

function statusLabel(value: string, duplicate: boolean): string {
  if (duplicate) return "Duplicado";
  if (value === "processed") return "Processado";
  if (value === "error") return "Erro";
  return value;
}

function statusClasses(value: string, duplicate: boolean): string {
  if (duplicate) return "border-primaryDark/30 bg-primaryDark/20 text-ink dark:text-white";
  if (value === "processed") return "border-primary/30 bg-primary/15 text-primary";
  if (value === "error") return "border-rose/30 bg-rose/15 text-rose";
  return "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70 text-muted dark:text-[#D1D5DB]";
}

export default function AdminBillingWebhooks() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const webhooks = useQuery({
    queryKey: ["admin-billing-webhooks", search.trim(), selectedStatus],
    queryFn: () => apiRequest<BillingWebhookMonitorEntry[]>(webhooksPath(search, selectedStatus)),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const entries: BillingWebhookMonitorEntry[] = webhooks.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Webhooks do Mercado Pago"
          subtitle="Monitor operacional dos últimos eventos de pagamento recebidos. Esta tela não exibe segredo nem payload bruto."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 980, gap: 16 }}>
          <Field label="Buscar por e-mail, evento, status ou erro" value={search} onChangeText={setSearch} />

          <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
            {statusFilters.map((filter) => {
              const selected = selectedStatus === filter.value;
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
                  onPress={() => setSelectedStatus(filter.value)}
                >
                  <Text className={`text-sm font-semibold ${selected ? "text-ink dark:text-white" : "text-ink dark:text-white"}`}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ErrorText message={webhooks.error?.message} />
          {webhooks.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {entries.length === 0 && !webhooks.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhum webhook encontrado.</Text>
          ) : null}

          <View className="gap-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="text-lg font-semibold text-ink dark:text-white">{displayValue(entry.provider)}</Text>
                  <Text
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                      entry.processing_status,
                      entry.duplicate
                    )}`}
                  >
                    {statusLabel(entry.processing_status, entry.duplicate)}
                  </Text>
                </View>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Evento: {displayValue(entry.event_id)}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Status externo: {displayValue(entry.external_status)}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Assinatura interna: {displayValue(entry.subscription_status)}
                </Text>
                <View className="gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Conta vinculada</Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    Nome: {displayValue(entry.linked_user_name)}
                  </Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    E-mail: {displayValue(entry.linked_user_email)}
                  </Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    ID: {displayValue(entry.linked_user_id)}
                  </Text>
                </View>
                {entry.error ? (
                  <View className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3">
                    <Text className="text-xs font-semibold text-ink dark:text-white">Erro registrado</Text>
                    <Text selectable className="mt-1 text-xs leading-5 text-rose">
                      {entry.error}
                    </Text>
                  </View>
                ) : null}
                <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Recebido em: {displayDate(entry.received_at)}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
