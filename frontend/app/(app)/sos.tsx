import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SupportMap } from "@/components/support-map";

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

export default function SOS() {
  const [message, setMessage] = useState<string | null>(null);

  const openMapSearch = async (query: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    try {
      await Linking.openURL(url);
    } catch {
      setMessage("Nao foi possivel abrir o mapa.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.kicker}>SOS</Text>
        <Text style={styles.title}>Acoes de emergencia</Text>
        <Text style={styles.subtitle}>
          Nesta base minima, mantemos apenas ligacao para apoio e busca externa. O restante volta depois.
        </Text>

        <Pressable accessibilityRole="button" onPress={() => void Linking.openURL("tel:188")} style={styles.button}>
          <Text style={styles.buttonText}>Ligar 188</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/login")} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Voltar ao login</Text>
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <SupportMap onOpenSearch={openMapSearch} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: COLORS.background,
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 32
  },
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
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
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    minHeight: 54,
    justifyContent: "center"
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.cardStrong,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 54,
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800"
  },
  message: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19
  }
});
