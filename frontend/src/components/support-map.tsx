import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type SupportMapProps = {
  onOpenSearch: (query: string) => void;
};

type SupportTarget = {
  id: string;
  label: string;
  query: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SUPPORT_TARGETS: SupportTarget[] = [
  { id: "clinics", label: "Clinicas psicologicas", query: "clinica psicologica perto de mim", icon: "medical-outline" },
  { id: "psychologists", label: "Psicologos proximos", query: "psicologo perto de mim", icon: "person-outline" },
  { id: "ubs", label: "UBS proximas", query: "UBS unidade basica de saude perto de mim", icon: "home-outline" },
  { id: "caps", label: "CAPS proximos", query: "CAPS centro de atencao psicossocial perto de mim", icon: "shield-checkmark-outline" }
];

export function SupportMap({ onOpenSearch }: SupportMapProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>SUPPORT</Text>
      <Text style={styles.title}>Busca externa</Text>
      <Text style={styles.body}>
        A localizacao foi removida desta base minima. Use os atalhos abaixo para procurar ajuda por conta da rede local.
      </Text>

      <View style={styles.list}>
        {SUPPORT_TARGETS.map((target) => (
          <Pressable key={target.id} accessibilityRole="button" onPress={() => onOpenSearch(target.query)} style={styles.button}>
            <Ionicons color="#F5F7FF" name={target.icon} size={18} />
            <Text style={styles.buttonText}>{target.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#171B2E",
    borderColor: "#2A3558",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 20
  },
  kicker: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 4
  },
  title: {
    color: "#F5F7FF",
    fontSize: 22,
    fontWeight: "900"
  },
  body: {
    color: "#A7B0C6",
    fontSize: 15,
    lineHeight: 22
  },
  list: {
    gap: 10
  },
  button: {
    alignItems: "center",
    backgroundColor: "#1D2340",
    borderColor: "#2A3558",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  buttonText: {
    color: "#F5F7FF",
    fontSize: 14,
    fontWeight: "800"
  }
});
