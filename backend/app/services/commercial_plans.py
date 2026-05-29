from dataclasses import dataclass

from app.models.user import SubscriptionPlan, UserRole


@dataclass(frozen=True)
class CommercialPlan:
    role: UserRole
    plan: SubscriptionPlan
    title: str
    description: str
    admin_price_placeholder: str
    price_brl: float
    billing_interval_placeholder: str
    included_features: tuple[str, ...]
    checkout_public_enabled: bool = False
    admin_only_pricing: bool = True


COMMERCIAL_PLANS: tuple[CommercialPlan, ...] = (
    CommercialPlan(
        role=UserRole.PSYCHOLOGIST,
        plan=SubscriptionPlan.PSYCHOLOGIST_PRO,
        title="Psicologo Pro",
        description="Acompanhamento de usuarios que autorizaram compartilhamento emocional.",
        admin_price_placeholder="Preco mensal profissional",
        price_brl=149.90,
        billing_interval_placeholder="Mensal ou anual",
        included_features=(
            "Pacientes autorizados por consentimento",
            "Resumos emocionais autorizados",
            "Evolucao emocional autorizada",
            "Alertas de risco dentro do escopo do MVP",
        ),
    ),
    CommercialPlan(
        role=UserRole.COMPANY,
        plan=SubscriptionPlan.COMPANY_NR1,
        title="Empresa NR-1",
        description="Saude emocional organizacional com indicadores agregados e governanca.",
        admin_price_placeholder="Preco por faixa de colaboradores",
        price_brl=499.90,
        billing_interval_placeholder="Mensal corporativo",
        included_features=(
            "Painel NR-1",
            "Indicadores psicossociais agregados",
            "Tendencias emocionais anonimas",
            "Alertas coletivos sem vigilancia individual",
        ),
    ),
    CommercialPlan(
        role=UserRole.CLINIC,
        plan=SubscriptionPlan.CLINIC,
        title="Clinica",
        description="Operacao clinica validada para equipe e dados autorizados.",
        admin_price_placeholder="Preco institucional",
        price_brl=399.90,
        billing_interval_placeholder="Mensal institucional",
        included_features=(
            "Gestao institucional validada",
            "Acompanhamento com consentimento",
            "Relatorios autorizados",
            "Base para triagem futura",
        ),
    ),
    CommercialPlan(
        role=UserRole.HOSPITAL,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="Hospital",
        description="Apoio institucional para operacao clinica e acolhimento autorizado.",
        admin_price_placeholder="Contrato institucional",
        price_brl=799.90,
        billing_interval_placeholder="Contrato mensal ou anual",
        included_features=(
            "Fluxos institucionais",
            "Dados autorizados por usuario",
            "Indicadores agregados",
            "Governanca para equipes",
        ),
    ),
    CommercialPlan(
        role=UserRole.NGO,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="ONG",
        description="Acolhimento social com controle de consentimento e projetos autorizados.",
        admin_price_placeholder="Valor social ou patrocinado",
        price_brl=199.90,
        billing_interval_placeholder="Contrato social",
        included_features=(
            "Projetos de acolhimento",
            "Vinculos autorizados",
            "Relatorios de impacto agregados",
            "Sem acesso automatico a conversas",
        ),
    ),
    CommercialPlan(
        role=UserRole.PUBLIC_INSTITUTION,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="Instituicao publica",
        description="Base para SUS, UBS, CAPS e governo com governanca de dados.",
        admin_price_placeholder="Contrato publico",
        price_brl=799.90,
        billing_interval_placeholder="Contrato administrativo",
        included_features=(
            "Atendimento institucional validado",
            "Indicadores agregados",
            "Governanca LGPD",
            "Sem exposicao individual sem autorizacao",
        ),
    ),
    CommercialPlan(
        role=UserRole.SPONSOR,
        plan=SubscriptionPlan.SPONSOR,
        title="Patrocinador",
        description="Apoio financeiro a iniciativas de cuidado sem acesso indevido a dados.",
        admin_price_placeholder="Cota de patrocinio",
        price_brl=299.90,
        billing_interval_placeholder="Cota mensal, campanha ou anual",
        included_features=(
            "Apoio a iniciativas sociais",
            "Relatorios agregados de impacto",
            "Sem acesso a dados emocionais individuais",
            "Governanca de marca e privacidade",
        ),
    ),
)


def list_commercial_plans() -> list[CommercialPlan]:
    return list(COMMERCIAL_PLANS)


def commercial_plan_for_role(role: UserRole) -> CommercialPlan | None:
    return next((plan for plan in COMMERCIAL_PLANS if plan.role == role), None)
