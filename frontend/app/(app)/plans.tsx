import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import {
  hasPaidAccess,
  isPaidRole,
  planLabel,
  roleAccessDescription,
  roleIncludedFeatures,
  subscriptionStatusLabel
} from "@/lib/billing";
import { AuthUser } from "@/types/auth";
import { useAuthStore } from "@/store/auth-store";

const INSTITUTION_ROLES = new Set(["CLINIC", "HOSPITAL", "NGO", "PUBLIC_INSTITUTION"]);

function accessTitle(user?: AuthUser | null): string {
  if (!user) return "Acesso não encontrado";
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Acesso indisponível";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Pagamento pendente";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Conta em análise";
  }
  if (user.subscription_status === "TRIAL") {
    return "Assinatura pendente";
  }
  if (user.subscription_status === "ACTIVE") {
    return "Plano ativo";
  }
  return "Acesso gratuito";
}

function accessMessage(user?: AuthUser | null): string {
  if (!user) return "Entre novamente para carregar seu plano.";
  if (!isPaidRole(user.role)) {
    return "O usuário comum usa o Bergmann gratuitamente. Psicólogos, empresas e contas institucionais entram em planos pagos após validação.";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Seu cadastro está em validação. A aprovação libera o fluxo comercial somente com assinatura real, sem simular pagamento falso.";
  }
  if (user.subscription_status === "TRIAL") {
    return "Este status legado não libera acesso comercial. Regularize com assinatura ativa.";
  }
  if (user.subscription_status === "ACTIVE") {
    return "Seu plano está ativo. O acesso continua limitado por permissão, status e consentimento do usuário.";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "O acesso pago está suspenso até regularização.";
  }
  return "Este acesso não está liberado. Procure a administração da plataforma para revisar a conta.";
}

export default function Plans() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const paidRole = isPaidRole(user?.role);
  const features = roleIncludedFeatures(user?.role);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Acesso"
          title="Plano e acesso"
          subtitle="Presença emocional para usuários e acesso validado para profissionais e instituições."
          orbState="calm"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 16 }}>
          <Card>
            <Text className="text-xl font-semibold text-ink dark:text-white">{accessTitle(user)}</Text>
            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
              Perfil: {user?.role ?? "Não autenticado"}
            </Text>
            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
              Plano: {planLabel(user?.subscription_plan)}
            </Text>
            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
              Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
            </Text>
            <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
              Conta: {user?.status ?? "Não definido"}
            </Text>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">Como funciona</Text>
            <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{accessMessage(user)}</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{roleAccessDescription(user?.role)}</Text>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">
              {paidRole ? "Recursos do perfil" : "Incluído no acesso gratuito"}
            </Text>
            <View className="gap-2">
              {features.map((feature) => (
                <Text key={feature} className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  - {feature}
                </Text>
              ))}
            </View>
          </Card>

          {paidRole ? (
            <Card>
              <Text className="text-base font-semibold text-ink dark:text-white">Privacidade e pagamento</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Empresas e profissionais não acessam conversas, diário ou dados emocionais sem autorização
                explícita. O modelo pago está preparado no sistema, mas a integração de pagamento real ainda
                não foi ligada neste bloco local.
              </Text>
            </Card>
          ) : null}

          <View className="gap-3">
            {paidAccess && user?.role === "PSYCHOLOGIST" ? (
              <Button
                label="Usuários autorizados"
                onPress={() => router.push("/(app)/professional-users" as never)}
              />
            ) : null}
            {paidAccess && user?.role === "COMPANY" ? (
              <Button label="Painel NR-1" onPress={() => router.push("/(app)/nr1" as never)} />
            ) : null}
            {paidAccess && user?.role && INSTITUTION_ROLES.has(user.role) ? (
              <Button
                label="Painel institucional"
                onPress={() => router.push("/(app)/institution-dashboard" as never)}
              />
            ) : null}
            <Button label="Ver perfil" tone="soft" onPress={() => router.push("/(app)/profile" as never)} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
