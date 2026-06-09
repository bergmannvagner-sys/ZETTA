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
  FREE_USER: "Usuário gratuito",
  PSYCHOLOGIST_PRO: "Psicólogo Pro",
  COMPANY_NR1: "Empresa NR-1",
  CLINIC: "Clínica",
  INSTITUTIONAL: "Institucional",
  SPONSOR: "Patrocinador",
  INTERNAL: "Interno"
};

const statusLabels: Record<SubscriptionStatus, string> = {
  FREE: "Gratuito",
  PENDING: "Aguardando aprovação",
  TRIAL: "Assinatura pendente",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento pendente",
  CANCELED: "Cancelado"
};

export function planLabel(plan?: SubscriptionPlan): string {
  return plan ? planLabels[plan] : "Não definido";
}

export function subscriptionStatusLabel(status?: SubscriptionStatus): string {
  return status ? statusLabels[status] : "Não definido";
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
  if (!user) return "Acesso não carregado";
  if (!isPaidRole(user.role) || hasPaidAccess(user)) return "Acesso liberado";
  if (user.status === "ARCHIVED") {
    return "Conta arquivada";
  }
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Acesso comercial indisponível";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Pagamento pendente";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Conta em análise";
  }
  return "Plano comercial necessário";
}

export function paidAccessBlockMessage(user?: AuthUser | null): string {
  if (!user) return "Entre novamente para carregar seu plano e status.";
  if (!isPaidRole(user.role)) {
    return "O usuário comum usa o Bergmann gratuitamente.";
  }
  if (hasPaidAccess(user)) {
    return "Seu acesso comercial está liberado, sempre limitado por consentimento e permissão.";
  }
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") {
    return "Seu perfil precisa passar por validação antes de liberar recursos comerciais. Isso protege usuários, empresas e profissionais contra perfis falsos.";
  }
  if (user.subscription_status === "PAST_DUE") {
    return "Os recursos comerciais ficam pausados enquanto o pagamento estiver pendente. Os dados autorizados seguem protegidos.";
  }
  if (user.status === "ARCHIVED") {
    return "Esta conta foi arquivada administrativamente. O acesso fica bloqueado sem exclusão física dos registros de auditoria.";
  }
  if (user.status === "REJECTED" || user.subscription_status === "CANCELED") {
    return "Este perfil comercial não está liberado para acessar recursos pagos. Fale com a administração para revisar a situação.";
  }
  return "Este recurso exige perfil validado e assinatura ativa.";
}

export function paidAccessActionLabel(user?: AuthUser | null): string {
  if (!user) return "Ver acesso";
  if (user.status === "PENDING_VERIFICATION" || user.subscription_status === "PENDING") return "Acompanhar análise";
  if (user.subscription_status === "PAST_DUE") return "Ver pendência";
  if (user.status === "ARCHIVED") return "Conta arquivada";
  if (user.subscription_status === "CANCELED" || user.status === "REJECTED") return "Revisar acesso";
  return "Ver plano";
}

export function roleAccessDescription(role?: UserRole): string {
  switch (role) {
    case "PSYCHOLOGIST":
      return "Acesso profissional para acompanhar usuários que autorizaram compartilhamento emocional.";
    case "COMPANY":
      return "Acesso corporativo para indicadores agregados, NR-1 e saúde emocional organizacional.";
    case "CLINIC":
      return "Acesso institucional para clínicas, com validação antes de recursos clínicos.";
    case "HOSPITAL":
      return "Acesso institucional para operação clínica, triagem e dados autorizados.";
    case "NGO":
      return "Acesso social para acolhimento e projetos com dados autorizados.";
    case "SPONSOR":
      return "Acesso de patrocinador para apoiar iniciativas sem acesso indevido a dados sensíveis.";
    case "PUBLIC_INSTITUTION":
      return "Acesso institucional para SUS, UBS, CAPS e governo com governança de dados.";
    case "SUPER_ADMIN":
      return "Acesso interno de administração da plataforma.";
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
        "Evolução emocional autorizada",
        "Alertas clínicos dentro do escopo do MVP"
      ];
    case "COMPANY":
      return [
        "Painel NR-1",
        "Indicadores agregados",
        "Tendências organizacionais",
        "Alertas coletivos sem vigilância individual"
      ];
    case "CLINIC":
      return [
        "Painel institucional agregado",
        "Triagem e filas autorizadas",
        "Teleatendimento institucional",
        "Consentimento e auditoria"
      ];
    case "HOSPITAL":
      return [
        "Painel institucional agregado",
        "Acolhimento e encaminhamento",
        "Teleatendimento com equipe",
        "Governança e auditoria"
      ];
    case "NGO":
      return [
        "Painel institucional agregado",
        "Acompanhamento de projetos sociais",
        "Compartilhamento por consentimento",
        "Sem acesso individual sem autorização"
      ];
    case "PUBLIC_INSTITUTION":
      return [
        "Painel institucional agregado",
        "Apoio a SUS, UBS e CAPS",
        "Indicadores coletivos autorizados",
        "Governança e auditoria"
      ];
    case "USER":
      return [
        "Orb central e presença emocional",
        "Conversar com Bergmann",
        "Diário, humor, rotina leve e SOS",
        "Compartilhamento controlado pelo usuário"
      ];
    case "SUPER_ADMIN":
      return [
        "Análise de contas pendentes",
        "Aprovação e rejeição de perfis",
        "Administração interna sem acesso emocional indevido"
      ];
    default:
      return [
        "Conta validada antes do acesso sensível",
        "Vínculos e compartilhamento por consentimento",
        "Base institucional preparada para próximos blocos",
        "Sem acesso automático a dados individuais"
      ];
  }
}
