import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AuditLogEntry } from "@/types/auth";

function shortId(value?: string | null): string {
  if (!value) {
    return "-";
  }
  return value.length > 8 ? value.slice(-8) : value;
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export default function AdminAudit() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const auditLogs = useQuery({
    queryKey: ["admin-audit-logs", search.trim()],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "80" });
      if (search.trim()) params.set("q", search.trim());
      return apiRequest<AuditLogEntry[]>(`/admin/audit-logs?${params.toString()}`);
    },
    enabled: user?.role === "SUPER_ADMIN"
  });
  const logs: AuditLogEntry[] = auditLogs.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Auditoria"
          subtitle="Eventos administrativos e de segurança. Esta tela não exibe conversas, diário ou conteúdo emocional privado."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <Field label="Buscar por ação, recurso, ID ou metadado" value={search} onChangeText={setSearch} />

          <ErrorText message={auditLogs.error?.message} />
          {auditLogs.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {logs.length === 0 && !auditLogs.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhum evento de auditoria encontrado.</Text>
          ) : null}

          <View className="gap-3">
            {logs.map((log) => {
              const metadata = Object.entries(log.metadata ?? {});
              return (
                <Card key={log.id}>
                  <Text className="text-lg font-semibold text-ink dark:text-white">{log.action}</Text>
                  <Text className="text-sm text-muted dark:text-[#D1D5DB]">Recurso: {log.resource_type}</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">ID: {shortId(log.resource_id)}</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Ator: {shortId(log.actor_user_id)}</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Alvo: {shortId(log.target_user_id)}</Text>
                  <Text className="text-xs text-muted dark:text-[#D1D5DB]">{log.created_at}</Text>
                  {metadata.length > 0 ? (
                    <View className="mt-2 gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/40 p-3">
                      {metadata.map(([key, value]) => (
                        <Text key={key} selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                          {key}: {formatMetadataValue(value)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}
