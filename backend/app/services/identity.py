import hashlib
import hmac
import re

from app.core.config import get_settings
from app.models.user import UserRole


ORGANIZATION_ROLES = {
    UserRole.COMPANY,
    UserRole.NGO,
    UserRole.HOSPITAL,
    UserRole.CLINIC,
    UserRole.SPONSOR,
    UserRole.PUBLIC_INSTITUTION,
}


def document_type_for_role(role: UserRole) -> str:
    if role in ORGANIZATION_ROLES:
        return "CNPJ"
    if role == UserRole.PSYCHOLOGIST:
        return "CRP"
    return "CPF"


def normalize_document(document_type: str, value: str) -> str:
    if document_type in {"CPF", "CNPJ"}:
        return re.sub(r"\D", "", value)
    return re.sub(r"\s+", "", value).upper()


def document_last4(normalized_document: str) -> str:
    return normalized_document[-4:]


def document_lookup_hash(document_type: str, normalized_document: str) -> str:
    settings = get_settings()
    message = f"{document_type}:{normalized_document}".encode("utf-8")
    return hmac.new(settings.jwt_secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def validate_document(document_type: str, normalized_document: str) -> str | None:
    if document_type == "CPF":
        if len(normalized_document) != 11 or len(set(normalized_document)) == 1:
            return "Informe um CPF valido para validacao da conta."
        return None if _is_valid_cpf(normalized_document) else "Informe um CPF valido para validacao da conta."
    if document_type == "CNPJ":
        if len(normalized_document) != 14 or len(set(normalized_document)) == 1:
            return "Informe um CNPJ valido para validacao da conta."
        return None if _is_valid_cnpj(normalized_document) else "Informe um CNPJ valido para validacao da conta."
    if document_type == "CRP":
        if not re.fullmatch(r"[A-Z0-9/-]{4,32}", normalized_document):
            return "Informe um CRP valido para validacao profissional."
    return None


def _is_valid_cpf(cpf: str) -> bool:
    numbers = [int(digit) for digit in cpf]
    first = (sum(numbers[index] * (10 - index) for index in range(9)) * 10) % 11
    if first == 10:
        first = 0
    second = (sum(numbers[index] * (11 - index) for index in range(10)) * 10) % 11
    if second == 10:
        second = 0
    return numbers[9] == first and numbers[10] == second


def _is_valid_cnpj(cnpj: str) -> bool:
    numbers = [int(digit) for digit in cnpj]
    first_weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    second_weights = [6, *first_weights]
    first_sum = sum(numbers[index] * first_weights[index] for index in range(12))
    first_digit = 0 if first_sum % 11 < 2 else 11 - (first_sum % 11)
    second_sum = sum(numbers[index] * second_weights[index] for index in range(13))
    second_digit = 0 if second_sum % 11 < 2 else 11 - (second_sum % 11)
    return numbers[12] == first_digit and numbers[13] == second_digit
