import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { ChoicePill, ScalePicker } from "@/components/emotional";
import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { createEmotionLog } from "@/lib/emotional";

const moodOptions = [
  { value: "bem", key: "checkin.mood.good" },
  { value: "ok", key: "checkin.mood.ok" },
  { value: "triste", key: "checkin.mood.sad" },
  { value: "ansioso", key: "checkin.mood.anxious" },
  { value: "cansado", key: "checkin.mood.tired" },
  { value: "irritado", key: "checkin.mood.irritated" }
];

function moodIntensity(mood: string, anxiety: number) {
  const base: Record<string, number> = {
    bem: 2,
    ok: 3,
    triste: 6,
    ansioso: 6,
    cansado: 5,
    irritado: 6
  };
  return Math.max(1, Math.min(10, (base[mood] ?? 4) + Math.max(0, anxiety - 3)));
}

export default function QuickCheckin() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [mood, setMood] = useState("ok");
  const [energy, setEnergy] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [sleep, setSleep] = useState(3);
  const mutation = useMutation({ mutationFn: createEmotionLog });
  const wideCheckin = width >= 840;
  const orbSize = wideCheckin ? Math.min(248, Math.max(192, width * 0.3)) : Math.min(214, Math.max(168, width * 0.56));

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero kicker={t("checkin.kicker")} title={t("checkin.title")} subtitle={t("checkin.subtitle")} orbSize={orbSize} />

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Card>
            <Text className="text-sm font-medium text-muted dark:text-[#D1D5DB]">{t("checkin.question")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {moodOptions.map((item) => (
                <ChoicePill
                  key={item.value}
                  label={t(item.key)}
                  selected={mood === item.value}
                  onPress={() => setMood(item.value)}
                />
              ))}
            </View>
          </Card>

          <Card>
            <ScalePicker label={t("checkin.energy")} value={energy} onChange={setEnergy} />
            <ScalePicker label={t("checkin.anxiety")} value={anxiety} onChange={setAnxiety} />
            <ScalePicker label={t("checkin.sleep")} value={sleep} onChange={setSleep} />
          </Card>

          {mutation.data ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("checkin.saved")}</Text>
            </Card>
          ) : null}

          <ErrorText message={mutation.error?.message} />
          <Button
            label={t("checkin.submit")}
            loading={mutation.isPending}
            onPress={() =>
              mutation.mutate({
                mood,
                emotions: [mood],
                intensity: moodIntensity(mood, anxiety),
                energy,
                anxiety,
                sleep_quality: sleep,
                note: "Check-in de 30 segundos"
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
