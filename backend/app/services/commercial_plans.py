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
        description="Acompanhamento profissional de usuarios que autorizaram compartilhamento emocional.",
        admin_price_placeholder="Preco definitivo mensal para psicologo profissional",
        price_brl=89.90,
        billing_interval_placeholder="Mensal",
        included_features=(
            "Pacientes ilimitados autorizados por consentimento",
            "Relatorios avancados e resumos emocionais autorizados",
            "Tendencias emocionais e insights IA",
            "Exportacao futura de PDF e dashboard profissional",
        ),
    ),
    CommercialPlan(
        role=UserRole.COMPANY,
        plan=SubscriptionPlan.COMPANY_NR1,
        title="Empresa NR-1 Start",
        description="Saude emocional organizacional para ate 50 colaboradores com indicadores agregados e governanca.",
        admin_price_placeholder="Preco definitivo mensal inicial por empresa",
        price_brl=299.00,
        billing_interval_placeholder="Mensal corporativo ate 50 colaboradores",
        included_features=(
            "Painel NR-1",
            "Indicadores psicossociais agregados",
            "Relatorios emocionais e tendencias organizacionais",
            "Alertas basicos sem vigilancia individual",
        ),
    ),
    CommercialPlan(
        role=UserRole.CLINIC,
        plan=SubscriptionPlan.CLINIC,
        title="Clinica Start",
        description="Operacao clinica validada para equipe e dados autorizados.",
        admin_price_placeholder="Preco definitivo mensal inicial para clinica",
        price_brl=199.00,
        billing_interval_placeholder="Mensal institucional ate 5 profissionais",
        included_features=(
            "Ate 5 profissionais",
            "Gestao de pacientes autorizados",
            "Relatorios autorizados",
            "Dashboard da clinica",
        ),
    ),
    CommercialPlan(
        role=UserRole.HOSPITAL,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="Hospital Start",
        description="Apoio institucional para operacao clinica e acolhimento autorizado.",
        admin_price_placeholder="Preco definitivo mensal inicial para hospital",
        price_brl=999.00,
        billing_interval_placeholder="Mensal institucional",
        included_features=(
            "Equipes multidisciplinares",
            "Gestao emocional institucional",
            "Relatorios clinicos autorizados",
            "Dashboard hospitalar",
        ),
    ),
    CommercialPlan(
        role=UserRole.NGO,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="ONG Social",
        description="Acolhimento social com controle de consentimento e projetos autorizados.",
        admin_price_placeholder="Preco definitivo social mensal",
        price_brl=19.90,
        billing_interval_placeholder="Mensal social ate 100 pessoas atendidas",
        included_features=(
            "Ate 100 pessoas atendidas",
            "Relatorios basicos",
            "Dashboard social",
            "Sem acesso automatico a conversas",
        ),
    ),
    CommercialPlan(
        role=UserRole.PUBLIC_INSTITUTION,
        plan=SubscriptionPlan.INSTITUTIONAL,
        title="Instituicao publica",
        description="Base para SUS, UBS, CAPS e governo com governanca de dados.",
        admin_price_placeholder="Preco definitivo inicial para contrato publico",
        price_brl=499.00,
        billing_interval_placeholder="Mensal a partir de R$ 499,00",
        included_features=(
            "Dashboard institucional",
            "Relatorios publicos autorizados",
            "Programas sociais",
            "Indicadores regionais sem exposicao individual",
        ),
    ),
    CommercialPlan(
        role=UserRole.SPONSOR,
        plan=SubscriptionPlan.SPONSOR,
        title="Patrocinador Supporter",
        description="Apoio financeiro a iniciativas de cuidado sem acesso indevido a dados.",
        admin_price_placeholder="Preco definitivo mensal para apoiador",
        price_brl=99.00,
        billing_interval_placeholder="Cota mensal",
        included_features=(
            "Selo apoiador",
            "Pagina institucional futura",
            "Campanhas autorizadas",
            "Sem acesso a dados emocionais individuais",
        ),
    ),
)


def list_commercial_plans() -> list[CommercialPlan]:
    return list(COMMERCIAL_PLANS)


def commercial_plan_for_role(role: UserRole) -> CommercialPlan | None:
    return next((plan for plan in COMMERCIAL_PLANS if plan.role == role), None)
