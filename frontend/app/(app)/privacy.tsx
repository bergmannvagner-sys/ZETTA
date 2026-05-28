import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

import { Screen } from "@/components/screen";
import { Card } from "@/components/ui";
import { getConsentStatus } from "@/lib/privacy";

export default function Privacy() {
  const consent = useQuery({ queryKey: ["lgpd-consent"], queryFn: getConsentStatus });

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Privacidade</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          A Bergmann usa seus dados para oferecer suporte emocional e seguranca da conta. Dados
          sensiveis devem ser tratados com consentimento, controle de acesso e logs auditaveis.
        </Text>
      </Card>
      <Card>
        <Text className="text-base leading-6 text-muted">
          Empresas e instituicoes nao podem acessar dados individuais. Contas profissionais passam
          por verificacao antes de acessar recursos clinicos.
        </Text>
        <Text selectable className="text-sm text-muted">
          Consentimento: {consent.data?.accepted ? "aceito" : "pendente"}
        </Text>
      </Card>
    </Screen>
  );
}
