import { router } from "expo-router";
import { useState } from "react";
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

import { login as loginRequest } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

const COLORS = {
  background: "#0F1220",
  card: "#171B2E",
  cardStrong: "#1D2340",
  border: "#2A3558",
  primary: "#A855F7",
  primarySoft: "#C4B5FD",
  text: "#F5F7FF",
  muted: "#A7B0C6",
  danger: "#FB7185"
} as const;

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await loginRequest({ email, password });
      await setSession(data.access_token, data.refresh_token, data.user);
      router.replace("/(app)/home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.backdropGlow} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.kicker}>BERGMANN</Text>
            <Text style={styles.title}>Acesso seguro ao app</Text>
            <Text style={styles.subtitle}>
              Entre com sua conta para validar a conexao com o backend no Render.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Sua senha"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.helper}>Se o backend nao responder, o app continua abrindo normalmente.</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [styles.button, loading && styles.buttonDisabled, pressed && !loading && styles.buttonPressed]}
            >
              {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Entrar</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.background,
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
  backdropGlow: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 260,
    left: -120,
    opacity: 0.14,
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
    color: COLORS.primarySoft,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
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
    color: COLORS.primarySoft,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    backgroundColor: COLORS.cardStrong,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  helper: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 19
  },
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    minHeight: 54,
    justifyContent: "center"
  },
  buttonPressed: {
    opacity: 0.88
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900"
  }
});
