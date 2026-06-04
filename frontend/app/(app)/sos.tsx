import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { SupportMap } from "@/components/support-map";
import { Button, Card, ErrorText } from "@/components/ui";
import { registerSOSEvent, SOS_OFFLINE_MESSAGE } from "@/lib/sos";

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function SOS() {
  const { width } = useWindowDimensions();
  const [confirmed, setConfirmed] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const orbSize = Math.min(232, Math.max(188, width * 0.5));
  const mutation = useMutation({
    mutationFn: registerSOSEvent,
    onSuccess: (data) => {
      setRegistered(true);
      setMessage(data.safety_message);
    },
    onError: () => setMessage(SOS_OFFLINE_MESSAGE)
  });

  async function openMapSearch(query: string) {
    const url = mapsSearchUrl(query);
    setMapError(null);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setMapError("Nao foi possivel abrir o mapa neste aparelho.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      setMapError("Nao foi possivel abrir o mapa agora.");
    }
  }

  return (
    <Screen>
      <AnimatedOrb state="crisis" size={orbSize} reducedMotion={mutation.isPending} />
      <Text className="text-3xl font-semibold text-white">SOS emocional</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          Se voce corre perigo agora, acione a emergencia local. No Brasil, o CVV atende pelo 188.
        </Text>
      </Card>
      <SupportMap onOpenSearch={openMapSearch} />
      <ErrorText message={mapError ?? undefined} />
      {!confirmed ? (
        <Button label="Confirmar SOS" tone="danger" onPress={() => setConfirmed(true)} />
      ) : (
        <View className="gap-3">
          <Button
            label={registered ? "Evento SOS registrado" : "Registrar evento SOS"}
            tone="danger"
            loading={mutation.isPending}
            disabled={registered}
            onPress={() => mutation.mutate()}
          />
          <Button
            label={registered ? "Voltar" : "Cancelar"}
            tone="soft"
            onPress={() => {
              setConfirmed(false);
              setRegistered(false);
              setMessage(null);
            }}
          />
        </View>
      )}
      <ErrorText message={mutation.error?.message} />
      {message ? (
        <Card>
          <Text selectable className="text-base leading-6 text-white">{message}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
