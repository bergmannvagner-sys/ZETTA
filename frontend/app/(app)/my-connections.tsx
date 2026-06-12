import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { getMyConnectionCode, listSharingConsents, revokeSharingConsent, SharingConsent } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

const CONNECTABLE_ROLES = new Set(["PSYCHOLOGIST", "COMPANY", "CLINIC", "HOSPITAL", "NGO", "PUBLIC_INSTITUTION"]);

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR") : "Sem registro";
}

function ConnectionCard({
  consent,
  onRevoke,
  revoking
}: {
  consent: SharingConsent;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const { t } = useI18n();
  const active = !consent.revoked_at;

  return (
    <Card>
      <View className="gap-3">
        <View className="flex-row items-start gap-3">
          <View className="flex-1 gap-1">
            <Text selectable className="text-base font-semibold text-ink dark:text-white">
              {consent.target_email}
            </Text>
            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
              {t("profile.role", { value: consent.target_role })}
            </Text>
          </View>

          <Badge label={active ? "Ativo" : "Revogado"} tone={active ? "success" : "warning"} />
        </View>

        <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          {t("sharing.categoriesValue", { value: consent.categories.join(", ") })}
        </Text>
        <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
          {t("sharing.status", { value: consent.revoked_at ? t("sharing.revoked") : t("sharing.active") })}
        </Text>
        <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
          Concedido: {formatDate(consent.granted_at)}
        </Text>
        {consent.revoked_at ? (
          <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
            Revogado: {formatDate(consent.revoked_at)}
          </Text>
        ) : null}
        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          {consent.summary_only
            ? "Compartilhamento limitado ao resumo."
            : "Compartilhamento com detalhes autorizados nas categorias escolhidas."}
        </Text>
      </View>

      {active ? (
        <Button
          label="sharing.revoke"
          icon="trash-outline"
          tone="danger"
          loading={revoking}
          onPress={() => onRevoke(consent.id)}
        />
      ) : null}
    </Card>
  );
}

export default function MyConnections() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [pendingRevocationId, setPendingRevocationId] = useState<string | null>(null);
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const wideConnections = width >= 860;
  const orbSize = wideConnections ? Math.min(252, Math.max(188, width * 0.3)) : Math.min(212, Math.max(168, width * 0.56));
  const canShowConnectionCode = Boolean(hydrated && user && CONNECTABLE_ROLES.has(user.role));

  const code = useQuery({
    queryKey: ["my-connection-code"],
    queryFn: getMyConnectionCode,
    enabled: canShowConnectionCode
  });
  const consents = useQuery({
    queryKey: ["sharing-consents"],
    queryFn: listSharingConsents
  });
  const revoke = useMutation({
    mutationFn: revokeSharingConsent,
    onMutate: (consentId: string) => {
      setPendingRevocationId(consentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sharing-consents"] });
    },
    onSettled: () => {
      setPendingRevocationId(null);
    }
  });

  const allConsents: SharingConsent[] = consents.data ?? [];
  const activeConsents = allConsents.filter((consent: SharingConsent) => !consent.revoked_at);
  const revokedConsents = allConsents.filter((consent: SharingConsent) => consent.revoked_at);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="silent_presence" size={orbSize} />
          <View className="gap-2">
            <Text className="text-xs font-semibold text-primary text-center">{t("sharing.kicker")}</Text>
            <Text className="text-3xl font-semibold text-ink dark:text-white text-center">{t("route.myConnections")}</Text>
            <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB] text-center">{t("sharing.subtitle")}</Text>
          </View>
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Card>
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-lg font-semibold text-ink dark:text-white">Código de conexão</Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Compartilhe este código apenas com quem você confia.
                </Text>
              </View>

              {!hydrated ? (
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text>
              ) : !canShowConnectionCode ? (
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Perfis comuns não expõem código de conexão. Psicólogos, clínicas e instituições usam esse espaço
                  para compartilhar o código com segurança.
                </Text>
              ) : code.isLoading ? (
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text>
              ) : code.error ? (
                <Text className="text-sm text-error">{code.error.message}</Text>
              ) : (
                <Text selectable className="text-xl font-semibold text-ink dark:text-white">
                  {code.data?.connection_code ?? "Código indisponível"}
                </Text>
              )}
            </View>
          </Card>

          <Card>
            <View className="gap-2">
              <Text className="text-lg font-semibold text-ink dark:text-white">Controle de exposição</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Revogar um vínculo encerra novos acessos e mantém o histórico já auditado.
              </Text>
            </View>
          </Card>

          <Card>
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-lg font-semibold text-ink dark:text-white">Resumo dos vínculos</Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Veja o que ainda está ativo e o que já foi encerrado.
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <Badge label={`Ativos ${activeConsents.length}`} tone="success" />
                <Badge label={`Revogados ${revokedConsents.length}`} tone="warning" />
              </View>
            </View>
          </Card>

          <ErrorText message={consents.error?.message ?? revoke.error?.message} />

          {canShowConnectionCode && code.error ? <ErrorText message={code.error.message} /> : null}

          {consents.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text> : null}

          <View className="gap-4">
            <Text className="text-sm font-semibold text-muted dark:text-[#D1D5DB]">Vínculos ativos</Text>
            {activeConsents.length === 0 ? (
              <Card>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("sharing.empty")}</Text>
              </Card>
            ) : (
              <View
                style={{
                  flexDirection: wideConnections ? "row" : "column",
                  flexWrap: wideConnections ? "wrap" : "nowrap",
                  gap: 12
                }}
              >
                {activeConsents.map((consent: SharingConsent) => (
                  <View
                    key={consent.id}
                    style={{
                      flexBasis: wideConnections ? "48%" : "100%",
                      flexGrow: 1,
                      minWidth: wideConnections ? 240 : undefined
                    }}
                  >
                    <ConnectionCard
                      consent={consent}
                      onRevoke={(id) => revoke.mutate(id)}
                      revoking={pendingRevocationId === consent.id && revoke.isPending}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {revokedConsents.length ? (
            <View className="gap-4">
              <Text className="text-sm font-semibold text-muted dark:text-[#D1D5DB]">Vínculos revogados</Text>
              <View
                style={{
                  flexDirection: wideConnections ? "row" : "column",
                  flexWrap: wideConnections ? "wrap" : "nowrap",
                  gap: 12
                }}
              >
                {revokedConsents.map((consent: SharingConsent) => (
                  <View
                    key={consent.id}
                    style={{
                      flexBasis: wideConnections ? "48%" : "100%",
                      flexGrow: 1,
                      minWidth: wideConnections ? 240 : undefined
                    }}
                  >
                    <ConnectionCard consent={consent} onRevoke={() => undefined} revoking={false} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
