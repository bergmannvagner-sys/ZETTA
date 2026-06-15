import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DimensionValue, Pressable, Text, View, useWindowDimensions } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field, Header } from "@/components/ui";
import { shadowStyle } from "@/design-system/shadows";
import { radii, useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { createEmotionLog } from "@/lib/emotional";

const moods = [
  { value: "calmo", labelKey: "mood.calm" },
  { value: "ansioso", labelKey: "mood.anxious" },
  { value: "triste", labelKey: "mood.sad" },
  { value: "cansado", labelKey: "mood.tired" },
  { value: "esperancoso", labelKey: "mood.hopeful" },
  { value: "irritado", labelKey: "mood.irritated" }
];

function Scale({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const gap = width < 520 ? 3 : 6;
  const availableWidth = Math.max(280, width - (width <= 360 ? 32 : width < 768 ? 48 : 64));
  const buttonSize = Math.max(26, Math.min(42, Math.floor((availableWidth - gap * 9) / 10)));
  const numberSize = Math.max(12, Math.min(15, Math.floor(buttonSize * 0.38)));
  const numberShadow = shadowStyle({ color: colors.shadowStrong, opacity: 0.28, radius: 10, offsetY: 5, elevation: 2 });
  const numberShadowInactive = shadowStyle({ color: colors.shadow, opacity: 0.18, radius: 8, offsetY: 4, elevation: 1 });
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>
        {label}: {value}
      </Text>
      <View style={{ alignSelf: "stretch", flexDirection: "row", flexWrap: "nowrap", gap, justifyContent: "center", width: "100%" }}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
          <Pressable
            key={number}
            accessibilityRole="button"
            accessibilityState={{ selected: value === number }}
            onPress={() => onChange(number)}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: value === number ? colors.gradientEnd : colors.surfaceStrong,
              borderColor: value === number ? colors.primaryLight : colors.primary,
              borderCurve: "continuous",
              borderRadius: radii.pill,
              borderWidth: 1.5,
              ...(value === number ? numberShadow : numberShadowInactive),
              justifyContent: "center",
              flexShrink: 0,
              minHeight: buttonSize,
              minWidth: buttonSize,
              width: buttonSize,
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={{
                color: colors.textPrimary,
                fontSize: numberSize,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
                lineHeight: Math.max(14, numberSize + 2)
              }}
            >
              {number}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Mood() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const wideMood = width >= 820;
  const [mood, setMood] = useState("calmo");
  const [intensity, setIntensity] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const [stress, setStress] = useState(5);
  const [note, setNote] = useState("");
  const mutation = useMutation({ mutationFn: createEmotionLog });
  const orbSize = wideMood ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(180, Math.max(168, width * 0.52));
  const moodChipBasis: DimensionValue = width < 420 ? "100%" : width < 760 ? "48%" : "31.5%";
  const moodChipShadow = shadowStyle({ color: colors.shadowStrong, opacity: 0.26, radius: 14, offsetY: 8, elevation: 4 });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: width < 420 ? 18 : 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: width < 420 ? 12 : 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb accent={colors.primary} state="calm" size={orbSize} />
          <Header align="center" kicker={t("mood.kicker")} title={t("mood.title")} subtitle={t("mood.subtitle")} />
        </View>

        <View style={{ gap: 20, maxWidth: 960, width: "100%" }}>
          <Card>
            <View style={{ gap: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "800", lineHeight: 22 }}>
                {t("mood.primary")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {moods.map((item) => (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mood === item.value }}
                    onPress={() => setMood(item.value)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: mood === item.value ? colors.gradientEnd : colors.surfaceStrong,
                      borderColor: mood === item.value ? colors.primaryLight : colors.primary,
                      borderCurve: "continuous",
                      borderRadius: radii.pill,
                      borderWidth: 1.5,
                      ...(mood === item.value
                        ? moodChipShadow
                        : shadowStyle({
                            color: colors.shadow,
                            opacity: 0.18,
                            radius: 10,
                            offsetY: 4,
                            elevation: 1
                          })),
                      flexBasis: moodChipBasis,
                      justifyContent: "center",
                      minHeight: 52,
                      minWidth: 0,
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: 18,
                      paddingVertical: 12
                    })}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: 16,
                        fontWeight: "800",
                        lineHeight: 22
                      }}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <Card>
            <Scale label={t("mood.intensity")} value={intensity} onChange={setIntensity} />
            <Scale label={t("mood.energy")} value={energy} onChange={setEnergy} />
            <Scale label={t("mood.anxiety")} value={anxiety} onChange={setAnxiety} />
            <Scale label={t("mood.stress")} value={stress} onChange={setStress} />
          </Card>

          <Field
            label={t("mood.note")}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={2000}
          />

          {mutation.data ? (
            <Card>
              <Text className="text-base leading-6 text-ink dark:text-white">{t("mood.saved")}</Text>
            </Card>
          ) : null}
          <ErrorText message={mutation.error?.message} />
          <Button
            label={t("mood.submit")}
            icon="checkmark-circle-outline"
            loading={mutation.isPending}
            onPress={() =>
              mutation.mutate({
                mood,
                emotions: [mood],
                intensity,
                energy,
                anxiety,
                stress,
                note: note.trim() || null
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
