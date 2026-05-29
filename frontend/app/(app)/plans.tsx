import { router } from "expo-router";
import { Text, View } from "react-native";

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

function accessTitle(user?: AuthUser | null): string {
  if (!user) return "Acesso nao encontrado";
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Acesso indisponivel";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Pagamento pendente";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Conta em analise";
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
    return "O usuario comum usa o Bergmann gratuitamente. Psicologos, empresas e contas institucionais entram em planos pagos apos validacao.";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Seu cadastro esta em validacao. A aprovacao libera o fluxo comercial somente com assinatura real, sem simular pagamento falso.";
  }
  if (user.subscription_status === "TRIAL") {
    return "Este status legado nao libera acesso comercial. Regularize com assinatura ativa.";
  }
  if (user.subscription_status === "ACTIVE") {
    return "Seu plano esta ativo. O acesso continua limitado por permissao, status e consentimento do usuario.";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "O acesso pago esta suspenso ate regularizacao.";
  }
  return "Este acesso nao esta liberado. Procure a administracao da plataforma para revisar a conta.";
}

export default function Plans() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const paidRole = isPaidRole(user?.role);
  const features = roleIncludedFeatures(user?.role);

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ACESSO</Text>
        <Text className="text-3xl font-semibold text-white">Plano e acesso</Text>
        <Text className="text-base leading-6 text-muted">
          Presenca emocional para usuarios e acesso validado para profissionais e instituicoes.
        </Text>
      </View>

      <Card>
        <Text className="text-xl font-semibold text-white">{accessTitle(user)}</Text>
        <Text selectable className="text-sm text-muted">
          Perfil: {user?.role ?? "Nao autenticado"}
        </Text>
        <Text selectable className="text-sm text-muted">
          Plano: {planLabel(user?.subscription_plan)}
        </Text>
        <Text selectable className="text-sm text-muted">
          Assinatura: {subscriptionStatusLabel(user?.subscription_status)}
        </Text>
        <Text selectable className="text-sm text-muted">
          Conta: {user?.status ?? "Nao definido"}
        </Text>
      </Card>

      <Card>
        <Text className="text-base font-semibold text-white">Como funciona</Text>
        <Text className="text-base leading-6 text-muted">{accessMessage(user)}</Text>
        <Text className="text-sm leading-5 text-muted">{roleAccessDescription(user?.role)}</Text>
      </Card>

      <Card>
        <Text className="text-base font-semibold text-white">
          {paidRole ? "Recursos do perfil" : "Incluido no acesso gratuito"}
        </Text>
        <View className="gap-2">
          {features.map((feature) => (
            <Text key={feature} className="text-sm leading-5 text-muted">
              - {feature}
            </Text>
          ))}
        </View>
      </Card>

      {paidRole ? (
        <Card>
          <Text className="text-base font-semibold text-white">Privacidade e pagamento</Text>
          <Text className="text-sm leading-5 text-muted">
            Empresas e profissionais nao acessam conversas, diario ou dados emocionais sem autorizacao
            explicita. O modelo pago esta preparado no sistema, mas a integracao de pagamento real ainda
            nao foi ligada neste bloco local.
          </Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {paidAccess && user?.role === "PSYCHOLOGIST" ? (
          <Button
            label="Usuarios autorizados"
            onPress={() => router.push("/(app)/professional-users" as never)}
          />
        ) : null}
        {paidAccess && user?.role === "COMPANY" ? (
          <Button label="Painel NR-1" onPress={() => router.push("/(app)/nr1" as never)} />
        ) : null}
        <Button label="Ver perfil" tone="soft" onPress={() => router.push("/(app)/profile" as never)} />
      </View>
    </Screen>
  );
}
