import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";

const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();

const sections = [
  {
    title: "Dados que tratamos",
    items: [
      "Cadastro, autenticação, perfil, status da conta e trilha de consentimento LGPD.",
      "Mensagens, diário, humor, lembretes, SOS, relatórios e vínculos de compartilhamento autorizados.",
      "Dados de teleatendimento, como sala, sessão, status, preço, comissão da plataforma e repasse financeiro.",
      "Registros técnicos necessários para segurança, auditoria, prevenção de abuso e operação do serviço."
    ]
  },
  {
    title: "Para que usamos os dados",
    items: [
      "Oferecer suporte emocional, continuidade do cuidado e recursos de autocuidado dentro do app.",
      "Liberar apenas o que foi autorizado por consentimento explícito e pelo perfil do usuário.",
      "Detectar risco, orientar ajuda humana e manter logs auditáveis para segurança e integridade.",
      "Exibir métricas agregadas para empresas, clínicas, hospitais, ONGs e instituições públicas sem expor dados individuais."
    ]
  },
  {
    title: "Monetização",
    items: [
      "O usuário comum permanece gratuito.",
      "Os perfis pagos são contratados fora do app, após validação administrativa, sem checkout público no mobile.",
      "No teleatendimento, a plataforma pode reter comissão por sessão concluída e repassar o restante ao profissional ou à clínica autorizada.",
      "Doações e apoios, quando habilitados, devem seguir canal separado e nunca desbloquear dados sensíveis sem autorização."
    ]
  },
  {
    title: "Segurança e retenção",
    items: [
      "A Bergmann limita o acesso por papel, consentimento e necessidade operacional.",
      "Dados sensíveis devem ser protegidos por controles de acesso, logs auditáveis e políticas de retenção adequadas.",
      "Quando um consentimento é revogado, os recursos sensíveis são interrompidos até novo aceite.",
      "A plataforma não substitui psicólogo, psiquiatra, médico ou emergência."
    ]
  }
] as const;

function SectionCard({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <Card>
      <View style={{ gap: 10 }}>
        <Text className="text-lg font-semibold text-ink dark:text-white">{title}</Text>
        <View style={{ gap: 8 }}>
          {items.map((item) => (
            <Text key={item} className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              - {item}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

export default function PrivacyPolicy() {
  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <PageHero
          kicker="Legal"
          title="Política de Privacidade"
          subtitle="Versão pública da Bergmann para usuários, revisores e parceiros. Este resumo descreve como o app trata dados, pagamento e teleatendimento."
          orbState="calm"
        />

        <View style={{ gap: 18, maxWidth: 920, width: "100%" }}>
          <Card>
            <View style={{ gap: 12 }}>
              <Text className="text-lg font-semibold text-ink dark:text-white">Resumo operacional</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                A Bergmann trata dados de saúde emocional com consentimento explícito, segregação por perfil e
                controles de acesso. O usuário comum usa o app gratuitamente. Perfis pagos são contratados fora do
                mobile e o teleatendimento possui comissão por sessão concluída.
              </Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                O objetivo é apoiar cuidado emocional, prevenção de crises e encaminhamento humano sem substituir
                atendimento clínico, diagnóstico ou emergência.
              </Text>
            </View>
          </Card>

          {sections.map((section) => (
            <SectionCard key={section.title} title={section.title} items={section.items} />
          ))}

          <Card>
            <View style={{ gap: 10 }}>
              <Text className="text-lg font-semibold text-ink dark:text-white">Contato e direitos</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                {supportEmail
                  ? `Canal oficial de suporte e privacidade: ${supportEmail}.`
                  : "Canal oficial de suporte e privacidade: configure EXPO_PUBLIC_SUPPORT_EMAIL antes da publicação final."}
              </Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                O usuário pode revisar, exportar e revogar consentimentos nas telas próprias do app. As regras
                completas de uso ficam complementadas pelos termos de uso.
              </Text>
            </View>
          </Card>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Button label="Termos de uso" tone="soft" onPress={() => router.push("/terms" as never)} />
            </View>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Button label="Acessar o app" onPress={() => router.push("/(auth)/login" as never)} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
