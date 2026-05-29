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
  TRIAL: "Assinatura pendente",
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
  return user.subscription_status === "ACTIVE";
}

export function isPaidRole(role?: UserRole): boolean {
  return role ? paidRoles.has(role) : false;
}

export function paidAccessBlockTitle(user?: AuthUser | null): string {
  if (!user) return "Acesso nao carregado";
  if (!isPaidRole(user.role) || hasPaidAccess(user)) return "Acesso liberado";
  if (user.status === "ARCHIVED") {
    return "Conta arquivada";
  }
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Acesso comercial indisponivel";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Pagamento pendente";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Conta em analise";
  }
  return "Plano comercial necessario";
}

export function paidAccessBlockMessage(user?: AuthUser | null): string {
  if (!user) return "Entre novamente para carregar seu plano e status.";
  if (!isPaidRole(user.role)) {
    return "O usuario comum usa o Bergmann gratuitamente.";
  }
  if (hasPaidAccess(user)) {
    return "Seu acesso comercial esta liberado, sempre limitado por consentimento e permissao.";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Seu perfil precisa passar por validacao antes de liberar recursos comerciais. Isso protege usuarios, empresas e profissionais contra perfis falsos.";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Os recursos comerciais ficam pausados enquanto o pagamento estiver pendente. Os dados autorizados seguem protegidos.";
  }
  if (user.status === "ARCHIVED") {
    return "Esta conta foi arquivada administrativamente. O acesso fica bloqueado sem exclusao fisica dos registros de auditoria.";
  }
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Este perfil comercial nao esta liberado para acessar recursos pagos. Fale com a administracao para revisar a situacao.";
  }
  return "Este recurso exige perfil validado e assinatura ativa.";
}

export function paidAccessActionLabel(user?: AuthUser | null): string {
  if (!user) return "Ver acesso";
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") return "Acompanhar analise";
  if (user.subscription_status === "PAST_DUE") return "Ver pendencia";
  if (user.status === "ARCHIVED") return "Conta arquivada";
  if (user.subscription_status === "CANCELED" || user.status === "REJECTED") return "Revisar acesso";
  return "Ver plano";
}

export function roleAccessDescription(role?: UserRole): string {
  switch (role) {
    case "PSYCHOLOGIST":
      return "Acesso profissional para acompanhar usuarios que autorizaram compartilhamento emocional.";
    case "COMPANY":
      return "Acesso corporativo para indicadores agregados, NR-1 e saude emocional organizacional.";
    case "CLINIC":
      return "Acesso institucional para clinicas, com validacao antes de recursos clinicos.";
    case "HOSPITAL":
      return "Acesso institucional para operacao clinica, triagem e dados autorizados.";
    case "NGO":
      return "Acesso social para acolhimento e projetos com dados autorizados.";
    case "SPONSOR":
      return "Acesso de patrocinador para apoiar iniciativas sem acesso indevido a dados sensiveis.";
    case "PUBLIC_INSTITUTION":
      return "Acesso institucional para SUS, UBS, CAPS e governo com governanca de dados.";
    case "SUPER_ADMIN":
      return "Acesso interno de administracao da plataforma.";
    default:
      return "Acesso gratuito para cuidado emocional pessoal.";
  }
}

export function roleIncludedFeatures(role?: UserRole): string[] {
  switch (role) {
    case "PSYCHOLOGIST":
      return [
        "Pacientes autorizados por consentimento",
        "Resumos emocionais autorizados",
        "Evolucao emocional autorizada",
        "Alertas clinicos dentro do escopo do MVP"
      ];
    case "COMPANY":
      return [
        "Painel NR-1",
        "Indicadores agregados",
        "Tendencias organizacionais",
        "Alertas coletivos sem vigilancia individual"
      ];
    case "USER":
      return [
        "Orb central e presenca emocional",
        "Conversar com Bergmann",
        "Diario, humor, rotina leve e SOS",
        "Compartilhamento controlado pelo usuario"
      ];
    case "SUPER_ADMIN":
      return [
        "Analise de contas pendentes",
        "Aprovacao e rejeicao de perfis",
        "Administracao interna sem acesso emocional indevido"
      ];
    default:
      return [
        "Conta validada antes do acesso sensivel",
        "Vinculos e compartilhamento por consentimento",
        "Base institucional preparada para proximos blocos",
        "Sem acesso automatico a dados individuais"
      ];
  }
}
