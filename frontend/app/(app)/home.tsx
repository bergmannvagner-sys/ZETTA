import { Link, router } from "expo-router";
import { Text, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name.split(" ")[0] ?? "voce";

  return (
    <Screen>
      <View className="items-center gap-2 pt-3">
        <Text className="text-sm text-muted">ZETTA BERGMANN</Text>
        <Text className="text-center text-base text-muted">Aqui ninguem fica sozinho.</Text>
      </View>
      <View className="items-center gap-5 py-2">
        <AnimatedOrb state="idle" size={248} />
        <View className="items-center gap-2">
          <Text className="text-center text-base text-muted">Oi, {firstName}.</Text>
          <Text className="text-center text-3xl font-semibold text-white">Como voce esta agora?</Text>
        </View>
      </View>
      <View className="gap-3">
        <Button label="Conversar com Bergmann" onPress={() => router.push("/(app)/chat")} />
        <Button
          label="Apenas fique comigo"
          tone="soft"
          onPress={() => router.push({ pathname: "/(app)/chat", params: { mode: "silent_presence" } })}
        />
        <Button
          label="Nao consigo falar"
          tone="soft"
          onPress={() => router.push({ pathname: "/(app)/chat", params: { mode: "low_energy" } })}
        />
        <Button label="SOS" tone="danger" onPress={() => router.push("/(app)/sos")} />
      </View>
      <View className="gap-2 border-t border-white/10 pt-5">
        <Text className="text-base font-semibold text-white">Plano leve de hoje</Text>
        <Text className="text-base leading-6 text-muted">
          Respire por um minuto. Beba agua. Escolha uma pequena tarefa possivel.
        </Text>
      </View>
      <View className="flex-row justify-center gap-8 pt-2">
        <Link href="/(app)/privacy" className="text-mint">Privacidade</Link>
        <Link href="/(app)/profile" className="text-mint">Perfil</Link>
      </View>
    </Screen>
  );
}
