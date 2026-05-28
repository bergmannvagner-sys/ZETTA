import { Link, router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name.split(" ")[0] ?? "voce";
  const careLinks = [
    { label: "Humor", route: "/(app)/mood" },
    { label: "Diario", route: "/(app)/journal" },
    { label: "Compartilhar", route: "/(app)/sharing" },
    { label: "Resumo", route: "/(app)/emotional-report" }
  ];
  const professionalLinks = user?.role === "PSYCHOLOGIST"
    ? [{ label: "Usuarios autorizados", route: "/(app)/professional-users" }]
    : user?.role === "COMPANY"
      ? [{ label: "Painel NR-1", route: "/(app)/nr1" }]
      : [];

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
      {user?.role === "USER" ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">Cuidado continuo</Text>
          <View className="flex-row flex-wrap justify-center gap-3">
            {careLinks.map((item) => (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                onPress={() => router.push(item.route as never)}
                className="rounded-full border border-white/10 bg-surface/55 px-4 py-3"
              >
                <Text className="text-mint">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {professionalLinks.length ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">
            {user?.role === "COMPANY" ? "Saude organizacional" : "Acompanhamento autorizado"}
          </Text>
          <View className="flex-row flex-wrap justify-center gap-3">
            {professionalLinks.map((item) => (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                onPress={() => router.push(item.route as never)}
                className="rounded-full border border-white/10 bg-surface/55 px-4 py-3"
              >
                <Text className="text-mint">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View className="flex-row justify-center gap-8 pt-2">
        <Link href="/(app)/privacy" className="text-mint">Privacidade</Link>
        <Link href="/(app)/profile" className="text-mint">Perfil</Link>
      </View>
    </Screen>
  );
}
