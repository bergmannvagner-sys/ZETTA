import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";

import { Button, Card } from "@/components/ui";
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
};

type MapRegion = {
  latitude: number;
  longitude: number;
};

const SUPPORT_TARGETS: SupportTarget[] = [
  {
    id: "clinics",
    labelKey: "supportMap.searchClinics",
    query: "clínica psicológica perto de mim"
  },
  {
    id: "psychologists",
    labelKey: "supportMap.searchPsychologists",
    query: "psicólogo perto de mim"
  },
  {
    id: "ubs",
    labelKey: "supportMap.searchUbs",
    query: "UBS unidade básica de saúde perto de mim"
  },
  {
    id: "caps",
    labelKey: "supportMap.searchCaps",
    query: "CAPS centro de atenção psicossocial perto de mim"
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
  const mapUrl = useMemo(() => {
    const query = activeTarget?.query ?? SUPPORT_TARGETS[0].query;
    const queryWithLocation = searchContext.hasLocation
      ? `${query.replace(/ perto de mim$/iu, "")} ${searchContext.latitude.toFixed(6)},${searchContext.longitude.toFixed(6)}`
      : query;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryWithLocation)}`;
  }, [activeTarget?.query, searchContext.hasLocation, searchContext.latitude, searchContext.longitude]);

  return (
    <Card>
      <Text className="text-xs font-semibold text-primary">{t("supportMap.title")}</Text>
      <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("supportMap.externalBody")}</Text>

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
        <View style={{ backgroundColor: colors.background, height: wideSupportMap ? 300 : 260 }}>
          {Platform.OS === "web" ? (
            <iframe
              key={mapUrl}
              src={mapUrl}
              title={t("supportMap.title")}
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              allowFullScreen
              style={{
                border: 0,
                backgroundColor: colors.background,
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
        <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          {locationMessage}
        </Text>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button label="supportMap.refreshLocation" tone="soft" loading={isLoadingLocation} onPress={loadLocation} />
        <Button
          label="Abrir no mapa externo"
          tone="soft"
          onPress={() => onOpenSearch(activeTarget?.query ?? SUPPORT_TARGETS[0].query, searchContext)}
        />
      </View>
      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{t("supportMap.externalTruth")}</Text>

      <View style={{ flexDirection: wideSupportMap ? "row" : "column", flexWrap: wideSupportMap ? "wrap" : "nowrap", gap: 12 }}>
        {SUPPORT_TARGETS.map((target) => (
          <View
            key={target.id}
            style={{
              flexGrow: 0,
              flexShrink: 0,
              width: wideSupportMap ? "48%" : "100%"
            }}
          >
            <Button
              label={target.labelKey}
              tone={activeTargetId === target.id ? "primary" : "soft"}
              onPress={() => setActiveTargetId(target.id)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
