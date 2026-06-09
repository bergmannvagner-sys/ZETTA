import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View, useWindowDimensions } from "react-native";

import { Button, Card } from "@/components/ui";
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
  const { width } = useWindowDimensions();
  const wideSupportMap = width >= 700;
  const [region, setRegion] = useState<MapRegion>(FALLBACK_REGION);
  const [hasLocation, setHasLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

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

  return (
    <Card>
      <Text className="text-xs font-semibold text-primary">{t("supportMap.title")}</Text>
      <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("supportMap.externalBody")}</Text>

      <View className="rounded-3xl border border-primary/25 bg-surfaceSoft dark:bg-[#261D42]/70 p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-3 w-3 rounded-full bg-primary" />
          <Text className="flex-1 text-sm font-semibold text-ink dark:text-white">
            {hasLocation ? t("supportMap.locationActive") : t("supportMap.locationInactive")}
          </Text>
          {isLoadingLocation ? <ActivityIndicator color="#8B5CF6" size="small" /> : null}
        </View>
        {locationMessage ? (
          <Text selectable className="mt-3 text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            {locationMessage}
          </Text>
        ) : null}
      </View>

      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{t("supportMap.externalTruth")}</Text>

      <Button label="supportMap.refreshLocation" tone="soft" loading={isLoadingLocation} onPress={loadLocation} />

      <View style={{ flexDirection: wideSupportMap ? "row" : "column", flexWrap: "wrap", gap: 12 }}>
        {SUPPORT_TARGETS.map((target) => (
          <View key={target.id} style={{ flexBasis: wideSupportMap ? "48%" : "100%", flexGrow: 1 }}>
            <Button
              label={target.labelKey}
              tone="soft"
              onPress={() => onOpenSearch(target.query, searchContext)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}
