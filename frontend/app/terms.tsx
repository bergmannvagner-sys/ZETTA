import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";

const sections = [
  {
    title: "Uso permitido",
    items: [
      "Autocuidado emocional, organização de rotina, acompanhamento de humor e SOS.",
      "Teleatendimento, agenda e acompanhamento profissional apenas para perfis autorizados.",
      "Painéis agregados para clínicas, hospitais, ONGs, empresas e instituições públicas dentro do consentimento aplicável.",
      "Compartilhamento entre usuários e profissionais somente quando houver autorização explícita."
    ]
  },
  {
    title: "Cobrança e receita",
    items: [
      "O usuário comum permanece gratuito.",
      "Mensalidades de perfis pagos são contratadas fora do app, após validação administrativa.",
      "A plataforma pode cobrar comissão sobre sessões de teleatendimento concluídas.",
      "Qualquer doação, apoio ou patrocínio deve ser separado do acesso a dados sensíveis e não pode simular checkout público dentro do app."
    ]
  },
  {
    title: "Limites da plataforma",
    items: [
      "A IA empática não substitui diagnóstico, prescrição, psicoterapia ou emergência.",
      "Em crise, o app deve orientar ajuda humana, CVV 188 no Brasil e emergência local quando houver risco imediato.",
      "Os dados são exibidos por perfil e consentimento; empresas não acessam informações individuais sem autorização.",
      "O sistema pode bloquear, suspender ou arquivar contas quando houver abuso, fraude ou violação de política."
    ]
  },
  {
    title: "Responsabilidades do usuário",
    items: [
      "Manter credenciais seguras e informar dados verdadeiros.",
      "Não usar o sistema para perseguir, ameaçar, fraudar ou explorar terceiros.",
      "Respeitar consentimentos, limites de acesso e orientações de segurança.",
      "Procurar atendimento humano imediato sempre que houver risco clínico ou emocional relevante."
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

export default function Terms() {
  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <PageHero
          kicker="Legal"
          title="Termos de Uso"
          subtitle="Regras públicas de uso da Bergmann, cobrança e limites de responsabilidade."
          orbState="calm"
        />

        <View style={{ gap: 18, maxWidth: 920, width: "100%" }}>
          <Card>
            <View style={{ gap: 12 }}>
              <Text className="text-lg font-semibold text-ink dark:text-white">Resumo do serviço</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                A Bergmann oferece suporte emocional, prevenção de crises, teleatendimento e painéis por perfil.
                O app não faz diagnóstico, não prescreve medicamento e não substitui atendimento médico, psicológico
                ou de emergência.
              </Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                O acesso pago é comercial e depende de contrato externo. O aplicativo só libera recursos conforme
                o perfil, o status da conta e o consentimento aplicável.
              </Text>
            </View>
          </Card>

          {sections.map((section) => (
            <SectionCard key={section.title} title={section.title} items={section.items} />
          ))}

          <Card>
            <View style={{ gap: 10 }}>
              <Text className="text-lg font-semibold text-ink dark:text-white">Encerramento e revisão</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                Estes termos podem ser atualizados para refletir requisitos de loja, segurança, privacidade,
                cobrança e operação clínica. Quando isso acontecer, o app deve continuar mostrando a versão vigente
                antes de liberar os recursos sensíveis.
              </Text>
            </View>
          </Card>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Button label="Política de privacidade" tone="soft" onPress={() => router.push("/privacy-policy" as never)} />
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
