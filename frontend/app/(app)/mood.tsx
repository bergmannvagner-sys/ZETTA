import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DimensionValue, Pressable, Text, View, useWindowDimensions } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field, Header } from "@/components/ui";
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
  onChange,
  buttonBasis
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  buttonBasis: DimensionValue;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "800", lineHeight: 22 }}>
        {label}: {value}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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
              boxShadow: value === number ? `0 8px 18px ${colors.shadowStrong}` : "none",
              justifyContent: "center",
              minHeight: 48,
              minWidth: 48,
              flexBasis: buttonBasis,
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 17,
                fontWeight: "800",
                lineHeight: 22
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
  const scaleButtonBasis: DimensionValue = width < 420 ? "18%" : width < 760 ? "11%" : "9.5%";

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: width < 420 ? 18 : 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: width < 420 ? 12 : 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="calm" size={orbSize} />
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
                      boxShadow: mood === item.value ? `0 10px 22px ${colors.shadowStrong}` : "none",
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
            <Scale label={t("mood.intensity")} value={intensity} onChange={setIntensity} buttonBasis={scaleButtonBasis} />
            <Scale label={t("mood.energy")} value={energy} onChange={setEnergy} buttonBasis={scaleButtonBasis} />
            <Scale label={t("mood.anxiety")} value={anxiety} onChange={setAnxiety} buttonBasis={scaleButtonBasis} />
            <Scale label={t("mood.stress")} value={stress} onChange={setStress} buttonBasis={scaleButtonBasis} />
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
