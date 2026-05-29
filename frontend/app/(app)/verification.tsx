import { router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";

export default function Verification() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const documentLabel =
    user?.document_type && user?.document_last4
      ? `${user.document_type} final ${user.document_last4}`
      : "Documento recebido";

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Conta em analise</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          Recebemos seu cadastro. Todas as contas passam por validacao para proteger os usuarios,
          reduzir perfis falsos e manter os dados sensiveis seguros.
        </Text>
        <Text selectable className="text-sm text-muted">
          Status atual: {user?.status ?? "PENDING_VERIFICATION"}
        </Text>
        <Text selectable className="text-sm text-muted">
          {documentLabel}
        </Text>
        <Text selectable className="text-sm text-muted">
          Plano: {planLabel(user?.subscription_plan)}
        </Text>
        <Text selectable className="text-sm text-muted">
          Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
        </Text>
      </Card>
      <Card>
        <Text className="text-base font-semibold text-white">Proximos passos</Text>
        <Text className="text-sm leading-5 text-muted">
          A equipe revisa seu perfil e libera o acesso quando os dados forem consistentes.
          Perfis profissionais e institucionais usam plano pago; a assinatura real precisa estar ativa
          antes do acesso comercial.
        </Text>
      </Card>
      <View className="gap-3">
        <Button
          label="Ver perfil"
          tone="soft"
          onPress={() => router.push("/(app)/profile")}
        />
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
      </View>
    </Screen>
  );
}
