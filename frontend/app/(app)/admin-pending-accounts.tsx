import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { PendingAccount, UserRole } from "@/types/auth";

const roleFilters: Array<{ label: string; value?: UserRole }> = [
  { label: "Todos" },
  { label: "Usuarios", value: "USER" },
  { label: "Psicologos", value: "PSYCHOLOGIST" },
  { label: "Empresas", value: "COMPANY" },
  { label: "Clinicas", value: "CLINIC" },
  { label: "Hospitais", value: "HOSPITAL" },
  { label: "ONGs", value: "NGO" }
];

function pendingPath(search: string, role?: UserRole): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (role) params.set("role", role);
  const query = params.toString();
  return `/admin/pending-accounts${query ? `?${query}` : ""}`;
}

export default function AdminPendingAccounts() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | undefined>();
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ["pending-accounts", search.trim(), role],
    queryFn: () => apiRequest<PendingAccount[]>(pendingPath(search, role)),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const moderation = useMutation({
    mutationFn: ({ path, userId }: { path: string; userId: string }) =>
      apiRequest(path, { method: "POST", body: JSON.stringify({ user_id: userId, reason: reason.trim() || null }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-accounts"] })
  });
  const accounts: PendingAccount[] = pending.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Contas pendentes</Text>
      <Field label="Buscar por nome ou email" value={search} onChangeText={setSearch} />
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
      <Field label="Observacao da decisao" value={reason} onChangeText={setReason} />
      <ErrorText message={pending.error?.message ?? moderation.error?.message} />
      {pending.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {accounts.length === 0 && !pending.isLoading ? <Text className="text-muted">Nenhuma conta pendente.</Text> : null}
      <View className="gap-3">
        {accounts.map((account: PendingAccount) => (
          <Card key={account.id}>
            <Text className="text-lg font-semibold text-white">{account.full_name}</Text>
            <Text selectable className="text-sm text-muted">{account.email}</Text>
            <Text className="text-sm text-muted">{account.role}</Text>
            {account.document_type && account.document_last4 ? (
              <Text className="text-sm text-muted">
                {account.document_type} final {account.document_last4}
              </Text>
            ) : null}
            <View className="gap-2">
              <Button
                label="Aprovar"
                onPress={() => moderation.mutate({ path: "/admin/approve-account", userId: account.id })}
              />
              <Button
                label="Rejeitar"
                tone="danger"
                onPress={() => moderation.mutate({ path: "/admin/reject-account", userId: account.id })}
              />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
