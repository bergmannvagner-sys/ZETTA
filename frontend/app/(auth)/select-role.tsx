import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui";
import { UserRole } from "@/types/auth";

const roles: Array<{ label: string; role: UserRole; description: string }> = [
  { label: "Pessoa fisica", role: "USER", description: "Acesso direto ao suporte emocional." },
  { label: "Psicologo", role: "PSYCHOLOGIST", description: "Conta profissional sujeita a verificacao." },
  { label: "Clinica", role: "CLINIC", description: "Gestao institucional apos analise." },
  { label: "Empresa", role: "COMPANY", description: "Uso corporativo com dados agregados." },
  { label: "ONG", role: "NGO", description: "Projetos sociais e acolhimento." },
  { label: "Hospital", role: "HOSPITAL", description: "Operacao clinica institucional." },
  { label: "Patrocinador", role: "SPONSOR", description: "Apoio a iniciativas de cuidado." },
  { label: "Instituicao publica", role: "PUBLIC_INSTITUTION", description: "SUS, UBS, CAPS e governo." }
];

export default function SelectRole() {
  return (
    <Screen>
      <View className="gap-3 pt-2">
        <BrandLockup align="left" compact showTagline={false} />
        <Text className="text-xs font-semibold tracking-[5px] text-mint">TIPO DE CONTA</Text>
        <Text className="text-3xl font-semibold text-white">Escolha seu tipo de conta</Text>
        <Text className="text-base leading-6 text-muted">
          Isso define as permissoes iniciais e o fluxo de verificacao.
        </Text>
      </View>
      <View className="gap-3">
        {roles.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.role}
            onPress={() => router.push({ pathname: "/(auth)/register", params: { role: item.role } })}
            className="rounded-xl"
          >
            <Card>
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-1">
                  <Text className="text-lg font-semibold text-white">{item.label}</Text>
                  <Text className="text-sm leading-5 text-muted">{item.description}</Text>
                </View>
                <Text className="text-xl text-mint">&gt;</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
