import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { CommercialPlan, CommercialPlanUpdateRequest } from "@/types/auth";

function ToggleChip({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary/15" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"}`}
      onPress={onPress}
    >
      <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted dark:text-[#D1D5DB]"}`}>{label}</Text>
    </Pressable>
  );
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function formatPrice(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const compact = trimmed.replace(/\s+/g, "");
  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");
  const normalized =
    commaIndex > dotIndex ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function featuresToText(features: string[]): string {
  return features.join("\n");
}

function textToFeatures(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((feature) => feature.trim())
    .filter(Boolean);
}

function CommercialPlanEditor({ plan }: { plan: CommercialPlan }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description);
  const [adminPricePlaceholder, setAdminPricePlaceholder] = useState(plan.admin_price_placeholder);
  const [priceText, setPriceText] = useState(formatPrice(plan.price_brl));
  const [billingIntervalPlaceholder, setBillingIntervalPlaceholder] = useState(plan.billing_interval_placeholder);
  const [featuresText, setFeaturesText] = useState(featuresToText(plan.included_features));
  const [checkoutPublicEnabled, setCheckoutPublicEnabled] = useState(plan.checkout_public_enabled);
  const [adminOnlyPricing, setAdminOnlyPricing] = useState(plan.admin_only_pricing);

  useEffect(() => {
    setTitle(plan.title);
    setDescription(plan.description);
    setAdminPricePlaceholder(plan.admin_price_placeholder);
    setPriceText(formatPrice(plan.price_brl));
    setBillingIntervalPlaceholder(plan.billing_interval_placeholder);
    setFeaturesText(featuresToText(plan.included_features));
    setCheckoutPublicEnabled(plan.checkout_public_enabled);
    setAdminOnlyPricing(plan.admin_only_pricing);
  }, [plan]);

  const normalizedPrice = parsePrice(priceText);
  const priceInvalid = priceText.trim().length > 0 && normalizedPrice === null;
  const normalizedFeatures = textToFeatures(featuresText);
  const priceDirty =
    priceText.trim() === ""
      ? true
      : normalizedPrice !== null && Math.abs(normalizedPrice - plan.price_brl) > 0.00001;
  const dirty =
    normalizeText(title) !== normalizeText(plan.title) ||
    normalizeText(description) !== normalizeText(plan.description) ||
    normalizeText(adminPricePlaceholder) !== normalizeText(plan.admin_price_placeholder) ||
    priceDirty ||
    normalizeText(billingIntervalPlaceholder) !== normalizeText(plan.billing_interval_placeholder) ||
    normalizedFeatures.join("\n") !== plan.included_features.map(normalizeText).join("\n") ||
    checkoutPublicEnabled !== plan.checkout_public_enabled ||
    adminOnlyPricing !== plan.admin_only_pricing;

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CommercialPlanUpdateRequest = {};
      const titleValue = normalizeText(title);
      const descriptionValue = normalizeText(description);
      const priceValue = parsePrice(priceText);
      const adminPriceValue = normalizeText(adminPricePlaceholder);
      const billingIntervalValue = normalizeText(billingIntervalPlaceholder);
      const baselineFeatures = plan.included_features.map(normalizeText).join("\n");
      const currentFeatures = normalizedFeatures.join("\n");

      if (titleValue !== normalizeText(plan.title)) {
        payload.title = titleValue || null;
      }
      if (descriptionValue !== normalizeText(plan.description)) {
        payload.description = descriptionValue || null;
      }
      if (adminPriceValue !== normalizeText(plan.admin_price_placeholder)) {
        payload.admin_price_placeholder = adminPriceValue || null;
      }
      if (priceText.trim() === "") {
        payload.price_brl = null;
      } else if (priceValue !== null && Math.abs(priceValue - plan.price_brl) > 0.00001) {
        payload.price_brl = priceValue;
      }
      if (billingIntervalValue !== normalizeText(plan.billing_interval_placeholder)) {
        payload.billing_interval_placeholder = billingIntervalValue || null;
      }
      if (currentFeatures !== baselineFeatures) {
        payload.included_features = currentFeatures ? normalizedFeatures : null;
      }
      if (checkoutPublicEnabled !== plan.checkout_public_enabled) {
        payload.checkout_public_enabled = checkoutPublicEnabled;
      }
      if (adminOnlyPricing !== plan.admin_only_pricing) {
        payload.admin_only_pricing = adminOnlyPricing;
      }

      return apiRequest<CommercialPlan>(`/admin/commercial-plans/${plan.role}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-commercial-plans"] });
    }
  });

  return (
    <Card>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={planLabel(plan.plan)} tone="soft" />
        <Badge label={plan.is_overridden ? "Override ativo" : "Padrão do sistema"} tone={plan.is_overridden ? "warning" : "info"} />
        <Badge label={plan.checkout_public_enabled ? "Checkout público ativo" : "Checkout privado"} tone="soft" />
      </View>

      <View className="gap-1">
        <Text className="text-lg font-semibold text-ink dark:text-white">{plan.title}</Text>
        <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
          Perfil: {plan.role}
        </Text>
      </View>

      <Field label="Título público" value={title} onChangeText={setTitle} maxLength={120} />
      <Field
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
        textAlignVertical="top"
      />
      <Field label="Legenda de preço" value={adminPricePlaceholder} onChangeText={setAdminPricePlaceholder} maxLength={200} />
      <Field label="Preço em BRL" value={priceText} onChangeText={setPriceText} keyboardType="decimal-pad" maxLength={24} />
      <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Deixar o preço em branco restaura o valor padrão do plano. O checkout usa o valor persistido no backend.
      </Text>
      <Field
        label="Intervalo de cobrança"
        value={billingIntervalPlaceholder}
        onChangeText={setBillingIntervalPlaceholder}
        maxLength={200}
      />
      <Field
        label="Recursos incluídos"
        value={featuresText}
        onChangeText={setFeaturesText}
        multiline
        textAlignVertical="top"
        placeholder="Uma funcionalidade por linha"
      />

      <View className="flex-row flex-wrap gap-2">
        <ToggleChip
          active={checkoutPublicEnabled}
          label={checkoutPublicEnabled ? "Checkout público ativo" : "Checkout público desligado"}
          onPress={() => setCheckoutPublicEnabled((value) => !value)}
        />
        <ToggleChip
          active={adminOnlyPricing}
          label={adminOnlyPricing ? "Preço reservado ao admin" : "Preço visível"}
          onPress={() => setAdminOnlyPricing((value) => !value)}
        />
      </View>

      <ErrorText message={mutation.error?.message} />
      <Button label="Salvar plano" loading={mutation.isPending} disabled={!dirty || priceInvalid} onPress={() => mutation.mutate()} />
    </Card>
  );
}

export default function AdminCommercialPlans() {
  const user = useAuthStore((state) => state.user);
  const plans = useQuery<CommercialPlan[]>({
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
          subtitle="Edite títulos, preços, intervalos e recursos que alimentam cobrança e checkout reais."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Edição real" tone="info" />
              <Badge label="Persistência no backend" tone="warning" />
              <Badge label="Sem mock" tone="soft" />
            </View>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              As alterações abaixo impactam o catálogo comercial usado na geração de checkout e nas telas de administração.
              Deixe um campo em branco para restaurar o padrão do sistema para aquele atributo.
            </Text>
          </Card>

          <ErrorText message={plans.error?.message} />
          {plans.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando planos...</Text> : null}

          <View className="gap-3">
            {(plans.data ?? []).map((plan: CommercialPlan) => (
              <CommercialPlanEditor key={plan.role} plan={plan} />
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
