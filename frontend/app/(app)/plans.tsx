import { router } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card } from "@/components/ui";
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
    return "O usuário comum usa a ZETTA gratuitamente. A IA Bergmann acompanha o cuidado emocional. Psicólogos, empresas e contas institucionais entram em planos pagos após validação.";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Seu cadastro está em validação. A aprovação libera o fluxo comercial somente com contrato ativo, sem checkout público no app.";
  }
  if (user.subscription_status === "TRIAL") {
    return "Este status legado não libera acesso comercial. Regularize com assinatura ativa.";
  }
  if (user.subscription_status === "ACTIVE") {
    return "Seu plano está ativo. O acesso continua limitado por permissão, status, consentimento do usuário e contrato comercial externo.";
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
          subtitle="Presença emocional para usuários, com a IA Bergmann, e acesso validado para profissionais e instituições na ZETTA."
          orbState="calm"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 16 }}>
          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Hub de acesso" tone="info" />
              <Badge label="Sem checkout público" tone="warning" />
              <Badge label="Contratação externa" tone="soft" />
            </View>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              Esta tela resume status comercial e permissões. Não há compra local aqui; a ativação depende de contrato,
              validação administrativa e backend.
            </Text>
          </Card>

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
              <Text className="text-base font-semibold text-ink dark:text-white">Cobrança comercial e teleatendimento</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Usuários comuns seguem gratuitos. Perfis pagos são contratados fora do app, depois de validação
                administrativa, e não usam checkout público dentro da aplicação.
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                No teleatendimento, a plataforma retém comissão por sessão concluída e repassa o restante ao
                psicólogo ou à clínica autorizada, sempre dentro do contrato comercial definido.
              </Text>
            </Card>
          ) : null}

          <View className="gap-3">
            {paidAccess && user?.role === "PSYCHOLOGIST" ? (
              <Button
                label="Usuários autorizados"
                icon="people-outline"
                onPress={() => router.push("/(app)/professional-users" as never)}
              />
            ) : null}
            {paidAccess && user?.role === "COMPANY" ? (
              <Button label="Painel NR-1" icon="shield-checkmark-outline" onPress={() => router.push("/(app)/nr1" as never)} />
            ) : null}
            {paidAccess && user?.role && INSTITUTION_ROLES.has(user.role) ? (
              <Button
                label="Painel institucional"
                icon="business-outline"
                onPress={() => router.push("/(app)/institution-dashboard" as never)}
              />
            ) : null}
            <Button label="Ver perfil" icon="person-outline" tone="soft" onPress={() => router.push("/(app)/profile" as never)} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
