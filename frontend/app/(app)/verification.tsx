import { router } from "expo-router";
import { Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
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
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker="Verificação"
          orbState="thinking"
          subtitle="Recebemos seu cadastro. A validação protege usuários, reduz perfis falsos e mantém os dados sensíveis seguros."
          title="Conta em análise"
        />

        <View style={{ maxWidth: 560, minWidth: 0, width: "100%" }}>
          <View className="gap-3">
            <Card>
              <View className="gap-3">
                <Text className="text-base leading-6 text-ink dark:text-white">
                  Todas as contas passam por validação para proteger os usuários, reduzir perfis falsos e manter os
                  dados sensíveis seguros.
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Status atual: {user?.status ?? "PENDING_VERIFICATION"}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{documentLabel}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Plano: {planLabel(user?.subscription_plan)}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
                </Text>
              </View>
            </Card>

            <Card>
              <View className="gap-3">
                <Text className="text-base font-semibold text-ink dark:text-white">Próximos passos</Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  A equipe revisa seu perfil e libera o acesso quando os dados forem consistentes. Perfis
                  profissionais e institucionais usam plano pago; a assinatura real precisa estar ativa antes do
                  acesso comercial.
                </Text>
              </View>
            </Card>

            <View className="gap-3">
              <Button label="Ver perfil" tone="soft" onPress={() => router.push("/(app)/profile")} />
              <Button label="Plano e acesso" tone="soft" onPress={() => router.push("/(app)/plans" as never)} />
              <Button
                label="Sair"
                tone="soft"
                onPress={async () => {
                  await clearSession();
                  router.replace("/(auth)/login");
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
