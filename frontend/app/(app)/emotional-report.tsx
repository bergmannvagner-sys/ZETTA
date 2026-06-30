import { useMutation } from "@tanstack/react-query";
import { Share, Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText, Header, SectionTitle } from "@/components/ui";
import { ZettaMindPanel } from "@/components/zetta-metrics";
import { useAppTheme, radii } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { EmotionalReport as EmotionalReportData, createMyEmotionalReport } from "@/lib/emotional";
import { buildZettaMindSnapshot } from "@/lib/zetta-intelligence";

function metadataList(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  const { colors } = useAppTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "800", lineHeight: 22 }}>{title}</Text>
      {items.map((item) => (
        <Text key={item} selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23 }}>
          - {item}
        </Text>
      ))}
    </View>
  );
}

function buildShareText(report: EmotionalReportData, t: (key: string, params?: Record<string, string | number>) => string) {
  const metadata = report.metadata ?? {};
  const triggers = metadataList(metadata, "triggers");
  const moments = metadataList(metadata, "important_moments");
  const questions = metadataList(metadata, "next_session_questions");

  return [
    t("report.shareTitle"),
    "",
    report.summary,
    "",
    t("report.risk", { value: report.risk_level }),
    metadata.predominant_mood ? t("report.predominantMood", { value: String(metadata.predominant_mood) }) : "",
    metadata.average_intensity ? t("report.averageIntensity", { value: String(metadata.average_intensity) }) : "",
    metadata.average_anxiety ? t("report.averageAnxiety", { value: String(metadata.average_anxiety) }) : "",
    "",
    triggers.length ? `${t("report.triggers")}\n${triggers.map((item) => `- ${item}`).join("\n")}` : "",
    moments.length ? `${t("report.importantMoments")}\n${moments.map((item) => `- ${item}`).join("\n")}` : "",
    questions.length ? `${t("report.nextQuestions")}\n${questions.map((item) => `- ${item}`).join("\n")}` : "",
    "",
    t("report.shareFooter")
  ]
    .filter(Boolean)
    .join("\n");
}

function riskBadgeTone(riskLevel: string) {
  const normalized = riskLevel.trim().toUpperCase();
  if (normalized === "CRISIS" || normalized === "HIGH" || normalized === "ELEVATED") {
    return "error" as const;
  }
  if (normalized === "MEDIUM" || normalized === "MODERATE") {
    return "warning" as const;
  }
  if (normalized === "LOW") {
    return "success" as const;
  }
  return "info" as const;
}

export default function EmotionalReport() {
  const { language, t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const report = useMutation({ mutationFn: createMyEmotionalReport });
  const metadata = report.data?.metadata ?? {};
  const mindSnapshot = buildZettaMindSnapshot([], [], report.data ?? null);
  const triggers = metadataList(metadata, "triggers");
  const importantMoments = metadataList(metadata, "important_moments");
  const nextQuestions = metadataList(metadata, "next_session_questions");
  const wideReport = width >= 860;
  const orbSize = wideReport ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(214, Math.max(168, width * 0.56));

  async function shareReport() {
    if (!report.data) return;
    await Share.share({
      title: t("report.shareTitle"),
      message: buildShareText(report.data, t)
    });
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="thinking" size={orbSize} />
          <Header align="center" kicker={t("report.kicker")} title={t("report.title")} subtitle={t("report.subtitle")} />
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          {report.data ? (
            <Card>
              <View className="flex-row flex-wrap gap-2">
                <Badge label={t("report.kicker")} tone="info" />
                <Badge label={report.data.risk_level} tone={riskBadgeTone(report.data.risk_level)} />
              </View>
              <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("report.subtitle")}</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                {t("report.period", { value: String(metadata.period_days ?? "-") })}
              </Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                {t("report.emotionLogs", { value: String(metadata.emotion_logs ?? 0) })} ·{" "}
                {t("report.journalEntries", { value: String(metadata.journal_entries ?? 0) })}
              </Text>
              {report.data.created_at ? (
                <Text selectable className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                  {new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(report.data.created_at)
                  )}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {report.data ? (
            <Card>
              <Text selectable style={{ color: colors.primary, fontSize: 15, fontWeight: "800", lineHeight: 21 }}>
                {t("report.risk", { value: report.data.risk_level })}
              </Text>
              <Text selectable style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 25 }}>
                {report.data.summary}
              </Text>
            </Card>
          ) : (
            <Card>
              <SectionTitle title={t("tab.progress")} subtitle={t("report.empty")} />
            </Card>
          )}

          {report.data ? <ZettaMindPanel snapshot={mindSnapshot} /> : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: t("home.care.mood"), value: String(metadata.latest_mood ?? t("home.metric.register")) },
              { label: t("mood.intensity"), value: String(metadata.average_intensity ?? "-") },
              { label: t("mood.anxiety"), value: String(metadata.average_anxiety ?? "-") },
              { label: t("report.risk", { value: "" }).replace(":", "").trim(), value: report.data?.risk_level ?? "-" }
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderCurve: "continuous",
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  flexBasis: wideReport ? "47%" : "100%",
                  flexGrow: 1,
                  gap: 6,
                  padding: 16
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>
                  {item.label}
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "900", lineHeight: 25 }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <Button
            label={report.data ? t("report.update") : t("report.generate")}
            icon={report.data ? "refresh-outline" : "sparkles-outline"}
            loading={report.isPending}
            onPress={() => report.mutate()}
          />

          <ErrorText message={report.error?.message} />

          {report.data ? (
            <Card>
              <View style={{ gap: 6, paddingTop: 8 }}>
                {"period_days" in metadata ? (
                  <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                    {t("report.period", { value: String(metadata.period_days) })}
                  </Text>
                ) : null}
                {"emotion_logs" in metadata ? (
                  <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                    {t("report.emotionLogs", { value: String(metadata.emotion_logs) })}
                  </Text>
                ) : null}
                {"journal_entries" in metadata ? (
                  <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                    {t("report.journalEntries", { value: String(metadata.journal_entries) })}
                  </Text>
                ) : null}
                {"average_intensity" in metadata ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.averageIntensity", { value: String(metadata.average_intensity) })}
                  </Text>
                ) : null}
                {"latest_mood" in metadata ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.latestMood", { value: String(metadata.latest_mood) })}
                  </Text>
                ) : null}
                {"predominant_mood" in metadata && metadata.predominant_mood ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.predominantMood", { value: String(metadata.predominant_mood) })}
                  </Text>
                ) : null}
                {"average_anxiety" in metadata && metadata.average_anxiety ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.averageAnxiety", { value: String(metadata.average_anxiety) })}
                  </Text>
                ) : null}
                {"average_energy" in metadata && metadata.average_energy ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.averageEnergy", { value: String(metadata.average_energy) })}
                  </Text>
                ) : null}
                {"average_sleep" in metadata && metadata.average_sleep ? (
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    {t("report.averageSleep", { value: String(metadata.average_sleep) })}
                  </Text>
                ) : null}
              </View>
              <ReportList title={t("report.triggers")} items={triggers} />
              <ReportList title={t("report.importantMoments")} items={importantMoments} />
              <ReportList title={t("report.nextQuestions")} items={nextQuestions} />
              <View style={{ paddingTop: 8 }}>
                <Button label={t("report.share")} icon="share-social-outline" tone="soft" onPress={shareReport} />
              </View>
            </Card>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
