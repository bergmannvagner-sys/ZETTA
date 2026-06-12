import { router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Badge, Button, Card } from "@/components/ui";

type PaymentResultProps = {
  kicker: string;
  title: string;
  body: string;
  detail: string;
  primaryLabel: string;
};

export function PaymentResult({ kicker, title, body, detail, primaryLabel }: PaymentResultProps) {
  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold text-primary">{kicker}</Text>
        <Text className="text-3xl font-semibold text-ink dark:text-white">{title}</Text>
        <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{body}</Text>
      </View>

      <Card>
        <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{detail}</Text>
      </Card>

      <Card>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Retorno do webhook" tone="info" />
          <Badge label="Sem ação financeira local" tone="warning" />
        </View>
        <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
          A ativação real continua no backend, depois da confirmação do gateway e da revisão administrativa.
        </Text>
      </Card>

      <View className="gap-3">
        <Button label={primaryLabel} icon="card-outline" onPress={() => router.replace("/(app)/plans" as never)} />
        <Button label="Voltar ao início" icon="home-outline" tone="soft" onPress={() => router.replace("/" as never)} />
      </View>
    </Screen>
  );
}
