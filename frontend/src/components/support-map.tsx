import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { MapStyleElement, Region } from "react-native-maps";

import { Button, Card } from "@/components/ui";

type SupportMapProps = {
  onOpenSearch: (query: string) => void;
};

type SupportTarget = {
  label: string;
  query: string;
};

const SUPPORT_TARGETS: SupportTarget[] = [
  {
    label: "Clinicas",
    query: "clinica psicologica perto de mim"
  },
  {
    label: "Psicologos",
    query: "psicologo perto de mim"
  },
  {
    label: "UBS",
    query: "UBS unidade basica de saude perto de mim"
  },
  {
    label: "CAPS",
    query: "CAPS centro de atencao psicossocial perto de mim"
  }
];

const FALLBACK_REGION: Region = {
  latitude: -15.793889,
  latitudeDelta: 0.18,
  longitude: -47.882778,
  longitudeDelta: 0.18
};

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#101832" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B8BED6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0F1F" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#B89BFF" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1D2A52" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#D9C7FF" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1A2546" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#061026" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#00E5FF" }] }
];

export function SupportMap({ onOpenSearch }: SupportMapProps) {
  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      setIsLoadingLocation(true);
      setLocationMessage(null);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (permission.status !== "granted") {
          setHasLocation(false);
          setLocationMessage(
            "Permissao de localizacao negada. O mapa mostra uma regiao padrao e as buscas continuam disponiveis."
          );
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        if (!mounted) return;

        setHasLocation(true);
        setRegion({
          latitude: current.coords.latitude,
          latitudeDelta: 0.035,
          longitude: current.coords.longitude,
          longitudeDelta: 0.035
        });
      } catch {
        if (!mounted) return;
        setHasLocation(false);
        setLocationMessage("Nao foi possivel obter sua localizacao agora. Use os botoes de busca para abrir o mapa.");
      } finally {
        if (mounted) {
          setIsLoadingLocation(false);
        }
      }
    }

    void loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <Text className="text-xs font-semibold tracking-[4px] text-mint">MAPA DE APOIO</Text>
      <Text className="text-base leading-6 text-muted">
        Veja sua regiao e use as categorias para buscar atendimento por perto. Em risco imediato, ligue para a
        emergencia local primeiro.
      </Text>
      <View className="overflow-hidden rounded-2xl border border-mint/20 bg-ink" style={{ height: 280 }}>
        <MapView
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={FALLBACK_REGION}
          loadingBackgroundColor="#0A0F1F"
          loadingEnabled
          loadingIndicatorColor="#00E5FF"
          onRegionChangeComplete={setRegion}
          region={region}
          showsMyLocationButton
          showsUserLocation={hasLocation}
          style={{ height: "100%", width: "100%" }}
        />
        {isLoadingLocation ? (
          <View className="absolute inset-0 items-center justify-center bg-ink/70">
            <ActivityIndicator color="#00E5FF" />
            <Text className="mt-3 text-sm text-muted">Buscando sua localizacao...</Text>
          </View>
        ) : null}
        <View className="absolute left-4 top-4 rounded-full border border-mint/25 bg-ink/85 px-4 py-2">
          <Text className="text-xs font-semibold text-mint">{hasLocation ? "Sua regiao" : "Regiao padrao"}</Text>
        </View>
      </View>
      {locationMessage ? (
        <Text selectable className="text-sm leading-5 text-lilac">
          {locationMessage}
        </Text>
      ) : null}
      <Text className="text-sm leading-5 text-muted">
        As buscas abrem resultados reais no mapa do aparelho. O Bergmann nao inventa locais de atendimento.
      </Text>
      <View className="gap-3">
        {SUPPORT_TARGETS.map((target) => (
          <Button
            key={target.query}
            label={`Buscar ${target.label}`}
            tone="soft"
            onPress={() => onOpenSearch(target.query)}
          />
        ))}
      </View>
    </Card>
  );
}
