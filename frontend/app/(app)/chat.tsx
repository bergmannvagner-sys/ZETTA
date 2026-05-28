import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { sendChatMessage } from "@/lib/chat";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";

type Message = { sender: "USER" | "BERGMANN"; content: string };

export default function Chat() {
  const params = useLocalSearchParams<{ mode?: OrbState }>();
  const initialState =
    params.mode === "silent_presence" || params.mode === "low_energy" ? params.mode : "idle";
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orbState, setOrbState] = useState<OrbState>(initialState);
  const microphone = useMicrophoneLevel();

  const mutation = useMutation({
    mutationFn: (message: string) => sendChatMessage(message, sessionId),
    onMutate: () => setOrbState("thinking"),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setMessages((current) => [...current, { sender: "BERGMANN", content: data.answer }]);
      setOrbState(data.risk_level === "CRISIS" ? "crisis" : data.fallback ? "error" : "speaking");
    },
    onError: () => setOrbState("error")
  });

  function send() {
    const message = text.trim();
    if (!message) return;
    setMessages((current) => [...current, { sender: "USER", content: message }]);
    setText("");
    mutation.mutate(message);
  }

  async function toggleMicrophoneLevel() {
    if (microphone.isActive) {
      await microphone.stop();
      setOrbState(initialState);
      return;
    }
    await microphone.start();
    setOrbState("listening");
  }

  return (
    <Screen>
      <AnimatedOrb
        state={microphone.isActive ? "listening" : orbState}
        audioLevel={microphone.isActive ? microphone.level : mutation.isPending ? 0.22 : 0}
        size={220}
      />
      <View className="gap-3">
        {messages.length === 0 ? (
          <Card>
            <Text className="text-base leading-6 text-muted">
              Escreva com calma. Bergmann oferece suporte emocional, mas nao substitui atendimento
              medico ou psicologico.
            </Text>
          </Card>
        ) : (
          messages.map((message, index) => (
            <View
              key={`${message.sender}-${index}`}
              className={`rounded-2xl p-4 ${message.sender === "USER" ? "bg-mint" : "bg-surface"}`}
            >
              <Text
                selectable
                className={`text-base leading-6 ${message.sender === "USER" ? "text-ink" : "text-white"}`}
              >
                {message.content}
              </Text>
            </View>
          ))
        )}
      </View>
      <ErrorText message={mutation.error?.message} />
      <ErrorText message={microphone.errorMessage ?? undefined} />
      <View className="flex-row items-center gap-3">
        <TextInput
          accessibilityLabel="Mensagem para Bergmann"
          value={text}
          onChangeText={(value) => {
            setText(value);
            setOrbState(value ? "listening" : initialState);
          }}
          placeholder="Escreva aqui"
          placeholderTextColor="#6F8281"
          multiline
          className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-surface px-4 py-3 text-base text-white"
        />
        <Pressable
          accessibilityRole="button"
          onPress={send}
          disabled={mutation.isPending}
          className="h-14 w-16 items-center justify-center rounded-2xl bg-mint"
        >
          <Text className="font-semibold text-ink">Enviar</Text>
        </Pressable>
      </View>
      <Button
        label={microphone.isActive ? "Desativar nivel de voz" : "Ativar nivel de voz"}
        tone="soft"
        loading={microphone.status === "requesting_permission"}
        onPress={toggleMicrophoneLevel}
      />
    </Screen>
  );
}
