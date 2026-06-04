import { Link, router } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import {
  hasPaidAccess,
  isPaidRole,
  paidAccessActionLabel,
  paidAccessBlockMessage,
  paidAccessBlockTitle
} from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name.split(" ")[0] ?? "voce";
  const orbSize = Math.min(276, Math.max(224, width * 0.58));
  const paidAccess = hasPaidAccess(user);
  const paidRoleBlocked = isPaidRole(user?.role) && !paidAccess;
  const careLinks = [
    { label: "Humor", route: "/(app)/mood" },
    { label: "Diario", route: "/(app)/journal" },
    { label: "Rotina", route: "/(app)/routine" },
    { label: "Compartilhar", route: "/(app)/sharing" },
    { label: "Resumo", route: "/(app)/emotional-report" }
  ];
  const professionalLinks = paidAccess && user?.role === "PSYCHOLOGIST"
    ? [{ label: "Usuarios autorizados", route: "/(app)/professional-users" }]
    : paidAccess && user?.role === "COMPANY"
      ? [{ label: "Painel NR-1", route: "/(app)/nr1" }]
      : [];

  return (
    <Screen>
      <View className="items-center gap-2 pt-3">
        <BrandLockup compact showTagline={false} />
        <Text className="text-center text-xs font-semibold tracking-[4px] text-lilac">PRESENCA</Text>
      </View>
      <View className="items-center gap-5 py-1">
        <AnimatedOrb state="idle" size={orbSize} />
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
      {paidRoleBlocked ? (
        <Card>
          <Text className="text-sm font-semibold tracking-[3px] text-mint">ACESSO COMERCIAL</Text>
          <Text className="text-base font-semibold text-white">{paidAccessBlockTitle(user)}</Text>
          <Text className="text-sm leading-5 text-muted">{paidAccessBlockMessage(user)}</Text>
          <Button
            label={paidAccessActionLabel(user)}
            tone="soft"
            onPress={() => router.push("/(app)/plans" as never)}
          />
        </Card>
      ) : null}
      {user?.role === "USER" ? (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">Cuidado continuo</Text>
          <View className="flex-row flex-wrap justify-center gap-3">
            {careLinks.map((item) => (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                onPress={() => router.push(item.route as never)}
                className="rounded-full border border-lilac/10 bg-surface/55 px-4 py-3"
              >
                <Text className="text-lilac">{item.label}</Text>
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
                className="rounded-full border border-lilac/10 bg-surface/55 px-4 py-3"
              >
                <Text className="text-lilac">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View className="flex-row justify-center gap-8 pt-2">
        <Link href="/(app)/privacy" className="text-mint">Privacidade</Link>
        <Link href="/(app)/profile" className="text-lilac">Perfil</Link>
      </View>
    </Screen>
  );
}
