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
        <Text className="text-sm font-semibold text-primary">Acesso comercial</Text>
        <Text className="text-xl font-semibold text-ink dark:text-white">{paidAccessBlockTitle(user)}</Text>
      </View>
      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{paidAccessBlockMessage(user)}</Text>
      <View className="gap-1 rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
        <Text className="text-xs text-muted dark:text-[#D1D5DB]">Recurso</Text>
        <Text className="text-sm font-semibold text-ink dark:text-white">{resourceLabel}</Text>
        <Text className="text-xs text-muted dark:text-[#D1D5DB]">Plano: {planLabel(user?.subscription_plan)}</Text>
        <Text className="text-xs text-muted dark:text-[#D1D5DB]">
          Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
        </Text>
      </View>
      <Button
        label={paidAccessActionLabel(user)}
        icon="card-outline"
        onPress={() => router.push("/(app)/plans" as never)}
      />
      <Button
        label="Ver perfil"
        icon="person-outline"
        tone="soft"
        onPress={() => router.push("/(app)/profile" as never)}
      />
    </Card>
  );
}
