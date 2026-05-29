import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { CommercialPlan } from "@/types/auth";

function Flag({ active, label }: { active: boolean; label: string }) {
  const style = active ? "border-rose/30 bg-rose/10" : "border-mint/20 bg-mint/10";
  return (
    <View className={`rounded-full border px-3 py-2 ${style}`}>
      <Text className={`text-xs font-semibold ${active ? "text-rose" : "text-mint"}`}>{label}</Text>
    </View>
  );
}

export default function AdminCommercialPlans() {
  const user = useAuthStore((state) => state.user);
  const plans = useQuery({
    queryKey: ["admin-commercial-plans"],
    queryFn: () => apiRequest<CommercialPlan[]>("/admin/commercial-plans"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Planos comerciais</Text>
        <Text className="text-base leading-6 text-muted">
          Catalogo interno por perfil. Precos sao administrativos e nao aparecem como checkout publico.
        </Text>
      </View>

      <ErrorText message={plans.error?.message} />
      {plans.isLoading ? <Text className="text-muted">Carregando planos...</Text> : null}

      <Card>
        <Text className="text-base font-semibold text-white">Regra do MVP</Text>
        <Text className="text-sm leading-5 text-muted">
          Usuario comum permanece gratuito. Perfis comerciais dependem de validacao, assinatura ativa e
          consentimento para qualquer dado sensivel. Esta tela nao vende e nao simula pagamento.
        </Text>
      </Card>

      <View className="gap-3">
        {(plans.data ?? []).map((plan: CommercialPlan) => (
          <Card key={plan.role}>
            <View className="gap-1">
              <Text className="text-lg font-semibold text-white">{plan.title}</Text>
              <Text selectable className="text-sm text-muted">
                Perfil: {plan.role} | Plano: {planLabel(plan.plan)}
              </Text>
              <Text className="text-sm leading-5 text-muted">{plan.description}</Text>
            </View>

            <View className="gap-1 rounded-2xl border border-white/10 bg-ink/40 p-3">
              <Text className="text-sm font-semibold text-white">Preco interno</Text>
              <Text selectable className="text-sm text-muted">{plan.admin_price_placeholder}</Text>
              <Text selectable className="text-sm text-muted">R$ {plan.price_brl.toFixed(2).replace(".", ",")}</Text>
              <Text selectable className="text-xs text-muted">{plan.billing_interval_placeholder}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Flag
                active={plan.checkout_public_enabled}
                label={plan.checkout_public_enabled ? "Checkout publico" : "Sem checkout publico"}
              />
              <Flag
                active={!plan.admin_only_pricing}
                label={plan.admin_only_pricing ? "Preco so admin" : "Preco publico"}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-white">Recursos inclusos</Text>
              {plan.included_features.map((feature: string) => (
                <Text key={feature} className="text-sm leading-5 text-muted">
                  - {feature}
                </Text>
              ))}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
