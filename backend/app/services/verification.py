from dataclasses import dataclass

from app.models.user import User, UserRole


@dataclass(frozen=True)
class VerificationTriage:
    score: int
    recommendation: str
    signals: list[str]
    warnings: list[str]


PAID_ROLE_LABELS = {
    UserRole.PSYCHOLOGIST: "perfil profissional",
    UserRole.COMPANY: "empresa",
    UserRole.CLINIC: "clinica",
    UserRole.HOSPITAL: "hospital",
    UserRole.NGO: "ONG",
    UserRole.SPONSOR: "patrocinador",
    UserRole.PUBLIC_INSTITUTION: "instituicao publica",
}


def build_verification_triage(user: User) -> VerificationTriage:
    score = 50
    signals: list[str] = []
    warnings: list[str] = []

    name_parts = [part for part in user.full_name.strip().split(" ") if part]
    if len(name_parts) >= 2:
        score += 10
        signals.append("Nome possui mais de uma parte.")
    else:
        score -= 10
        warnings.append("Nome curto exige revisao manual.")

    if user.document_type and user.document_last4:
        score += 20
        signals.append(f"{user.document_type} validado por formato e duplicidade.")
    else:
        score -= 25
        warnings.append("Documento nao esta completo para triagem.")

    if user.document_last4 and len(set(user.document_last4)) == 1:
        score -= 20
        warnings.append("Final do documento tem padrao repetido.")

    if user.email.endswith(("@example.com", "@test.com", "@mailinator.com")):
        score -= 15
        warnings.append("Dominio de email parece teste ou temporario.")
    else:
        score += 5
        signals.append("Email nao parece temporario basico.")

    if user.role == UserRole.PSYCHOLOGIST and user.document_type == "CRP":
        score += 10
        signals.append("Psicologo informou CRP.")
    elif user.role == UserRole.PSYCHOLOGIST:
        score -= 20
        warnings.append("Psicologo sem CRP associado.")

    if user.role in {
        UserRole.COMPANY,
        UserRole.CLINIC,
        UserRole.HOSPITAL,
        UserRole.NGO,
        UserRole.SPONSOR,
        UserRole.PUBLIC_INSTITUTION,
    } and user.document_type == "CNPJ":
        score += 10
        signals.append(f"{PAID_ROLE_LABELS.get(user.role, 'instituicao')} informou CNPJ.")
    elif user.role in PAID_ROLE_LABELS and user.role != UserRole.PSYCHOLOGIST:
        score -= 20
        warnings.append("Conta institucional sem CNPJ associado.")

    score = max(0, min(100, score))
    if score >= 80 and not warnings:
        recommendation = "REVIEW_APPROVE"
    elif score >= 60:
        recommendation = "REVIEW_REQUIRED"
    else:
        recommendation = "HIGH_RISK_REVIEW"

    if user.role != UserRole.USER:
        warnings.append("Aprovacao final deve ser manual antes de liberar plano pago.")

    return VerificationTriage(
        score=score,
        recommendation=recommendation,
        signals=signals,
        warnings=warnings,
    )
