import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import { hasPaidAccess, planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { getMyConnectionCode } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const canShareCode =
    user?.status === "ACTIVE" && (user.role === "PSYCHOLOGIST" || user.role === "COMPANY") && hasPaidAccess(user);
  const connectionCode = useQuery({
    queryKey: ["my-connection-code"],
    queryFn: getMyConnectionCode,
    enabled: canShareCode
  });

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Perfil</Text>
      <Card>
        <Text selectable className="text-base text-white">{user?.full_name}</Text>
        <Text selectable className="text-sm text-muted">{user?.email}</Text>
        <Text selectable className="text-sm text-muted">Perfil: {user?.role}</Text>
        <Text selectable className="text-sm text-muted">Status: {user?.status}</Text>
        <Text selectable className="text-sm text-muted">
          Plano: {planLabel(user?.subscription_plan)}
        </Text>
        <Text selectable className="text-sm text-muted">
          Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
        </Text>
        {canShareCode && connectionCode.data ? (
          <Text selectable className="text-sm text-mint">Codigo de conexao: {connectionCode.data.connection_code}</Text>
        ) : null}
      </Card>
      {user?.role === "SUPER_ADMIN" ? (
        <>
          <Button
            label="Resumo operacional"
            tone="soft"
            onPress={() => router.push("/(app)/admin-operations" as never)}
          />
          <Button
            label="Contas pendentes"
            tone="soft"
            onPress={() => router.push("/(app)/admin-pending-accounts")}
          />
          <Button
            label="Assinaturas"
            tone="soft"
            onPress={() => router.push("/(app)/admin-subscriptions" as never)}
          />
          <Button
            label="Pendencias financeiras"
            tone="soft"
            onPress={() => router.push("/(app)/admin-billing-pending" as never)}
          />
          <Button
            label="Contas moderadas"
            tone="soft"
            onPress={() => router.push("/(app)/admin-moderated-accounts" as never)}
          />
          <Button
            label="Planos comerciais"
            tone="soft"
            onPress={() => router.push("/(app)/admin-commercial-plans" as never)}
          />
          <Button
            label="Configurar pagamentos"
            tone="soft"
            onPress={() => router.push("/(app)/admin-billing-config" as never)}
          />
          <Button
            label="Monitorar webhooks"
            tone="soft"
            onPress={() => router.push("/(app)/admin-billing-webhooks" as never)}
          />
          <Button
            label="Alertas administrativos"
            tone="soft"
            onPress={() => router.push("/(app)/admin-alerts" as never)}
          />
          <Button
            label="Configurar email"
            tone="soft"
            onPress={() => router.push("/(app)/admin-email-config" as never)}
          />
          <Button
            label="Auditoria"
            tone="soft"
            onPress={() => router.push("/(app)/admin-audit" as never)}
          />
        </>
      ) : null}
      <Button
        label="Plano e acesso"
        tone="soft"
        onPress={() => router.push("/(app)/plans" as never)}
      />
      <Button
        label="Sair"
        tone="soft"
        onPress={async () => {
          await clearSession();
          router.replace("/(auth)/login");
        }}
      />
    </Screen>
  );
}
