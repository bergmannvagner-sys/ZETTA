import { router } from "expo-router";
import { Text, View } from "react-native";

import {
  paidAccessActionLabel,
  paidAccessBlockMessage,
  paidAccessBlockTitle,
  planLabel,
  subscriptionStatusLabel
} from "@/lib/billing";
import { AuthUser } from "@/types/auth";

import { Button, Card } from "./ui";

type PaidAccessGateProps = {
  user?: AuthUser | null;
  resourceLabel: string;
};

export function PaidAccessGate({ user, resourceLabel }: PaidAccessGateProps) {
  return (
    <Card>
      <View className="gap-1">
        <Text className="text-sm font-semibold tracking-[3px] text-mint">ACESSO COMERCIAL</Text>
        <Text className="text-xl font-semibold text-white">{paidAccessBlockTitle(user)}</Text>
      </View>
      <Text className="text-sm leading-5 text-muted">{paidAccessBlockMessage(user)}</Text>
      <View className="gap-1 rounded-xl border border-white/10 bg-ink/35 p-3">
        <Text className="text-xs text-muted">Recurso</Text>
        <Text className="text-sm font-semibold text-white">{resourceLabel}</Text>
        <Text className="text-xs text-muted">Plano: {planLabel(user?.subscription_plan)}</Text>
        <Text className="text-xs text-muted">
          Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
        </Text>
      </View>
      <Button
        label={paidAccessActionLabel(user)}
        onPress={() => router.push("/(app)/plans" as never)}
      />
      <Button
        label="Ver perfil"
        tone="soft"
        onPress={() => router.push("/(app)/profile" as never)}
      />
    </Card>
  );
}
