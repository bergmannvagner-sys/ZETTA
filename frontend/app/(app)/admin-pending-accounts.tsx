import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { PendingAccount, UserRole } from "@/types/auth";

const roleFilters: Array<{ label: string; value?: UserRole }> = [
  { label: "Todos" },
  { label: "Usuários", value: "USER" },
  { label: "Psicólogos", value: "PSYCHOLOGIST" },
  { label: "Empresas", value: "COMPANY" },
  { label: "Clínicas", value: "CLINIC" },
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

function recommendationLabel(value: string): string {
  if (value === "REVIEW_APPROVE") return "Triagem favorável";
  if (value === "HIGH_RISK_REVIEW") return "Revisão rigorosa";
  return "Revisão manual";
}

function recommendationClass(value: string): string {
  if (value === "REVIEW_APPROVE") return "border-primary/25 bg-primary/10";
  if (value === "HIGH_RISK_REVIEW") return "border-rose/25 bg-rose/10";
  return "border-primaryDark/25 bg-primaryDark/10";
}

function recommendationTextClass(value: string): string {
  if (value === "REVIEW_APPROVE") return "text-primary";
  if (value === "HIGH_RISK_REVIEW") return "text-rose";
  return "text-primaryDark";
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
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Contas pendentes"
          subtitle="Revisão de contas antes da liberação comercial. A triagem ajuda a decisão, mas não aprova sozinha."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <Field label="Buscar por nome ou e-mail" value={search} onChangeText={setSearch} />
          <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
            {roleFilters.map((filter) => {
              const selected = role === filter.value;
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
                  onPress={() => setRole(filter.value)}
                >
                  <Text className={`text-sm font-semibold ${selected ? "text-ink dark:text-white" : "text-ink dark:text-white"}`}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Observação da decisão" value={reason} onChangeText={setReason} />
          <ErrorText message={pending.error?.message ?? moderation.error?.message} />
          {pending.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {accounts.length === 0 && !pending.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhuma conta pendente.</Text>
          ) : null}
          <View className="gap-3">
            {accounts.map((account: PendingAccount) => (
              <Card key={account.id}>
                <Text className="text-lg font-semibold text-ink dark:text-white">{account.full_name}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{account.email}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">{account.role}</Text>
                {account.document_type && account.document_last4 ? (
                  <Text className="text-sm text-muted dark:text-[#D1D5DB]">
                    {account.document_type} final {account.document_last4}
                  </Text>
                ) : null}
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Plano: {planLabel(account.subscription_plan)}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">
                  Assinatura após decisão: {subscriptionStatusLabel(account.subscription_status)}
                </Text>
                <View className={`rounded-xl border px-3 py-2 ${recommendationClass(account.verification_recommendation)}`}>
                  <Text className={`text-sm font-semibold ${recommendationTextClass(account.verification_recommendation)}`}>
                    {recommendationLabel(account.verification_recommendation)} - {account.verification_score}/100
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-xs font-semibold text-muted dark:text-[#D1D5DB]">Sinais da triagem</Text>
                  {account.verification_signals.map((signal) => (
                    <Text key={signal} className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      - {signal}
                    </Text>
                  ))}
                  {account.verification_warnings.map((warning) => (
                    <Text key={warning} className="text-xs leading-5 text-primaryDark">
                      - {warning}
                    </Text>
                  ))}
                </View>
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  A triagem ajuda a revisão, mas não aprova sozinha. Ao aprovar, perfis pagos entram
                  como pendentes de assinatura real antes do acesso comercial.
                </Text>
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
                  {account.email.startsWith("qa-") || account.email.endsWith("@example.com") ? (
                    <Button
                      label="Arquivar QA"
                      tone="soft"
                      onPress={() => moderation.mutate({ path: "/admin/archive-account", userId: account.id })}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
