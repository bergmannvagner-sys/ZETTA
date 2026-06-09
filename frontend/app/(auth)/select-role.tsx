import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui";
import { useResponsiveLayout } from "@/design-system/theme";
import { UserRole } from "@/types/auth";

const roles: Array<{ label: string; role: UserRole; description: string }> = [
  { label: "Pessoa física", role: "USER", description: "Acesso direto ao suporte emocional." },
  { label: "Psicólogo", role: "PSYCHOLOGIST", description: "Conta profissional sujeita à verificação." },
  { label: "Clínica", role: "CLINIC", description: "Gestão institucional após análise." },
  { label: "Empresa", role: "COMPANY", description: "Uso corporativo com dados agregados." },
  { label: "ONG", role: "NGO", description: "Projetos sociais e acolhimento." },
  { label: "Hospital", role: "HOSPITAL", description: "Operação clínica institucional." },
  { label: "Patrocinador", role: "SPONSOR", description: "Apoio a iniciativas de cuidado." },
  { label: "Instituição pública", role: "PUBLIC_INSTITUTION", description: "SUS, UBS, CAPS e governo." }
];

export default function SelectRole() {
  const { isDesktop, isMobile } = useResponsiveLayout();
  const contentMaxWidth = isMobile ? 640 : isDesktop ? 1080 : 920;
  const cardWidth = isMobile ? "100%" : isDesktop ? "32.5%" : "48%";

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker="Tipo de conta"
          orbSize={isMobile ? 200 : 184}
          subtitle="Isso define as permissões iniciais e o fluxo de verificação."
          title="Escolha seu tipo de conta"
        />
        <View style={{ maxWidth: contentMaxWidth, width: "100%" }}>
          <View style={{ flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 12 }}>
            {roles.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.role}
                onPress={() => router.push({ pathname: "/(auth)/register", params: { role: item.role } })}
                style={{ width: cardWidth }}
              >
                <Card>
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1 gap-1">
                      <Text className="text-lg font-semibold text-ink dark:text-white">{item.label}</Text>
                      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.description}</Text>
                    </View>
                    <Text className="text-xl text-primary">&gt;</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
