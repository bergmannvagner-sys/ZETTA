import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";

import { Badge, Button, Card } from "@/components/ui";
import { radii, useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

type SupportMapProps = {
  onOpenSearch: (query: string, context?: SupportSearchContext) => void;
};

type SupportSearchContext = {
  hasLocation: boolean;
  latitude: number;
  longitude: number;
};

type SupportTarget = {
  id: string;
  labelKey: string;
  query: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type MapRegion = {
  latitude: number;
  longitude: number;
};

const SUPPORT_TARGETS: SupportTarget[] = [
  {
    id: "clinics",
    labelKey: "supportMap.searchClinics",
    query: "clínica psicológica perto de mim",
    icon: "medical-outline"
  },
  {
    id: "psychologists",
    labelKey: "supportMap.searchPsychologists",
    query: "psicólogo perto de mim",
    icon: "person-outline"
  },
  {
    id: "ubs",
    labelKey: "supportMap.searchUbs",
    query: "UBS unidade básica de saúde perto de mim",
    icon: "home-outline"
  },
  {
    id: "caps",
    labelKey: "supportMap.searchCaps",
    query: "CAPS centro de atenção psicossocial perto de mim",
    icon: "shield-checkmark-outline"
  }
];

const FALLBACK_REGION: MapRegion = {
  latitude: -15.793889,
  longitude: -47.882778
};

const LOCATION_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function buildEmbeddedMapUrl(region: MapRegion, hasLocation: boolean) {
  const delta = hasLocation ? 0.03 : 0.08;
  const minLat = (region.latitude - delta).toFixed(6);
  const maxLat = (region.latitude + delta).toFixed(6);
  const minLon = (region.longitude - delta).toFixed(6);
  const maxLon = (region.longitude + delta).toFixed(6);
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${region.latitude.toFixed(6)},${region.longitude.toFixed(6)}`;
}

export function SupportMap({ onOpenSearch }: SupportMapProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const wideSupportMap = width >= 700;
  const [region, setRegion] = useState<MapRegion>(FALLBACK_REGION);
  const [hasLocation, setHasLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string>("psychologists");

  const loadLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationMessage(null);

    let foundLocation = false;
    try {
      let servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled && Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
          servicesEnabled = await Location.hasServicesEnabledAsync();
        } catch {
          servicesEnabled = false;
        }
      }

      if (!servicesEnabled) {
        setHasLocation(false);
        setLocationMessage(t("supportMap.servicesDisabled"));
        return;
      }

      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission =
        currentPermission.status === "granted"
          ? currentPermission
          : await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setHasLocation(false);
        setLocationMessage(t("supportMap.denied"));
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 2500
      });
      if (lastKnown) {
        foundLocation = true;
        setHasLocation(true);
        setRegion({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude
        });
      }

      try {
        const current = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          LOCATION_TIMEOUT_MS
        );
        foundLocation = true;
        setHasLocation(true);
        setRegion({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude
        });
        setLocationMessage(t("supportMap.locationReady"));
      } catch {
        if (foundLocation) {
          setLocationMessage(t("supportMap.usingLastKnown"));
        } else {
          setHasLocation(false);
          setLocationMessage(t("supportMap.error"));
        }
      }
    } catch {
      if (!foundLocation) {
        setHasLocation(false);
        setLocationMessage(t("supportMap.error"));
      }
    } finally {
      setIsLoadingLocation(false);
    }
  }, [t]);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  const searchContext = useMemo(
    () => ({
      hasLocation,
      latitude: region.latitude,
      longitude: region.longitude
    }),
    [hasLocation, region.latitude, region.longitude]
  );
  const activeTarget = SUPPORT_TARGETS.find((target) => target.id === activeTargetId) ?? SUPPORT_TARGETS[0];
  const mapUrl = useMemo(() => buildEmbeddedMapUrl(region, hasLocation), [hasLocation, region.latitude, region.longitude]);
  const targetWidth = width < 560 ? "100%" : "48%";

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 4, lineHeight: 16 }}>
          {t("supportMap.title")}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23 }}>
          {t("supportMap.externalBody")}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Badge label="Busca externa" tone="info" />
        <Badge label="Sem diretório próprio" tone="warning" />
        <Badge label="Apoio local" tone="soft" />
      </View>

      <View
        style={{
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radii.lg,
          borderWidth: 1,
          overflow: "hidden"
        }}
      >
        <View style={{ backgroundColor: colors.surfaceStrong, gap: 10, padding: 14 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
            <View style={{ backgroundColor: colors.primary, borderRadius: 999, height: 10, width: 10 }} />
            <Text style={{ color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>
              {hasLocation ? t("supportMap.locationActive") : t("supportMap.locationInactive")}
            </Text>
            {isLoadingLocation ? <ActivityIndicator color={colors.primaryDark} size="small" /> : null}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {activeTarget ? t(activeTarget.labelKey) : t("supportMap.title")}
          </Text>
        </View>

        <View style={{ backgroundColor: colors.background, height: wideSupportMap ? 320 : 280 }}>
          {Platform.OS === "web" ? (
            <iframe
              key={mapUrl}
              src={mapUrl}
              title={t("supportMap.title")}
              referrerPolicy="no-referrer"
              loading="eager"
              allowFullScreen
              style={{
                backgroundColor: colors.background,
                border: 0,
                display: "block",
                height: "100%",
                width: "100%"
              }}
            />
          ) : (
            <WebView
              key={mapUrl}
              originWhitelist={["*"]}
              source={{ uri: mapUrl }}
              startInLoadingState
              style={{ backgroundColor: colors.background, flex: 1 }}
            />
          )}
        </View>
      </View>

      {locationMessage ? (
        <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
          {locationMessage}
        </Text>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button
          label="supportMap.refreshLocation"
          icon="refresh-outline"
          compact
          tone="soft"
          loading={isLoadingLocation}
          onPress={loadLocation}
        />
        <Button
          label="supportMap.openExternal"
          icon="map-outline"
          compact
          tone="soft"
          onPress={() => onOpenSearch(activeTarget?.query ?? SUPPORT_TARGETS[0].query, searchContext)}
        />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
        {t("supportMap.externalTruth")}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {SUPPORT_TARGETS.map((target) => (
          <View
            key={target.id}
            style={{
              flexGrow: 0,
              flexShrink: 0,
              width: targetWidth
            }}
          >
            <Button
              label={target.labelKey}
              icon={target.icon}
              compact
              tone={activeTargetId === target.id ? "primary" : "soft"}
              onPress={() => setActiveTargetId(target.id)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
