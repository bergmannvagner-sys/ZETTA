import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { registerSOSEvent, SOS_OFFLINE_MESSAGE } from "@/lib/sos";

export default function SOS() {
  const [confirmed, setConfirmed] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: registerSOSEvent,
    onSuccess: (data) => {
      setRegistered(true);
      setMessage(data.safety_message);
    },
    onError: () => setMessage(SOS_OFFLINE_MESSAGE)
  });

  return (
    <Screen>
      <AnimatedOrb state="crisis" size={220} reducedMotion={mutation.isPending} />
      <Text className="text-3xl font-semibold text-white">SOS emocional</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          Se voce corre perigo agora, acione a emergencia local. No Brasil, o CVV atende pelo 188.
        </Text>
      </Card>
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
