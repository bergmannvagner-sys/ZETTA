import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { getApiUrl } from "../src/lib/api-url";
import { loadSession, type SessionState } from "../src/lib/session";
import { loadSupportHistory, saveSupportHistory } from "../src/lib/support-history";
import { sendSupportMessage, type SupportChatMessage } from "../src/lib/support";

const BACKGROUND = "#0F1220";
const CARD = "#171B2E";
const CARD_STRONG = "#1D2340";
const BORDER = "#2A3558";
const PRIMARY = "#A855F7";
const PRIMARY_SOFT = "#C4B5FD";
const TEXT = "#F5F7FF";
const MUTED = "#A7B0C6";
const ERROR = "#FB7185";
const SUCCESS = "#4ADE80";

const QUICK_PROMPTS = [
  "Nao consigo abrir o app",
  "Erro no login",
  "Cadastro nao salva",
  "A API do Render falhou"
];

function trimValue(value: string): string {
  return value.trim();
}

function buildWelcomeMessage(fullName?: string | null): SupportChatMessage {
  return {
    sender: "BERGMANN",
    content: fullName
      ? `Ola, ${fullName}. Posso ajudar com login, cadastro, APK, Render e erros do app.`
      : "Ola. Posso ajudar com login, cadastro, APK, Render e erros do app."
  };
}

export default function SupportScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = getApiUrl();
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  const canSend = useMemo(
    () => Boolean(session?.user?.id) && Boolean(trimValue(input)) && !loading && Boolean(apiUrl) && historyReady,
    [apiUrl, historyReady, input, loading, session]
  );

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      try {
        const storedSession = await loadSession();
        if (active) {
          setSession(storedSession);
        }
      } catch {
        if (active) {
          setSession(null);
        }
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateHistory() {
      if (!hydrated) {
        return;
      }

      setHistoryReady(false);
      setSessionId(null);

      if (!session?.user?.id) {
        setMessages([]);
        setError(null);
        if (active) {
          setHistoryReady(true);
        }
        return;
      }

      try {
        const storedHistory = await loadSupportHistory(session.user.id, session.accessToken);
        if (!active) {
          return;
        }

        setSessionId(storedHistory.session_id);

        const nextMessages: SupportChatMessage[] =
          storedHistory.messages.length > 0 ? storedHistory.messages : [buildWelcomeMessage(session.user.full_name)];

        setMessages(nextMessages);
        setError(null);

        if (storedHistory.messages.length === 0) {
          void saveSupportHistory(session.user.id, nextMessages).catch(() => undefined);
        }
      } catch {
        if (!active) {
          return;
        }

        const fallbackMessages: SupportChatMessage[] = [buildWelcomeMessage(session.user.full_name)];
        setMessages(fallbackMessages);
        setError(null);
        void saveSupportHistory(session.user.id, fallbackMessages).catch(() => undefined);
      } finally {
        if (active) {
          setHistoryReady(true);
        }
      }
    }

    void hydrateHistory();

    return () => {
      active = false;
    };
  }, [hydrated, session?.user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  async function sendPrompt(message: string) {
    const trimmed = trimValue(message);
    const currentSession = session;
    if (!trimmed || !currentSession?.user?.id) {
      if (!currentSession?.user?.id) {
        setError("Faca login para usar o suporte com historico.");
      }
      return;
    }

    const contextMessages = messages.slice(-8);
    const userMessage: SupportChatMessage = { sender: "USER", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await sendSupportMessage({
        accessToken: currentSession.accessToken,
        message: trimmed,
        language: "pt-BR",
        contextMessages,
        sessionId
      });
      setSessionId(response.session_id);
      const finalMessages: SupportChatMessage[] = [...nextMessages, { sender: "BERGMANN", content: response.answer }];
      setMessages(finalMessages);
      void saveSupportHistory(currentSession.user.id, finalMessages).catch(() => undefined);
    } catch (nextError) {
      const fallbackMessage =
        nextError instanceof Error ? nextError.message : "Nao foi possivel abrir o suporte com IA.";
      setError(fallbackMessage);
      const finalMessages: SupportChatMessage[] = [
        ...nextMessages,
        {
          sender: "BERGMANN",
          content:
            "Nao consegui responder agora. Verifique a conexao com o Render e tente novamente com a mensagem de erro exata."
        }
      ];
      setMessages(finalMessages);
      void saveSupportHistory(currentSession.user.id, finalMessages).catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || !historyReady) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.helper}>Carregando suporte autenticado...</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.root}>
        <View pointerEvents="none" style={styles.glow} />
        <View style={styles.loadingState}>
          <View style={styles.gateCard}>
            <Text style={styles.kicker}>SUPORTE</Text>
            <Text style={styles.title}>Acesso autenticado</Text>
            <Text style={styles.subtitle}>Faca login para abrir o chat de suporte com historico persistente.</Text>
            {supportEmail ? <Text style={styles.helper}>Contato humano: {supportEmail}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/")}
              style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
            >
              <Text style={styles.sendButtonText}>Voltar para login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.glow} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>SUPORTE</Text>
            <Text style={styles.title}>Chat com IA</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.subtitle}>
            Use para duvidas de login, cadastro, instalacao do APK, Render, erros do backend e funcionamento do app.
          </Text>
          <Text style={styles.helper}>Nao envie senha, token ou codigo de verificacao.</Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable key={prompt} accessibilityRole="button" style={styles.quickChip} onPress={() => void sendPrompt(prompt)}>
              <Text style={styles.quickChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => {
              const isUser = message.sender === "USER";
              return (
                <View
                  key={`${message.sender}-${index}-${message.content}`}
                  style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
                >
                  <Text style={[styles.bubbleLabel, isUser ? styles.userBubbleLabel : styles.assistantBubbleLabel]}>
                    {isUser ? "Voce" : "Bergmann"}
                  </Text>
                  <Text style={styles.bubbleText}>{message.content}</Text>
                </View>
              );
            })}
            {loading ? (
              <View style={[styles.bubble, styles.assistantBubble]}>
                <Text style={[styles.bubbleLabel, styles.assistantBubbleLabel]}>Bergmann</Text>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.composer}>
          <TextInput
            autoCapitalize="sentences"
            autoCorrect={false}
            placeholder="Explique o erro ou a duvida"
            placeholderTextColor={MUTED}
            style={styles.input}
            value={input}
            multiline
            onChangeText={setInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canSend}
            onPress={() => void sendPrompt(input)}
            style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && canSend && styles.pressed]}
          >
            {loading ? <ActivityIndicator color={TEXT} /> : <Text style={styles.sendButtonText}>Enviar</Text>}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {apiUrl ? `Conectado ao Render em ${apiUrl}` : "API nao configurada. Defina EXPO_PUBLIC_API_URL."}
          </Text>
            {supportEmail ? <Text style={styles.footerText}>Contato humano: {supportEmail}</Text> : null}
          <Text style={styles.footerText}>Historico sincronizado na sua conta autenticada.</Text>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.success}>Resposta curta e segura para baixa carga cognitiva.</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BACKGROUND,
    flex: 1
  },
  flex: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  glow: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    height: 240,
    left: -120,
    opacity: 0.12,
    position: "absolute",
    top: -100,
    width: 240
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  backButton: {
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  backButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800"
  },
  kicker: {
    color: PRIMARY_SOFT,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4
  },
  title: {
    color: TEXT,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38
  },
  hero: {
    gap: 6,
    marginBottom: 14
  },
  gateCard: {
    alignSelf: "stretch",
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    maxWidth: 520,
    padding: 20,
    width: "100%"
  },
  subtitle: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22
  },
  helper: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14
  },
  quickChip: {
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  quickChipText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700"
  },
  card: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    marginBottom: 14,
    overflow: "hidden"
  },
  messages: {
    gap: 12,
    padding: 16
  },
  bubble: {
    borderRadius: 18,
    gap: 6,
    maxWidth: "92%",
    padding: 14
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: PRIMARY
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderWidth: 1
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2
  },
  userBubbleLabel: {
    color: TEXT
  },
  assistantBubbleLabel: {
    color: PRIMARY_SOFT
  },
  bubbleText: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 21
  },
  composer: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  input: {
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    color: TEXT,
    fontSize: 15,
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top"
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    minHeight: 50,
    justifyContent: "center"
  },
  sendButtonDisabled: {
    opacity: 0.7
  },
  sendButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900"
  },
  footer: {
    gap: 6,
    paddingBottom: 10
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  footerText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 16
  },
  error: {
    color: ERROR,
    fontSize: 12,
    lineHeight: 16
  },
  success: {
    color: SUCCESS,
    fontSize: 12,
    lineHeight: 16
  },
  pressed: {
    opacity: 0.88
  }
});
