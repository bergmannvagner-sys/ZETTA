import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { CommercialPlan } from "@/types/auth";

function Flag({ active, label }: { active: boolean; label: string }) {
  const style = active ? "border-rose/30 bg-rose/10" : "border-primary/20 bg-primary/10";
  return (
    <View className={`rounded-full border px-3 py-2 ${style}`}>
      <Text className={`text-xs font-semibold ${active ? "text-rose" : "text-primary"}`}>{label}</Text>
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
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Planos comerciais"
          subtitle="Catálogo interno por perfil. Preços são administrativos e não aparecem como checkout público."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <ErrorText message={plans.error?.message} />
          {plans.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando planos...</Text> : null}

          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">Regra do MVP</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
              Usuário comum permanece gratuito. Perfis comerciais dependem de validação, assinatura ativa e
              consentimento para qualquer dado sensível. Esta tela não vende e não simula pagamento.
            </Text>
          </Card>

          <View className="gap-3">
            {(plans.data ?? []).map((plan: CommercialPlan) => (
              <Card key={plan.role}>
                <View className="gap-1">
                  <Text className="text-lg font-semibold text-ink dark:text-white">{plan.title}</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    Perfil: {plan.role} | Plano: {planLabel(plan.plan)}
                  </Text>
                  <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{plan.description}</Text>
                </View>

                <View className="gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/40 p-3">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Preço interno</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{plan.admin_price_placeholder}</Text>
                  <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                    R$ {plan.price_brl.toFixed(2).replace(".", ",")}
                  </Text>
                  <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">{plan.billing_interval_placeholder}</Text>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Flag
                    active={plan.checkout_public_enabled}
                    label={plan.checkout_public_enabled ? "Checkout público" : "Sem checkout público"}
                  />
                  <Flag
                    active={!plan.admin_only_pricing}
          label={plan.admin_only_pricing ? "Preço reservado ao admin" : "Preço público"}
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Recursos inclusos</Text>
                  {plan.included_features.map((feature: string) => (
                    <Text key={feature} className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                      - {feature}
                    </Text>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
