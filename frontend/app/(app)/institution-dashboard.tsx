import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Badge, Card, ErrorText, Loading, SectionTitle } from "@/components/ui";
import { useAppTheme, radii } from "@/design-system/theme";
import { hasPaidAccess } from "@/lib/billing";
import {
  InstitutionCategoryCount,
  InstitutionMoodCount,
  InstitutionSharedUserSummary,
  getInstitutionDashboard
} from "@/lib/institution";
import { useAuthStore } from "@/store/auth-store";

const INSTITUTION_ROLES = new Set(["CLINIC", "HOSPITAL", "NGO", "PUBLIC_INSTITUTION"]);
const roleLabels: Record<string, string> = {
  CLINIC: "Clínica",
  HOSPITAL: "Hospital",
  NGO: "ONG",
  PUBLIC_INSTITUTION: "Instituição pública"
};

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function MetricTile({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surfaceSoft,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexBasis: 150,
        flexGrow: 1,
        gap: 4,
        minWidth: 0,
        padding: 14
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", lineHeight: 18 }}>{label}</Text>
      <Text selectable style={{ color: colors.textPrimary, fontSize: 24, fontWeight: "800", lineHeight: 30 }}>
        {value}
      </Text>
    </View>
  );
}

export default function InstitutionDashboard() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const canAccess = Boolean(user?.role && INSTITUTION_ROLES.has(user.role) && paidAccess);
  const dashboard = useQuery({
    queryKey: ["institution-dashboard"],
    queryFn: getInstitutionDashboard,
    enabled: canAccess,
    retry: false,
    staleTime: 30000
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Institucional"
          title="Painel institucional"
          subtitle="Visão agregada de consentimentos ativos, sem exposição de conteúdo bruto fora do que foi autorizado."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 980, gap: 16 }}>
          {!canAccess ? (
            <PaidAccessGate user={user} resourceLabel="Painel institucional agregado" />
          ) : (
            <>
              {dashboard.isLoading ? <Loading label="Carregando painel institucional..." /> : null}
              <ErrorText message={dashboard.error?.message} />

              {dashboard.data ? (
                <>
                  <Card>
                    <Text className="text-base leading-6 text-ink dark:text-white">{dashboard.data.summary}</Text>
                    <View className="flex-row flex-wrap justify-center gap-2">
                      <Badge
                        label={`Perfil: ${roleLabels[dashboard.data.institution_role] ?? dashboard.data.institution_role}`}
                        tone="info"
                      />
                      <Badge label={`Atualizado: ${formatDate(dashboard.data.generated_at)}`} tone="soft" />
                      <Badge
                        label={dashboard.data.risk_flags > 0 ? `Sinais de risco: ${dashboard.data.risk_flags}` : "Sem flags"}
                        tone={dashboard.data.risk_flags > 0 ? "warning" : "success"}
                      />
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                      <MetricTile label="Participantes" value={String(dashboard.data.participant_count)} />
                      <MetricTile label="Intensidade média" value={formatNumber(dashboard.data.average_intensity)} />
                      <MetricTile label="Ansiedade média" value={formatNumber(dashboard.data.average_anxiety)} />
                      <MetricTile label="Estresse médio" value={formatNumber(dashboard.data.average_stress)} />
                    </View>
                    <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{dashboard.data.privacy_note}</Text>
                  </Card>

                  <Card>
                    <SectionTitle
                      align="center"
                      title="Categorias compartilhadas"
                      subtitle="Quantidade de consentimentos por categoria ativa."
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                      {dashboard.data.category_breakdown.length ? (
                        dashboard.data.category_breakdown.map((item: InstitutionCategoryCount) => (
                          <Badge key={item.category} label={`${item.category} · ${item.count}`} tone="soft" />
                        ))
                      ) : (
                        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                          Nenhuma categoria autorizada ainda.
                        </Text>
                      )}
                    </View>
                  </Card>

                  <Card>
                    <SectionTitle
                      align="center"
                      title="Humor agregado"
                      subtitle="Últimos humores autorizados pelos consentimentos ativos."
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                      {dashboard.data.mood_breakdown.length ? (
                        dashboard.data.mood_breakdown.map((item: InstitutionMoodCount) => (
                          <Badge key={item.mood} label={`${item.mood} · ${item.count}`} tone="info" />
                        ))
                      ) : (
                        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                          Nenhum humor autorizado ainda.
                        </Text>
                      )}
                    </View>
                  </Card>

                  <View className="gap-3">
                    <SectionTitle
                      align="center"
                      title="Pessoas compartilhadas"
                      subtitle="Resumo agregado de cada consentimento ativo."
                    />
                    {dashboard.data.shared_users.length ? (
                      dashboard.data.shared_users.map((item: InstitutionSharedUserSummary) => (
                        <Card key={item.user_id}>
                          <Text selectable className="text-base font-semibold text-ink dark:text-white">
                            {item.full_name}
                          </Text>
                          <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{item.email}</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                            {item.categories.map((category: string) => (
                              <Badge key={`${item.user_id}-${category}`} label={category} tone="soft" />
                            ))}
                            <Badge
                              label={item.summary_only ? "Somente resumo" : "Detalhes autorizados"}
                              tone={item.summary_only ? "info" : "success"}
                            />
                          </View>
                          <View className="gap-1">
                            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                              Humor recente: {item.latest_mood ?? "não autorizado"}
                            </Text>
                            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                              Intensidade média: {formatNumber(item.average_intensity)}
                            </Text>
                            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                              Entradas de diário visíveis: {item.journal_entries_visible}
                            </Text>
                            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                              Compartilhado em: {formatDate(item.shared_at)}
                            </Text>
                          </View>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                          Nenhum compartilhamento ativo foi encontrado para este perfil.
                        </Text>
                      </Card>
                    )}
                  </View>
                </>
              ) : dashboard.isLoading ? null : (
                <Card>
                  <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                    O painel aparece quando houver consentimentos ativos para este perfil.
                  </Text>
                </Card>
              )}
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
