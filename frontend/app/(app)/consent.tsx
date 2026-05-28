import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { acceptConsent, getConsentStatus } from "@/lib/privacy";

export default function Consent() {
  const consent = useQuery({
    queryKey: ["lgpd-consent"],
    queryFn: getConsentStatus,
    retry: false
  });

  const accept = useMutation({
    mutationFn: acceptConsent,
    onSuccess: () => router.replace("/(app)/home")
  });

  useEffect(() => {
    if (consent.data?.accepted) {
      router.replace("/(app)/home");
    }
  }, [consent.data?.accepted]);

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Consentimento LGPD</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          Para usar recursos sensiveis, precisamos do seu consentimento para tratar dados
          emocionais, eventos SOS e mensagens do chat com controle de acesso, finalidade de cuidado
          e registro auditavel.
        </Text>
      </Card>
      <Card>
        <Text className="text-base leading-6 text-muted">
          Voce pode revisar a politica de privacidade no app. Esta versao nao compartilha dados
          individuais com empresas ou instituicoes.
        </Text>
        <Text selectable className="text-sm text-muted">
          Versao: {consent.data?.policy_version ?? "carregando"}
        </Text>
      </Card>
      <ErrorText message={consent.error?.message ?? accept.error?.message} />
      <Button
        label="Aceitar e continuar"
        loading={accept.isPending || consent.isLoading}
        onPress={() => {
          const version = consent.data?.policy_version;
          if (version) accept.mutate(version);
        }}
      />
    </Screen>
  );
}
