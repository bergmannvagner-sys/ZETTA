import { router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";

export default function Verification() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Conta em analise</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          Recebemos seu cadastro. Contas profissionais e institucionais passam por verificacao antes
          de acessar areas sensiveis.
        </Text>
        <Text selectable className="text-sm text-muted">
          Status atual: {user?.status ?? "PENDING_VERIFICATION"}
        </Text>
      </Card>
      <View className="gap-3">
        <Button
          label="Ver perfil"
          tone="soft"
          onPress={() => router.push("/(app)/profile")}
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
