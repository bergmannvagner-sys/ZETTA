import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { getApiUrl } from "../src/lib/api-url";
import { login, register, type RegisterRole } from "../src/lib/auth";
import {
  documentExample,
  documentKindForRole,
  documentLabel,
  documentPlaceholder,
  normalizeDocumentInput,
  validateDocument
} from "../src/lib/document";
import { clearSession, loadSession, saveSession, type SessionState } from "../src/lib/session";

type AuthMode = "login" | "register";

const BACKGROUND = "#0F1220";
const CARD = "#171B2E";
const CARD_STRONG = "#1D2340";
const BORDER = "#2A3558";
const PRIMARY = "#A855F7";
const PRIMARY_SOFT = "#C4B5FD";
const TEXT = "#F5F7FF";
const MUTED = "#A7B0C6";
const ERROR = "#FB7185";

function trimValue(value: string): string {
  return value.trim();
}

function SegmentButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.segmentButton, active && styles.segmentButtonActive, pressed && styles.pressed]}
    >
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function IndexScreen() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [role, setRole] = useState<RegisterRole>("USER");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl = getApiUrl();
  const documentKind = documentKindForRole(role);
  const normalizedDocument = normalizeDocumentInput(documentValue);
  const documentError = useMemo(() => validateDocument(documentKind, normalizedDocument), [documentKind, normalizedDocument]);
  const loginCanSubmit = useMemo(() => Boolean(trimValue(email)) && Boolean(password) && Boolean(apiUrl), [apiUrl, email, password]);
  const registerCanSubmit = useMemo(
    () =>
      Boolean(trimValue(fullName)) &&
      Boolean(trimValue(email)) &&
      Boolean(password) &&
      password.trim().length >= 8 &&
      Boolean(normalizedDocument) &&
      lgpdConsent &&
      Boolean(apiUrl) &&
      !documentError,
    [apiUrl, documentError, email, fullName, lgpdConsent, normalizedDocument, password]
  );

  useEffect(() => {
    let active = true;

    async function hydrate() {
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

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  async function persistSession(nextSession: SessionState | null) {
    if (!nextSession) {
      await clearSession();
      setSession(null);
      return;
    }

    await saveSession(nextSession);
    setSession(nextSession);
  }

  async function handleSubmit() {
    if (mode === "login") {
      const normalizedEmail = trimValue(email).toLowerCase();
      const trimmedPassword = password.trim();

      if (!loginCanSubmit) {
        setMessage(apiUrl ? "Informe e-mail e senha." : "Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const data = await login({ email: normalizedEmail, password: trimmedPassword });
        await persistSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user
        });
        setPassword("");
        setMessage("Autenticado com sucesso.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha de rede ao acessar o Render.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const normalizedEmail = trimValue(email).toLowerCase();
    const normalizedFullName = trimValue(fullName);
    const trimmedPassword = password.trim();

    if (!registerCanSubmit) {
      setMessage(apiUrl ? "Preencha os campos e aceite o consentimento LGPD." : "Defina EXPO_PUBLIC_API_URL para conectar ao Render.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const data = await register({
        email: normalizedEmail,
        full_name: normalizedFullName,
        password: trimmedPassword,
        role,
        document: normalizedDocument,
        lgpdConsent
      });
      await persistSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user
      });
      setPassword("");
      setFullName("");
      setDocumentValue("");
      setLgpdConsent(false);
      setMessage(data.user.status === "PENDING_VERIFICATION" ? "Conta criada. Aguardando validacao." : "Conta criada e autenticada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha de rede ao acessar o Render.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await persistSession(null);
      setMode("login");
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
            <Text style={styles.title}>Base segura</Text>
            <Text style={styles.subtitle}>
              Login, cadastro minimo e contrato com o Render sem reabrir a arvore antiga.
            </Text>
          </View>

          {session ? (
            <View style={styles.card}>
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
                <View style={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/support")}
                    style={({ pressed }) => [styles.supportButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.supportButtonText}>Abrir chat de suporte com IA</Text>
                  </Pressable>
                  <Text style={styles.helper}>O suporte salva o historico por conta neste aparelho.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleLogout()}
                  style={({ pressed }) => [styles.buttonSecondary, pressed && styles.pressed]}
                >
                  <Text style={styles.buttonSecondaryText}>{loading ? "Saindo..." : "Sair"}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.helper}>Faca login para abrir o suporte com historico.</Text>
              <View style={styles.segmentRow}>
                <SegmentButton active={mode === "login"} label="Entrar" onPress={() => setMode("login")} />
                <SegmentButton active={mode === "register"} label="Criar conta" onPress={() => setMode("register")} />
              </View>

              {mode === "login" ? (
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
                    {apiUrl ? `API configurada em ${apiUrl}` : "API nao configurada. Defina EXPO_PUBLIC_API_URL."}
                  </Text>

                  {message ? <Text style={styles.error}>{message}</Text> : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={loading || !loginCanSubmit}
                    onPress={() => void handleSubmit()}
                    style={({ pressed }) => [
                      styles.buttonPrimary,
                      (loading || !loginCanSubmit) && styles.buttonDisabled,
                      pressed && !loading && loginCanSubmit && styles.pressed
                    ]}
                  >
                    {loading ? <ActivityIndicator color={TEXT} /> : <Text style={styles.buttonPrimaryText}>Entrar</Text>}
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Nome completo</Text>
                    <TextInput
                      autoCapitalize="words"
                      autoComplete="name"
                      autoCorrect={false}
                      placeholder="Seu nome"
                      placeholderTextColor={MUTED}
                      style={styles.input}
                      textContentType="name"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>

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
                      placeholder="No minimo 8 caracteres"
                      placeholderTextColor={MUTED}
                      secureTextEntry
                      style={styles.input}
                      textContentType="newPassword"
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Tipo de conta</Text>
                    <View style={styles.segmentRow}>
                      <SegmentButton active={role === "USER"} label="Pessoa" onPress={() => setRole("USER")} />
                      <SegmentButton active={role === "COMPANY"} label="Empresa" onPress={() => setRole("COMPANY")} />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{documentLabel(documentKind)}</Text>
                    <TextInput
                      autoCapitalize="characters"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      placeholder={documentPlaceholder(documentKind)}
                      placeholderTextColor={MUTED}
                      style={styles.input}
                      value={documentValue}
                      onChangeText={setDocumentValue}
                    />
                    <Text style={styles.helper}>
                      {documentError || `${documentExample(documentKind)}. O backend valida formato e bloqueia duplicados.`}
                    </Text>
                  </View>

                  <View style={styles.consentRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.label}>Consentimento LGPD</Text>
                      <Text style={styles.helper}>Necessario para criar a conta e usar o Render com seguranca.</Text>
                    </View>
                    <Switch
                      accessibilityRole="switch"
                      trackColor={{ false: BORDER, true: PRIMARY }}
                      thumbColor={lgpdConsent ? TEXT : "#D4D9E6"}
                      value={lgpdConsent}
                      onValueChange={setLgpdConsent}
                    />
                  </View>

                  <Text style={styles.helper}>
                    {apiUrl ? `API configurada em ${apiUrl}` : "API nao configurada. Defina EXPO_PUBLIC_API_URL."}
                  </Text>

                  {message ? <Text style={styles.error}>{message}</Text> : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={loading || !registerCanSubmit}
                    onPress={() => void handleSubmit()}
                    style={({ pressed }) => [
                      styles.buttonPrimary,
                      (loading || !registerCanSubmit) && styles.buttonDisabled,
                      pressed && !loading && registerCanSubmit && styles.pressed
                    ]}
                  >
                    {loading ? <ActivityIndicator color={TEXT} /> : <Text style={styles.buttonPrimaryText}>Criar conta</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          )}
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
  supportButton: {
    alignSelf: "center",
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    maxWidth: 520,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 16,
    width: "100%"
  },
  supportButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
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
  segmentRow: {
    flexDirection: "row",
    gap: 10
  },
  segmentButton: {
    alignItems: "center",
    backgroundColor: CARD_STRONG,
    borderColor: BORDER,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY
  },
  segmentLabel: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800"
  },
  segmentLabelActive: {
    color: TEXT
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
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
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
