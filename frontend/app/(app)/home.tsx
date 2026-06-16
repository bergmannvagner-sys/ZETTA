import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/store/auth-store";

const COLORS = {
  background: "#0F1220",
  card: "#171B2E",
  cardStrong: "#1D2340",
  border: "#2A3558",
  primary: "#A855F7",
  primarySoft: "#C4B5FD",
  text: "#F5F7FF",
  muted: "#A7B0C6"
} as const;

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await clearSession();
      router.replace("/(auth)/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.kicker}>BERGMANN</Text>
        <Text style={styles.title}>Base minima funcionando</Text>
        <Text style={styles.subtitle}>
          O app abre com menos dependencias, mantendo login e API prontos para reintroduzir recursos aos poucos.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Usuario</Text>
          <Text style={styles.infoValue}>{user?.full_name ?? "Sessao local"}</Text>
          <Text style={styles.infoMeta}>{user?.email ?? "Nenhum usuario autenticado"}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Estado</Text>
          <Text style={styles.infoValue}>{user?.status ?? "Sem sessao"}</Text>
          <Text style={styles.infoMeta}>{user?.role ?? "Abra o login para autenticar"}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={loggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [styles.button, pressed && !loggingOut && styles.buttonPressed, loggingOut && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{loggingOut ? "Saindo..." : "Sair"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: COLORS.background,
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32
  },
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    maxWidth: 560,
    padding: 20,
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
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24
  },
  infoBox: {
    backgroundColor: COLORS.cardStrong,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 16
  },
  infoLabel: {
    color: COLORS.primarySoft,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800"
  },
  infoMeta: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20
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
