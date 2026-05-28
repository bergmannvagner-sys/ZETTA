import { AuthUser, SubscriptionPlan, SubscriptionStatus, UserRole } from "@/types/auth";

export const paidRoles = new Set<UserRole>([
  "PSYCHOLOGIST",
  "COMPANY",
  "NGO",
  "HOSPITAL",
  "CLINIC",
  "SPONSOR",
  "PUBLIC_INSTITUTION"
]);

const planLabels: Record<SubscriptionPlan, string> = {
  FREE_USER: "Gratuito usuario",
  PSYCHOLOGIST_PRO: "Psicologo Pro",
  COMPANY_NR1: "Empresa NR-1",
  CLINIC: "Clinica",
  INSTITUTIONAL: "Institucional",
  SPONSOR: "Patrocinador",
  INTERNAL: "Interno"
};

const statusLabels: Record<SubscriptionStatus, string> = {
  FREE: "Gratuito",
  PENDING: "Aguardando aprovacao",
  TRIAL: "Teste liberado",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelado"
};

export function planLabel(plan?: SubscriptionPlan): string {
  return plan ? planLabels[plan] : "Nao definido";
}

export function subscriptionStatusLabel(status?: SubscriptionStatus): string {
  return status ? statusLabels[status] : "Nao definido";
}

export function hasPaidAccess(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (!paidRoles.has(user.role)) return true;
  return user.subscription_status === "TRIAL" || user.subscription_status === "ACTIVE";
}
