import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui";
import { useAppTheme, useResponsiveLayout } from "@/design-system/theme";
import { UserRole } from "@/types/auth";

const roles: Array<{ label: string; role: UserRole; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: "Pessoa física", role: "USER", description: "Acesso direto ao suporte emocional.", icon: "person-outline" },
  { label: "Psicólogo", role: "PSYCHOLOGIST", description: "Conta profissional sujeita à verificação.", icon: "medical-outline" },
  { label: "Clínica", role: "CLINIC", description: "Gestão institucional após análise.", icon: "business-outline" },
  { label: "Empresa", role: "COMPANY", description: "Uso corporativo com dados agregados.", icon: "briefcase-outline" },
  { label: "ONG", role: "NGO", description: "Projetos sociais e acolhimento.", icon: "heart-outline" },
  { label: "Hospital", role: "HOSPITAL", description: "Operação clínica institucional.", icon: "pulse-outline" },
  { label: "Patrocinador", role: "SPONSOR", description: "Apoio a iniciativas de cuidado.", icon: "star-outline" },
  { label: "Instituição pública", role: "PUBLIC_INSTITUTION", description: "SUS, UBS, CAPS e governo.", icon: "shield-checkmark-outline" }
];

export default function SelectRole() {
  const { colors } = useAppTheme();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const contentMaxWidth = isMobile ? 640 : isDesktop ? 1080 : 920;
  const cardWidth = isMobile ? "100%" : isDesktop ? "32.5%" : "48%";

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          accent={colors.primaryDark}
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
                  <View style={{ alignItems: "center", flexDirection: "row", gap: 16, justifyContent: "space-between" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                        <Ionicons color={colors.primary} name={item.icon} size={18} />
                        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>
                          {item.label}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{item.description}</Text>
                    </View>
                    <Ionicons color={colors.primary} name="chevron-forward" size={22} />
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
