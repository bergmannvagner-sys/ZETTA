import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
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

type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
};

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const BACKGROUND = "#0F1220";
const CARD = "#171B2E";
const CARD_STRONG = "#1D2340";
const BORDER = "#2A3558";
const PRIMARY = "#A855F7";
const PRIMARY_SOFT = "#C4B5FD";
const TEXT = "#F5F7FF";
const MUTED = "#A7B0C6";
const ERROR = "#FB7185";
const STORAGE_KEY = "bergmann_minimal_session";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/u, "");

function trimValue(value: string): string {
  return value.trim();
}

export default function IndexScreen() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => Boolean(trimValue(email)) && Boolean(password) && Boolean(API_URL), [email, password]);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!active) {
          return;
        }
        if (!raw) {
          setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as Partial<SessionState> | null;
        if (parsed?.accessToken && parsed?.refreshToken && parsed.user?.email) {
          setSession({
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            user: parsed.user
          });
        }
      } catch {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  async function persistSession(nextSession: SessionState | null) {
    if (!nextSession) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      setSession(null);
      return;
    }

    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  async function handleLogin() {
    const normalizedEmail = trimValue(email).toLowerCase();
    const trimmedPassword = password.trim();

    if (!API_URL) {
      setMessage("Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
      return;
    }
    if (!normalizedEmail || !trimmedPassword) {
      setMessage("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as Partial<AuthResponse> & { detail?: string }) : {};

      if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Nao foi possivel autenticar.";
        setMessage(detail);
        return;
      }

      if (!data.access_token || !data.refresh_token || !data.user?.email) {
        setMessage("Resposta invalida do backend.");
        return;
      }

      const nextSession: SessionState = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user as AuthUser
      };
      await persistSession(nextSession);
      setPassword("");
      setMessage("Autenticado com sucesso.");
    } catch {
      setMessage("Falha de rede ao acessar o Render.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await persistSession(null);
      setMessage("Sessao removida.");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <View style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.helper}>Iniciando app...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.glow} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.kicker}>BERGMANN</Text>
            <Text style={styles.title}>Base zero</Text>
            <Text style={styles.subtitle}>
              Esta versao removeu a arvore antiga e preserva apenas o necessario para abrir, autenticar e testar o Render.
            </Text>
          </View>

          <View style={styles.card}>
            {session ? (
              <View style={{ gap: 14 }}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Usuario</Text>
                  <Text style={styles.infoValue}>{session.user.full_name}</Text>
                  <Text style={styles.infoMeta}>{session.user.email}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>{session.user.status}</Text>
                  <Text style={styles.infoMeta}>{session.user.role}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={({ pressed }) => [styles.buttonSecondary, pressed && styles.pressed]}>
                  <Text style={styles.buttonSecondaryText}>{loading ? "Saindo..." : "Sair"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>E-mail</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="voce@exemplo.com"
                    placeholderTextColor={MUTED}
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Senha</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    placeholder="Sua senha"
                    placeholderTextColor={MUTED}
                    secureTextEntry
                    style={styles.input}
                    textContentType="password"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <Text style={styles.helper}>
                  {API_URL ? `API configurada em ${API_URL}` : "API nao configurada. Defina EXPO_PUBLIC_API_URL."}
                </Text>

                {message ? <Text style={styles.error}>{message}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={loading || !canSubmit}
                  onPress={() => void handleLogin()}
                  style={({ pressed }) => [
                    styles.buttonPrimary,
                    (loading || !canSubmit) && styles.buttonDisabled,
                    pressed && !loading && canSubmit && styles.pressed
                  ]}
                >
                  {loading ? <ActivityIndicator color={TEXT} /> : <Text style={styles.buttonPrimaryText}>Entrar</Text>}
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
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
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 32
  },
  glow: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    height: 260,
    left: -120,
    opacity: 0.12,
    position: "absolute",
    top: -90,
    width: 260
  },
  hero: {
    alignSelf: "center",
    gap: 10,
    maxWidth: 520,
    paddingBottom: 18,
    width: "100%"
  },
  kicker: {
    color: PRIMARY_SOFT,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4
  },
  title: {
    color: TEXT,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40
  },
  subtitle: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    alignSelf: "center",
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    maxWidth: 520,
    padding: 20,
    width: "100%"
  },
  fieldGroup: {
    gap: 8
  },
  label: {
    color: PRIMARY_SOFT,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    color: TEXT,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  helper: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19
  },
  error: {
    color: ERROR,
    fontSize: 13,
    lineHeight: 19
  },
  infoBox: {
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 16
  },
  infoLabel: {
    color: PRIMARY_SOFT,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2
  },
  infoValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800"
  },
  infoMeta: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20
  },
  buttonPrimary: {
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    minHeight: 54,
    justifyContent: "center"
  },
  buttonPrimaryText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900"
  },
  buttonSecondary: {
    alignItems: "center",
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 54,
    justifyContent: "center"
  },
  buttonSecondaryText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  pressed: {
    opacity: 0.88
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
