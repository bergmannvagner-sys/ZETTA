import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { AccountStatus, AuditLogEntry, SubscriptionAccount, UserRole } from "@/types/auth";

const roleFilters: Array<{ label: string; value?: UserRole }> = [
  { label: "Todos" },
  { label: "Usuarios", value: "USER" },
  { label: "Psicologos", value: "PSYCHOLOGIST" },
  { label: "Empresas", value: "COMPANY" },
  { label: "Clinicas", value: "CLINIC" },
  { label: "Hospitais", value: "HOSPITAL" },
  { label: "ONGs", value: "NGO" },
  { label: "Patroc.", value: "SPONSOR" },
  { label: "Publicas", value: "PUBLIC_INSTITUTION" }
];

const statusFilters: Array<{ label: string; value?: Extract<AccountStatus, "REJECTED" | "ARCHIVED"> }> = [
  { label: "Todas" },
  { label: "Rejeitadas", value: "REJECTED" },
  { label: "Arquivadas", value: "ARCHIVED" }
];

function moderatedPath(
  search: string,
  role?: UserRole,
  accountStatus?: Extract<AccountStatus, "REJECTED" | "ARCHIVED">
): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (role) params.set("role", role);
  if (accountStatus) params.set("account_status", accountStatus);
  const query = params.toString();
  return `/admin/moderated-accounts${query ? `?${query}` : ""}`;
}

function statusClass(status: AccountStatus): string {
  if (status === "ARCHIVED") return "border-violet/30 bg-violet/15 text-lilac";
  if (status === "REJECTED") return "border-rose/25 bg-rose/10 text-rose";
  return "border-white/10 bg-surface/70 text-muted";
}

function auditSummary(entry: AuditLogEntry): string {
  const reason = typeof entry.metadata?.reason === "string" && entry.metadata.reason ? ` - ${entry.metadata.reason}` : "";
  const previous = typeof entry.metadata?.previous_status === "string" ? ` de ${entry.metadata.previous_status}` : "";
  return `${entry.action}${previous}${reason}`;
}

export default function AdminModeratedAccounts() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | undefined>();
  const [accountStatus, setAccountStatus] = useState<Extract<AccountStatus, "REJECTED" | "ARCHIVED"> | undefined>();

  const accountsQuery = useQuery({
    queryKey: ["moderated-accounts", search.trim(), role, accountStatus],
    queryFn: () => apiRequest<SubscriptionAccount[]>(moderatedPath(search, role, accountStatus)),
    enabled: user?.role === "SUPER_ADMIN"
  });

  const auditQuery = useQuery({
    queryKey: ["moderated-account-audit"],
    queryFn: () => apiRequest<AuditLogEntry[]>("/admin/audit-logs?resource_type=user&limit=100"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  const accounts = accountsQuery.data ?? [];
  const auditEntries = auditQuery.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">GOVERNANCA</Text>
        <Text className="text-3xl font-semibold text-white">Contas moderadas</Text>
        <Text className="text-base leading-6 text-muted">
          Acompanhe contas rejeitadas e arquivadas sem exclusao fisica, mantendo rastreabilidade.
        </Text>
      </View>

      <Field label="Buscar por nome ou email" value={search} onChangeText={setSearch} />

      <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
        {statusFilters.map((filter) => {
          const selected = accountStatus === filter.value;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={`rounded-full border px-4 py-2 ${
                selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
              onPress={() => setAccountStatus(filter.value)}
            >
              <Text className={`text-sm font-semibold ${selected ? "text-ink" : "text-white"}`}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
        {roleFilters.map((filter) => {
          const selected = role === filter.value;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={`rounded-full border px-4 py-2 ${
                selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
              onPress={() => setRole(filter.value)}
            >
              <Text className={`text-sm font-semibold ${selected ? "text-ink" : "text-white"}`}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={accountsQuery.error?.message ?? auditQuery.error?.message} />
      {accountsQuery.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {accounts.length === 0 && !accountsQuery.isLoading ? (
        <Text className="text-muted">Nenhuma conta moderada encontrada.</Text>
      ) : null}

      <View className="gap-3">
        {accounts.map((account: SubscriptionAccount) => {
          const history = auditEntries.filter((entry: AuditLogEntry) => entry.target_user_id === account.id);
          return (
            <Card key={account.id}>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-lg font-semibold text-white">{account.full_name}</Text>
                <View className={`rounded-full border px-3 py-1 ${statusClass(account.status)}`}>
                  <Text className={`text-xs font-semibold ${statusClass(account.status).split(" ").at(-1)}`}>
                    {account.status}
                  </Text>
                </View>
              </View>
              <Text selectable className="text-sm text-muted">{account.email}</Text>
              <Text className="text-sm text-muted">Perfil: {account.role}</Text>
              {account.document_type && account.document_last4 ? (
                <Text className="text-sm text-muted">
                  {account.document_type} final {account.document_last4}
                </Text>
              ) : null}
              <Text className="text-sm text-muted">Plano: {planLabel(account.subscription_plan)}</Text>
              <Text className="text-sm text-muted">
                Assinatura: {subscriptionStatusLabel(account.subscription_status)}
              </Text>
              <Text className="text-xs leading-5 text-muted">
                Criada em {new Date(account.created_at).toLocaleString()}. Dados sensiveis continuam protegidos e
                esta tela nao permite exclusao fisica.
              </Text>
              <View className="gap-2 rounded-xl border border-white/10 bg-ink/35 p-3">
                <Text className="text-xs font-semibold text-white">Historico de auditoria</Text>
                {history.length === 0 ? (
                  <Text className="text-xs leading-5 text-muted">Nenhum evento recente encontrado.</Text>
                ) : (
                  history.slice(0, 4).map((entry: AuditLogEntry) => (
                    <Text key={entry.id} selectable className="text-xs leading-5 text-muted">
                      {new Date(entry.created_at).toLocaleString()} - {auditSummary(entry)}
                    </Text>
                  ))
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
