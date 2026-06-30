import { Text, View } from "react-native";
import type { DimensionValue } from "react-native";

import { Card } from "@/components/ui";
import { useAppTheme, radii } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { formatZettaIndex, ZettaIndexStatus, ZettaMindSnapshot } from "@/lib/zetta-intelligence";

function IndexBar({ value, tone }: { value: number | null; tone: string }) {
  const { colors } = useAppTheme();
  const width = (typeof value === "number" ? `${Math.max(6, Math.min(value, 100))}%` : "6%") as DimensionValue;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        height: 8,
        overflow: "hidden",
        width: "100%"
      }}
    >
      <View
        style={{
          backgroundColor: tone,
          borderRadius: radii.pill,
          height: "100%",
          opacity: typeof value === "number" ? 1 : 0.35,
          width
        }}
      />
    </View>
  );
}

function ZettaIndexCard({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceSoft,
        borderColor: colors.border,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexBasis: "47%",
        flexGrow: 1,
        gap: 8,
        minWidth: 142,
        padding: 14
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, lineHeight: 16 }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: "900", lineHeight: 27 }}>
        {formatZettaIndex(value)}
      </Text>
      <IndexBar value={value} tone={tone} />
    </View>
  );
}

function statusLabel(status: ZettaIndexStatus, t: (key: string) => string): string {
  return t(`zettaMind.status.${status}`);
}

export function ZettaMindPanel({ snapshot }: { snapshot: ZettaMindSnapshot }) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const statusTone =
    snapshot.status === "delicate" ? colors.warning : snapshot.status === "attention" ? colors.info : colors.success;

  return (
    <Card>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 3 }}>
            {t("zettaMind.title")}
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 27 }}>
            {snapshot.headline}
          </Text>
          <Text style={{ color: statusTone, fontSize: 14, fontWeight: "900", lineHeight: 19 }}>
            {t("zettaMind.state")}: {statusLabel(snapshot.status, t)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <ZettaIndexCard label={t("zettaMind.emotionalIndex")} value={snapshot.emotionalIndex} tone={colors.primary} />
          <ZettaIndexCard label={t("zettaMind.stabilityIndex")} value={snapshot.stabilityIndex} tone={colors.info} />
          <ZettaIndexCard label={t("zettaMind.wellnessIndex")} value={snapshot.wellnessIndex} tone={colors.success} />
          <ZettaIndexCard label={t("zettaMind.riskIndex")} value={snapshot.riskIndex} tone={statusTone} />
        </View>

        <View style={{ gap: 6 }}>
          {snapshot.insights.map((insight) => (
            <Text key={insight} style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
              - {insight}
            </Text>
          ))}
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {snapshot.disclaimer}
        </Text>
      </View>
    </Card>
  );
}
