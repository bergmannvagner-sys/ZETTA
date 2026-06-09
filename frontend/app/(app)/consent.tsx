import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { acceptConsent, getConsentStatus } from "@/lib/privacy";
import { useAuthStore } from "@/store/auth-store";

const CONSENT_BADGES = ["Chat", "SOS", "Diário", "Relatórios"];

const CONSENT_USE_CASES = [
  {
    title: "Chat emocional",
    body: "Usa mensagens para apoiar a conversa e organizar a continuidade do cuidado."
  },
  {
    title: "SOS e alertas",
    body: "Registra eventos de risco para acionar apoio humano quando for preciso."
  },
  {
    title: "Diário e humor",
    body: "Permite acompanhar registros pessoais e identificar mudanças de padrão."
  },
  {
    title: "Relatórios e auditoria",
    body: "Mantém logs auditáveis e relatórios pessoais sob controle de acesso."
  }
] as const;

export default function Consent() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { width } = useWindowDimensions();
  const sessionKey = user?.id ?? "anonymous";
  const consentQueryKey = ["lgpd-consent", sessionKey] as const;
  const consent = useQuery({
    queryKey: consentQueryKey,
    queryFn: getConsentStatus,
    retry: false
  });
  const accept = useMutation({
    mutationFn: acceptConsent,
    onSuccess: (data) => {
      queryClient.setQueryData(consentQueryKey, {
        required: true,
        accepted: data.accepted,
        policy_version: data.policy_version,
        accepted_at: data.accepted_at
      });
      router.replace("/(app)/home");
    }
  });

  const isWide = width >= 860;
  const orbSize = useMemo(() => Math.min(236, Math.max(176, width * 0.46)), [width]);
  const authRequired = consent.error?.message === "error.authRequired" || consent.error?.message === "error.sessionExpired";

  const actionPanel = authRequired ? (
    <Card>
      <AuthGate
        title="Entre para continuar."
        body="Faça login para aceitar o consentimento e liberar os recursos sensíveis da Bergmann."
        resourceLabel="Consentimento LGPD"
      />
    </Card>
  ) : (
    <Card>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">Assinatura do consentimento</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            Se a política estiver carregada e você concordar, a próxima tela abre automaticamente.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Badge label={`Política ${consent.data?.policy_version ?? "..."}`} tone="success" />
          <Badge label={consent.isLoading ? t("common.loading") : "Pronto para aceite"} tone="warning" />
        </View>

        {consent.data?.accepted_at ? (
          <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
            Aceito em {new Date(consent.data.accepted_at).toLocaleString("pt-BR")}
          </Text>
        ) : (
          <Text className="text-xs text-muted dark:text-[#D1D5DB]">Ainda não houve aceite registrado para esta conta.</Text>
        )}

        <ErrorText message={consent.error?.message ?? accept.error?.message} />

        <View className="gap-2">
          <Button
            label="Aceitar e continuar"
            loading={accept.isPending || consent.isLoading}
            disabled={!consent.data?.policy_version || consent.isLoading}
            onPress={() => {
              const version = consent.data?.policy_version;
              if (version) accept.mutate(version);
            }}
          />
          <Button label="Ver privacidade" tone="soft" onPress={() => router.push("/(app)/privacy" as never)} />
        </View>
      </View>
    </Card>
  );

  const useCasesPanel = (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink dark:text-white">Como a Bergmann usa seus dados</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            O objetivo é cuidar, registrar com auditoria e permitir que você tenha suporte sem perder controle.
          </Text>
        </View>

        <View
          style={{
            flexDirection: isWide ? "row" : "column",
            flexWrap: isWide ? "wrap" : "nowrap",
            gap: 12
          }}
        >
          {CONSENT_USE_CASES.map((item) => (
            <View
              key={item.title}
              style={{
                flexBasis: isWide ? "48%" : "100%",
                flexGrow: 1,
                minWidth: isWide ? 240 : undefined
              }}
              className="gap-1 rounded-2xl border border-primaryLight/70 bg-surface/80 p-4 dark:border-[#4C1D95]/35 dark:bg-[#1C1630]/55"
            >
              <Text className="text-sm font-semibold text-ink dark:text-white">{item.title}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  const overviewPanel = (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink dark:text-white">O que este aceite cobre</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            Este consentimento libera apenas o que é necessário para o cuidado emocional dentro do app.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {CONSENT_BADGES.map((label) => (
            <Badge key={label} label={label} tone="soft" />
          ))}
        </View>
      </View>
    </Card>
  );

  const controlPanel = (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink dark:text-white">Seu controle continua ativo</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            Você pode revisar a política de privacidade a qualquer momento. Empresas e instituições não recebem dados
            individuais por esse aceite.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm text-muted dark:text-[#D1D5DB]">
            A revogação posterior interrompe recursos sensíveis até um novo aceite.
          </Text>
          <Text className="text-xs text-muted dark:text-[#D1D5DB]">
            Versão atual: {consent.data?.policy_version ?? "carregando"}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker={t("auth.gate.kicker")}
          orbState="calm"
          orbSize={orbSize}
          subtitle="Para usar recursos sensíveis da Bergmann, você precisa autorizar o tratamento dos seus dados emocionais com foco em cuidado, segurança da conta e apoio humano quando necessário."
          title="Consentimento LGPD"
        />

        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}>
          {CONSENT_BADGES.map((label) => (
            <Badge key={`intro-${label}`} label={label} tone="info" />
          ))}
        </View>

        <View style={{ gap: 18, maxWidth: 920, width: "100%" }}>
          {actionPanel}
          {overviewPanel}
          {useCasesPanel}
          {controlPanel}
        </View>
      </View>
    </Screen>
  );
}
