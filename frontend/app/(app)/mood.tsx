import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { createEmotionLog } from "@/lib/emotional";

const moods = ["calmo", "ansioso", "triste", "cansado", "esperancoso", "irritado"];

function Scale({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-muted">{label}: {value}</Text>
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
          <Pressable
            key={number}
            accessibilityRole="button"
            onPress={() => onChange(number)}
            className={`h-10 w-10 items-center justify-center rounded-full border ${
              value === number ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
            }`}
          >
            <Text className={value === number ? "font-semibold text-ink" : "text-white"}>{number}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Mood() {
  const [mood, setMood] = useState("calmo");
  const [intensity, setIntensity] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const [stress, setStress] = useState(5);
  const [note, setNote] = useState("");
  const mutation = useMutation({ mutationFn: createEmotionLog });

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">HUMOR</Text>
        <Text className="text-3xl font-semibold text-white">Estado emocional</Text>
        <Text className="text-base leading-6 text-muted">
          Um registro rapido ajuda o Bergmann a perceber tendencias com cuidado e sem julgamento.
        </Text>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted">Humor principal</Text>
        <View className="flex-row flex-wrap gap-2">
          {moods.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => setMood(item)}
              className={`rounded-full border px-4 py-3 ${
                mood === item ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
            >
              <Text className={mood === item ? "font-semibold text-ink" : "text-white"}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card>
        <Scale label="Intensidade emocional" value={intensity} onChange={setIntensity} />
        <Scale label="Energia" value={energy} onChange={setEnergy} />
        <Scale label="Ansiedade" value={anxiety} onChange={setAnxiety} />
        <Scale label="Estresse" value={stress} onChange={setStress} />
      </Card>

      <Field
        label="Observacao opcional"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={2000}
      />
      {mutation.data ? (
        <Card>
          <Text className="text-base leading-6 text-white">
            Registro salvo. Voce nao precisa resolver tudo agora; apenas perceber ja e um passo.
          </Text>
        </Card>
      ) : null}
      <ErrorText message={mutation.error?.message} />
      <Button
        label="Registrar humor"
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
    </Screen>
  );
}
