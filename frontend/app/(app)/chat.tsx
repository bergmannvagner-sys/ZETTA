import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
import { sendChatMessage } from "@/lib/chat";

type Message = { sender: "USER" | "BERGMANN"; content: string };

function formatChatText(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/^\s*[-*]\s+/gmu, "- ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export default function Chat() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: OrbState }>();
  const initialState =
    params.mode === "silent_presence" || params.mode === "low_energy" ? params.mode : "idle";
  const orbSize = Math.min(244, Math.max(188, width * 0.52));
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orbState, setOrbState] = useState<OrbState>(initialState);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
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
      setVoiceNotice(null);
      return;
    }
    await microphone.start();
    setOrbState(initialState);
    setVoiceNotice("Transcricao de voz ainda nao configurada. A conversa por texto continua ativa.");
  }

  return (
    <Screen>
      <AnimatedOrb
        state={microphone.isActive ? "listening" : orbState}
        audioLevel={microphone.isActive ? microphone.level : mutation.isPending ? 0.22 : 0}
        size={orbSize}
        onPress={toggleMicrophoneLevel}
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
              className={`rounded-2xl p-4 ${
                message.sender === "USER" ? "bg-mint/90" : "border border-lilac/10 bg-surface"
              }`}
            >
              <Text
                selectable
                className={`text-base leading-6 ${message.sender === "USER" ? "text-ink" : "text-white"}`}
              >
                {formatChatText(message.content)}
              </Text>
            </View>
          ))
        )}
      </View>
      <ErrorText message={mutation.error?.message} />
      <ErrorText message={microphone.errorMessage ?? undefined} />
      {voiceNotice ? (
        <Card>
          <Text className="text-sm leading-5 text-muted">{voiceNotice}</Text>
        </Card>
      ) : null}
      <View className="flex-row items-center gap-3">
        <TextInput
          accessibilityLabel="Mensagem para Bergmann"
          value={text}
          onChangeText={(value) => {
            setText(value);
            setOrbState(value ? "listening" : initialState);
          }}
          placeholder="Escreva aqui"
          placeholderTextColor="#7D86A8"
          multiline
          className="min-h-14 flex-1 rounded-2xl border border-lilac/10 bg-surface px-4 py-3 text-base text-white"
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
        label={microphone.isActive ? "Desativar presenca por voz" : "Tocar para testar voz"}
        tone="soft"
        loading={microphone.status === "requesting_permission"}
        onPress={toggleMicrophoneLevel}
      />
    </Screen>
  );
}
