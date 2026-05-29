from app.models.user import SubscriptionPlan, SubscriptionStatus, User, UserRole


PAID_ACCESS_STATUSES = {SubscriptionStatus.ACTIVE}


def default_plan_for_role(role: UserRole) -> SubscriptionPlan:
    if role == UserRole.USER:
        return SubscriptionPlan.FREE_USER
    if role == UserRole.PSYCHOLOGIST:
        return SubscriptionPlan.PSYCHOLOGIST_PRO
    if role == UserRole.COMPANY:
        return SubscriptionPlan.COMPANY_NR1
    if role in {UserRole.CLINIC, UserRole.HOSPITAL, UserRole.NGO, UserRole.PUBLIC_INSTITUTION}:
        return SubscriptionPlan.INSTITUTIONAL if role != UserRole.CLINIC else SubscriptionPlan.CLINIC
    if role == UserRole.SPONSOR:
        return SubscriptionPlan.SPONSOR
    return SubscriptionPlan.INTERNAL


def initial_subscription_status_for_role(role: UserRole) -> SubscriptionStatus:
    if role == UserRole.USER:
        return SubscriptionStatus.FREE
    if role == UserRole.SUPER_ADMIN:
        return SubscriptionStatus.ACTIVE
    return SubscriptionStatus.PENDING


def approval_subscription_status_for_role(role: UserRole) -> SubscriptionStatus:
    if role == UserRole.USER:
        return SubscriptionStatus.FREE
    if role == UserRole.SUPER_ADMIN:
        return SubscriptionStatus.ACTIVE
    return SubscriptionStatus.PENDING


def has_paid_access(user: User) -> bool:
    if user.role in {UserRole.USER, UserRole.SUPER_ADMIN}:
        return True
    return user.subscription_status in PAID_ACCESS_STATUSES
