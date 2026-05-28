import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { PendingAccount } from "@/types/auth";

export default function AdminPendingAccounts() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ["pending-accounts"],
    queryFn: () => apiRequest<PendingAccount[]>("/admin/pending-accounts")
  });
  const moderation = useMutation({
    mutationFn: ({ path, userId }: { path: string; userId: string }) =>
      apiRequest(path, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-accounts"] })
  });
  const accounts: PendingAccount[] = pending.data ?? [];

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Contas pendentes</Text>
      <ErrorText message={pending.error?.message ?? moderation.error?.message} />
      {pending.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {accounts.length === 0 && !pending.isLoading ? <Text className="text-muted">Nenhuma conta pendente.</Text> : null}
      <View className="gap-3">
        {accounts.map((account: PendingAccount) => (
          <Card key={account.id}>
            <Text className="text-lg font-semibold text-white">{account.full_name}</Text>
            <Text selectable className="text-sm text-muted">{account.email}</Text>
            <Text className="text-sm text-muted">{account.role}</Text>
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
