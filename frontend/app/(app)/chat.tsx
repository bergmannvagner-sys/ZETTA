import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { shadowStyle } from "@/design-system/shadows";
import { radii, useAppTheme } from "@/design-system/theme";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
import { useI18n } from "@/i18n/i18n";
import { LanguageCode } from "@/i18n/translations";
import { getWebSocketUrl } from "@/lib/api";
import {
  ChatHistoryMessage,
  editChatMessage,
  getChatHistory,
  sendChatMessage,
  sendVoiceChatAudio
} from "@/lib/chat";
import { getCachedChat, saveChatCache } from "@/lib/chat-cache";
import { useAuthStore } from "@/store/auth-store";

type Message = {
  id?: string;
  sender: "USER" | "BERGMANN";
  content: string;
  risk_level?: string;
  created_at?: string;
  pending?: boolean;
  failed?: boolean;
};

type RealtimeAnswerEvent = {
  type: "answer";
  session_id: string;
  user_message_id?: string | null;
  assistant_message_id?: string | null;
  answer: string;
  risk_level: string;
  fallback: boolean;
  in_scope?: boolean;
};

type RealtimeChatEvent =
  | { type: "ready" }
  | { type: "typing" }
  | RealtimeAnswerEvent
  | { type: "error"; message?: string };

type ChatPrompt = {
  label: string;
  message: string;
};

const CHAT_PROMPTS: Record<LanguageCode, ChatPrompt[]> = {
  "pt-BR": [
    {
      label: "Desabafar",
      message: "Quero desabafar sobre o que estou sentindo."
    },
    {
      label: "Pensar melhor",
      message: "Não consigo pensar direito. Pode me ajudar em frases curtas?"
    },
    {
      label: "Acalmar",
      message: "Preciso me acalmar agora. Fique comigo por um momento."
    },
    {
      label: "Organizar meu dia",
      message: "Quero organizar meu dia com um passo leve."
    }
  ],
  en: [
    {
      label: "Need to vent",
      message: "I need to vent about how I'm feeling."
    },
    {
      label: "Help me think",
      message: "I can't think clearly. Can you help me in short sentences?"
    },
    {
      label: "Calm me down",
      message: "I need to calm down now. Stay with me for a moment."
    },
    {
      label: "Plan my day",
      message: "I want to organize my day with one gentle step."
    }
  ],
  es: [
    {
      label: "Desahogarme",
      message: "Necesito desahogarme sobre lo que siento."
    },
    {
      label: "Ayúdame a pensar",
      message: "No puedo pensar bien. ¿Puedes ayudarme con frases cortas?"
    },
    {
      label: "Calmarme",
      message: "Necesito calmarme ahora. Acompáñame un momento."
    },
    {
      label: "Organizar mi día",
      message: "Quiero organizar mi día con un paso suave."
    }
  ]
};

function formatChatText(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/^\s*[-*]\s+/gmu, "- ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function speakText(text: string, language: LanguageCode) {
  const content = formatChatText(text);
  if (!content) {
    return;
  }
  try {
    Speech.stop();
    Speech.speak(content, {
      language,
      pitch: 1,
      rate: 0.96
    });
  } catch {
    // O texto continua funcionando se a síntese falhar.
  }
}

function fromHistoryMessage(message: ChatHistoryMessage): Message {
  return {
    id: message.id,
    sender: message.sender,
    content: message.content,
    risk_level: message.risk_level,
    created_at: message.created_at
  };
}

function replaceLatestPendingUserMessage(current: Message[], messageId?: string | null): Message[] {
  if (!messageId) {
    return current;
  }
  const index = [...current].reverse().findIndex((message) => message.sender === "USER" && message.pending);
  if (index < 0) {
    return current;
  }
  const targetIndex = current.length - 1 - index;
  return current.map((message, itemIndex) =>
    itemIndex === targetIndex ? { ...message, id: messageId, pending: false } : message
  );
}

function markLatestPendingUserMessageFailed(current: Message[]): Message[] {
  const index = [...current].reverse().findIndex((message) => message.sender === "USER" && message.pending);
  if (index < 0) {
    return current;
  }
  const targetIndex = current.length - 1 - index;
  return current.map((message, itemIndex) =>
    itemIndex === targetIndex ? { ...message, pending: false, failed: true } : message
  );
}

function normalizeChatError(error: Error | null | undefined, hasMessages: boolean): string | undefined {
  const message = error?.message;
  if (!message) {
    return undefined;
  }
  if (message === "Not Found") {
    return hasMessages
      ? undefined
      : "Conversa temporariamente indisponível no servidor. Sua conversa será mantida neste aparelho.";
  }
  if (message === "Network request failed") {
    return "Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente.";
  }
  return message;
}

export default function Chat() {
  const { colors } = useAppTheme();
  const { language, t } = useI18n();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: OrbState }>();
  const initialState =
    params.mode && ["silent_presence", "low_energy", "crisis", "sos", "calm", "breathing"].includes(params.mode)
      ? params.mode
      : "idle";
  const orbSize =
    width >= 820
      ? Math.min(214, Math.max(188, width * 0.34))
      : width < 560
        ? Math.min(214, Math.max(172, width * 0.46))
        : Math.min(244, Math.max(188, width * 0.52));
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [orbState, setOrbState] = useState<OrbState>(initialState);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState(false);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [realtimePending, setRealtimePending] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const historyHydratedRef = useRef(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const realtimePendingRef = useRef(false);
  const voicePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicePreviewRef = useRef(false);
  const webSpeechRecognitionRef = useRef<any>(null);
  const webSpeechActiveRef = useRef(false);
  const speakNextAssistantResponseRef = useRef(false);
  const microphone = useMicrophoneLevel();
  const chatScopeKey = userId ?? accessToken ?? "anonymous";
  const [webSpeechActive, setWebSpeechActive] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["chat-history", chatScopeKey, language],
    queryFn: getChatHistory,
    enabled: Boolean(accessToken && userId),
    retry: false,
    staleTime: 15_000
  });

  const mutation = useMutation({
    mutationFn: (message: string) => sendChatMessage(message, sessionId, language),
    onMutate: () => setOrbState("thinking"),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setMessages((current) => [
        ...replaceLatestPendingUserMessage(current, data.user_message_id),
        {
          id: data.assistant_message_id ?? undefined,
          sender: "BERGMANN",
          content: data.answer,
          risk_level: data.risk_level
        }
      ]);
      setOrbState(data.risk_level === "CRISIS" ? "crisis" : data.fallback ? "error" : "speaking");
      if (voicePreviewRef.current || speakNextAssistantResponseRef.current) {
        speakText(data.answer, language);
        speakNextAssistantResponseRef.current = false;
      }
    },
    onError: () => {
      setMessages(markLatestPendingUserMessageFailed);
      setOrbState("error");
      speakNextAssistantResponseRef.current = false;
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, message }: { messageId: string; message: string }) =>
      editChatMessage(messageId, message, language),
    onMutate: () => setOrbState("thinking"),
    onSuccess: (data, variables) => {
      setSessionId(data.session_id);
      setMessages((current) => {
        const targetIndex = current.findIndex((message) => message.id === variables.messageId);
        const kept = targetIndex >= 0 ? current.slice(0, targetIndex + 1) : current;
        const updated = kept.map((message) =>
          message.id === variables.messageId
            ? { ...message, content: variables.message, pending: false }
            : message
        );
        return [
          ...updated,
          {
            id: data.assistant_message_id ?? undefined,
            sender: "BERGMANN",
            content: data.answer,
            risk_level: data.risk_level
          }
        ];
      });
      setEditingMessageId(null);
      setEditingMessageText("");
      setText("");
      setOrbState(data.risk_level === "CRISIS" ? "crisis" : data.fallback ? "error" : "speaking");
      if (voicePreviewRef.current || speakNextAssistantResponseRef.current) {
        speakText(data.answer, language);
        speakNextAssistantResponseRef.current = false;
      }
    },
    onError: () => {
      setOrbState("error");
      speakNextAssistantResponseRef.current = false;
    }
  });

  const voiceMutation = useMutation({
    mutationFn: ({ audioUri }: { audioUri: string }) => sendVoiceChatAudio(audioUri, sessionId, language),
    onMutate: () => {
      setOrbState("thinking");
      setVoiceNotice(t("chat.voiceTranscribing"));
    },
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setMessages((current) => [
        ...current,
        {
          id: data.user_message_id ?? undefined,
          sender: "USER",
          content: data.transcript
        },
        {
          id: data.assistant_message_id ?? undefined,
          sender: "BERGMANN",
          content: data.answer,
          risk_level: data.risk_level
        }
      ]);
      setOrbState(data.risk_level === "CRISIS" ? "crisis" : data.fallback ? "error" : "speaking");
      setVoiceNotice(null);
      if (voicePreview || speakNextAssistantResponseRef.current) {
        speakText(data.answer, language);
        speakNextAssistantResponseRef.current = false;
      }
    },
    onError: () => {
      setOrbState("error");
      setVoiceNotice(t("chat.voiceUnavailable"));
      speakNextAssistantResponseRef.current = false;
    }
  });

  useEffect(() => {
    let mounted = true;

    historyHydratedRef.current = false;
    setCacheReady(false);
    setSessionId(null);
    setMessages([]);
    setEditingMessageId(null);
    setEditingMessageText("");
    setText("");
    setRealtimePending(false);
    setRealtimeError(null);
    setOrbState(initialState);

    void getCachedChat(chatScopeKey, language)
      .then((cache) => {
        if (!mounted || !cache) {
          return;
        }
        setSessionId(cache.session_id);
        setMessages(cache.messages);
      })
      .finally(() => {
        if (mounted) {
          setCacheReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [chatScopeKey, language, initialState]);

  useEffect(() => {
    realtimePendingRef.current = realtimePending;
  }, [realtimePending]);

  useEffect(() => {
    voicePreviewRef.current = voicePreview;
  }, [voicePreview]);

  useEffect(() => {
    webSpeechActiveRef.current = webSpeechActive;
  }, [webSpeechActive]);

  useEffect(() => {
    if (historyHydratedRef.current || !historyQuery.data || messages.some((message) => message.pending)) {
      return;
    }
    historyHydratedRef.current = true;
    if (historyQuery.data.messages.length > 0 || messages.length === 0) {
      setSessionId(historyQuery.data.session_id);
      setMessages(historyQuery.data.messages.map(fromHistoryMessage));
    }
  }, [historyQuery.data, messages]);

  useEffect(() => {
    if (!cacheReady || !userId) {
      return;
    }
    void saveChatCache(chatScopeKey, language, { messages, session_id: sessionId }).catch(() => undefined);
  }, [cacheReady, chatScopeKey, language, messages, sessionId, userId]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let closedByEffect = false;
    let socket: WebSocket;
    try {
      socket = new WebSocket(getWebSocketUrl("/chat/realtime"));
    } catch {
      setRealtimeError(t("chat.realtimeUnavailable"));
      return;
    }

    websocketRef.current = socket;
    setRealtimeReady(false);
    setRealtimeError(null);

    socket.onopen = () => {
      socket.send(JSON.stringify({ access_token: accessToken, language }));
    };
    socket.onmessage = (event) => {
      let payload: RealtimeChatEvent;
      try {
        payload = JSON.parse(String(event.data)) as RealtimeChatEvent;
      } catch {
        setRealtimeError(t("chat.realtimeUnavailable"));
        return;
      }
      if (payload.type === "ready") {
        setRealtimeReady(true);
        return;
      }
      if (payload.type === "typing") {
        setRealtimePending(true);
        setOrbState("thinking");
        return;
      }
      if (payload.type === "answer") {
        const answerPayload: RealtimeAnswerEvent = payload;
        setSessionId(answerPayload.session_id);
        setMessages((current) => [
          ...replaceLatestPendingUserMessage(current, answerPayload.user_message_id),
          {
            id: answerPayload.assistant_message_id ?? undefined,
            sender: "BERGMANN",
            content: answerPayload.answer,
            risk_level: answerPayload.risk_level
          }
        ]);
        setRealtimePending(false);
        setOrbState(
          answerPayload.risk_level === "CRISIS" ? "crisis" : answerPayload.fallback ? "error" : "speaking"
        );
        if (voicePreviewRef.current || speakNextAssistantResponseRef.current) {
          speakText(answerPayload.answer, language);
          speakNextAssistantResponseRef.current = false;
        }
        return;
      }
      if (payload.type === "error") {
        setRealtimePending(false);
        setRealtimeError(payload.message ?? t("chat.realtimeUnavailable"));
        if (realtimePendingRef.current) {
          setMessages(markLatestPendingUserMessageFailed);
        }
        setOrbState("error");
        speakNextAssistantResponseRef.current = false;
      }
    };
    socket.onerror = () => {
      if (!closedByEffect) {
        setRealtimeError(t("chat.realtimeUnavailable"));
      }
      if (realtimePendingRef.current) {
        setMessages(markLatestPendingUserMessageFailed);
      }
      setRealtimeReady(false);
      setRealtimePending(false);
      speakNextAssistantResponseRef.current = false;
    };
    socket.onclose = () => {
      if (websocketRef.current === socket) {
        websocketRef.current = null;
      }
      if (!closedByEffect && realtimePendingRef.current) {
        setMessages(markLatestPendingUserMessageFailed);
      }
      setRealtimeReady(false);
      setRealtimePending(false);
      speakNextAssistantResponseRef.current = false;
    };

    return () => {
      closedByEffect = true;
      if (websocketRef.current === socket) {
        websocketRef.current = null;
      }
      socket.close();
    };
  }, [accessToken, language, t]);

  useEffect(() => {
    return () => {
      if (voicePreviewTimeoutRef.current) {
        clearTimeout(voicePreviewTimeoutRef.current);
      }
      if (webSpeechRecognitionRef.current) {
        try {
          webSpeechRecognitionRef.current.stop();
        } catch {
          // Ignorado: limpeza de reconhecimento não deve quebrar o unmount.
        }
        webSpeechRecognitionRef.current = null;
      }
      speakNextAssistantResponseRef.current = false;
      Speech.stop();
    };
  }, []);

  function startEditing(message: Message) {
    if (!message.id || message.pending) {
      return;
    }
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
    setText(message.content);
    setOrbState("listening");
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditingMessageText("");
    setText("");
    setOrbState(initialState);
  }

  function retryFailedMessage(index: number) {
    const failedMessage = messages[index];
    if (!failedMessage || failedMessage.sender !== "USER" || !failedMessage.failed) {
      return;
    }
    setMessages((current) =>
      current.map((message, itemIndex) =>
        itemIndex === index ? { ...message, pending: true, failed: false } : message
      )
    );
    mutation.mutate(failedMessage.content);
  }

  function stopWebSpeechRecognition() {
    const recognition = webSpeechRecognitionRef.current;
    webSpeechRecognitionRef.current = null;
    setWebSpeechActive(false);
    if (!recognition) {
      return;
    }
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    } catch {
      // Ignorado: a limpeza não deve bloquear o restante do fluxo.
    }
  }

  function startWebSpeechRecognition() {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return false;
    }
    const SpeechRecognitionCtor =
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ??
      (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      return false;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      webSpeechRecognitionRef.current = recognition;
      setWebSpeechActive(true);
      setVoiceNotice(t("chat.voiceRecording"));
      setOrbState("listening");

      let finished = false;
      recognition.onresult = (event: any) => {
        if (finished) {
          return;
        }
        finished = true;
        const transcript = Array.from(event.results ?? [])
          .map((result: any) => result?.[0]?.transcript ?? "")
          .join(" ")
          .trim();
        stopWebSpeechRecognition();
        if (!transcript) {
          setVoiceNotice(t("chat.voiceUnavailable"));
          setOrbState(initialState);
          return;
        }
        setVoiceNotice(null);
        speakNextAssistantResponseRef.current = true;
        mutation.mutate(transcript);
      };
      recognition.onerror = () => {
        if (finished) {
          return;
        }
        finished = true;
        stopWebSpeechRecognition();
        setVoiceNotice(t("chat.voiceUnavailable"));
        setOrbState(initialState);
      };
      recognition.onend = () => {
        if (finished) {
          return;
        }
        finished = true;
        stopWebSpeechRecognition();
        setVoiceNotice(t("chat.voiceUnavailable"));
        setOrbState(initialState);
      };
      recognition.start();
      return true;
    } catch {
      webSpeechRecognitionRef.current = null;
      setWebSpeechActive(false);
      return false;
    }
  }

  function send() {
    const message = text.trim();
    if (!message) return;

    if (editingMessageId) {
      editMutation.mutate({ messageId: editingMessageId, message });
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, sender: "USER", content: message, pending: true }
    ]);
    setText("");
    const socket = websocketRef.current;
    if (realtimeReady && socket?.readyState === WebSocket.OPEN) {
      setRealtimePending(true);
      setOrbState("thinking");
      try {
        socket.send(JSON.stringify({ type: "message", message, session_id: sessionId, language }));
        return;
      } catch {
        setRealtimePending(false);
        setRealtimeReady(false);
      }
    }
    mutation.mutate(message);
  }

  async function toggleMicrophoneLevel() {
    if (voicePreviewTimeoutRef.current) {
      clearTimeout(voicePreviewTimeoutRef.current);
      voicePreviewTimeoutRef.current = null;
    }
    if (webSpeechActive) {
      stopWebSpeechRecognition();
      setVoiceNotice(null);
      setOrbState(initialState);
      Speech.stop();
      return;
    }
    if (pending && !microphone.isActive && !voicePreview) {
      return;
    }
    if (voicePreview) {
      setVoicePreview(false);
      setVoiceNotice(null);
      setOrbState(initialState);
      Speech.stop();
      return;
    }
    if (microphone.isActive) {
      const audioUri = await microphone.stop();
      setOrbState(initialState);
      if (!audioUri) {
        setVoiceNotice(null);
        speakNextAssistantResponseRef.current = false;
        return;
      }
      voiceMutation.mutate({ audioUri });
      return;
    }
    if (Constants.appOwnership === "expo") {
      setVoicePreview(true);
      setOrbState("listening");
      setVoiceNotice(t("chat.voicePreviewNotice"));
      voicePreviewTimeoutRef.current = setTimeout(() => {
        setVoicePreview(false);
        setOrbState(initialState);
        Speech.stop();
      }, 9000);
      return;
    }
    if (startWebSpeechRecognition()) {
      return;
    }
    try {
      await microphone.start();
      speakNextAssistantResponseRef.current = true;
      setOrbState("listening");
      setVoiceNotice(t("chat.voiceRecording"));
    } catch {
      speakNextAssistantResponseRef.current = false;
      setVoiceNotice(microphone.errorMessage ?? t("chat.voiceUnavailable"));
      setOrbState(initialState);
    }
  }

  const pending = mutation.isPending || editMutation.isPending || voiceMutation.isPending || realtimePending;
  const currentOrbState = microphone.isActive || voicePreview || webSpeechActive ? "listening" : pending ? "thinking" : orbState;
  const statusLabel =
    currentOrbState === "listening"
      ? t("chat.status.listening")
      : currentOrbState === "thinking"
        ? t("chat.status.thinking")
        : currentOrbState === "speaking"
          ? t("chat.status.speaking")
          : realtimeReady
            ? t("chat.realtimeReady")
            : realtimeError
              ? t("chat.httpFallback")
              : t("chat.realtimeConnecting");
  const sendLabel = editingMessageId ? t("common.save") : t("common.send");
  const wideChat = width >= 820;
  const compactComposer = width < 560;
  const compactPrompts = width >= 360 && width < 820;
  const bottomSpacer = width < 560 ? 96 : 72;
  const sendButtonShadow = shadowStyle({ color: colors.shadowStrong, opacity: 0.3, radius: 14, offsetY: 8, elevation: 4 });
  const chatPrompts = CHAT_PROMPTS[language] ?? CHAT_PROMPTS["pt-BR"];
  const errorMessage =
    normalizeChatError(mutation.error, messages.length > 0) ??
    normalizeChatError(editMutation.error, messages.length > 0) ??
    normalizeChatError(historyQuery.error, messages.length > 0);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: width >= 820 ? 16 : 24, width: "100%" }}>
        <View
          style={{
            alignItems: "center",
            gap: width >= 820 ? 12 : 14,
            maxWidth: 640,
            width: "100%"
          }}
        >
          <AnimatedOrb
            accent={
              currentOrbState === "crisis" || currentOrbState === "sos"
                ? colors.warning
                : currentOrbState === "error"
                  ? colors.error
                  : currentOrbState === "listening"
                    ? colors.info
                    : currentOrbState === "speaking"
                      ? colors.primaryDark
                      : currentOrbState === "thinking"
                        ? colors.primary
                        : colors.primaryDark
            }
            state={currentOrbState}
            audioLevel={microphone.isActive ? microphone.level : voicePreview || webSpeechActive ? 0.34 : pending ? 0.22 : 0}
            size={orbSize}
            onPress={toggleMicrophoneLevel}
          />
          <Text
            className="text-xs font-semibold text-primary"
            style={{ textAlign: "center" }}
          >
            {statusLabel}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              lineHeight: 24,
              maxWidth: 320,
              textAlign: "center"
            }}
          >
            {t("chat.intro")}
          </Text>
        </View>

        <View style={{ gap: 16, maxWidth: 960, width: "100%" }}>
          {messages.length === 0 && !text.trim() && !historyQuery.isLoading ? (
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10
                }}
              >
                {chatPrompts.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    accessibilityRole="button"
                    onPress={() => {
                      setText(prompt.message);
                      setOrbState("listening");
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: colors.surfaceStrong,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      flexGrow: 1,
                      flexBasis: wideChat ? "48%" : compactPrompts ? "48%" : "100%",
                      justifyContent: "center",
                      minHeight: compactPrompts ? 48 : 52,
                      opacity: pressed ? 0.86 : 1,
                      paddingHorizontal: compactPrompts ? 12 : 14,
                      paddingVertical: compactPrompts ? 10 : 12
                    })}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: 14,
                        fontWeight: "800",
                        lineHeight: 20,
                        textAlign: "center"
                      }}
                    >
                      {prompt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          <View className="gap-3">
            {historyQuery.isLoading && messages.length === 0 ? (
              <Card>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("chat.historyLoading")}</Text>
              </Card>
            ) : messages.length === 0 ? (
              <View style={{ minHeight: 12 }} />
            ) : (
              messages.map((message, index) => (
                <View
                  key={message.id ?? `${message.sender}-${index}`}
                  className={`rounded-2xl p-4 ${
                    message.sender === "USER"
                      ? "bg-primaryLight/90"
                      : "border border-primaryLight dark:border-[#4C1D95]/10 bg-surface dark:bg-[#1C1630]"
                  }`}
                >
                  <Text
                    selectable
                    className={`text-base leading-6 ${
                      message.sender === "USER" ? "text-ink dark:text-white" : "text-ink dark:text-white"
                    }`}
                  >
                    {formatChatText(message.content)}
                  </Text>
                  {message.sender === "USER" && message.failed ? (
                    <View className="mt-3 gap-2">
                      <Text className="text-xs font-semibold text-error">{t("chat.sendFailed")}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => retryFailedMessage(index)}
                        className="self-start rounded-full bg-surfaceSoft dark:bg-[#261D42]/10 px-3 py-1"
                      >
                        <Text className="text-xs font-semibold text-ink dark:text-white">{t("chat.retry")}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {message.sender === "USER" && message.id && !message.pending && !message.failed ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => startEditing(message)}
                      className="mt-3 self-start rounded-full bg-surfaceSoft dark:bg-[#261D42]/10 px-3 py-1"
                    >
                      <Text className="text-xs font-semibold text-ink dark:text-white">{t("chat.edit")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
            {pending ? (
              <View className="rounded-2xl border border-primaryLight dark:border-[#4C1D95]/10 bg-surface dark:bg-[#1C1630] p-4">
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("chat.typing")}</Text>
              </View>
            ) : null}
          </View>

          {editingMessageId ? (
            <Card>
              <Text className="text-sm leading-5 text-primaryDark">{t("chat.editing")}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                {formatChatText(editingMessageText)}
              </Text>
              <Pressable accessibilityRole="button" onPress={cancelEditing} className="self-start rounded-full py-1">
                <Text className="text-sm font-semibold text-primary">{t("chat.cancelEdit")}</Text>
              </Pressable>
            </Card>
          ) : null}
          <ErrorText message={errorMessage} />
          {realtimeError && messages.length === 0 ? (
            <Card>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{t("chat.httpFallback")}</Text>
            </Card>
          ) : null}
          <ErrorText message={microphone.errorMessage ?? undefined} />
          {voiceNotice ? (
            <Card>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{voiceNotice}</Text>
            </Card>
          ) : null}
          <View style={{ alignItems: compactComposer ? "stretch" : "flex-end", flexDirection: compactComposer ? "column" : "row", gap: 12 }}>
            <TextInput
              accessibilityLabel={t("chat.accessibility")}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setOrbState(value ? "listening" : initialState);
              }}
              placeholder={t("chat.placeholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderCurve: "continuous",
                borderRadius: radii.lg,
                borderWidth: 1,
                color: colors.textPrimary,
                flex: compactComposer ? undefined : 1,
                fontSize: 15,
                lineHeight: 22,
                maxHeight: 150,
                minHeight: 54,
                paddingHorizontal: 16,
                paddingVertical: 14,
                textAlignVertical: "top",
                width: compactComposer ? "100%" : undefined
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending }}
              onPress={send}
              disabled={pending}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.gradientEnd,
                borderColor: colors.primaryLight,
                ...sendButtonShadow,
                borderWidth: 1.5,
                borderRadius: radii.lg,
                justifyContent: "center",
                minHeight: 56,
                minWidth: compactComposer ? undefined : 64,
                opacity: pending ? 0.62 : pressed ? 0.84 : 1,
                paddingHorizontal: 14,
                width: compactComposer ? "100%" : undefined
              })}
            >
              <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                <Ionicons color={colors.textPrimary} name="send-outline" size={17} />
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 20 }}>
                  {sendLabel}
                </Text>
              </View>
            </Pressable>
          </View>
          <Button
            label={microphone.isActive || voicePreview || webSpeechActive ? t("chat.voiceOn") : t("chat.voiceOff")}
            icon={microphone.isActive || voicePreview || webSpeechActive ? "mic-off-outline" : "mic-outline"}
            tone="soft"
            loading={microphone.status === "requesting_permission"}
            onPress={toggleMicrophoneLevel}
          />
          <View style={{ height: bottomSpacer }} />
        </View>
      </View>
    </Screen>
  );
}
