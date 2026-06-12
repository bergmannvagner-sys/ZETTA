import { AccountStatus, AuthUser, SubscriptionPlan, SubscriptionStatus, UserRole } from "@/types/auth";

const validRoles = new Set<UserRole>([
  "USER",
  "PSYCHOLOGIST",
  "COMPANY",
  "NGO",
  "HOSPITAL",
  "CLINIC",
  "SPONSOR",
  "PUBLIC_INSTITUTION",
  "SUPER_ADMIN"
]);

const validStatuses = new Set<AccountStatus>(["ACTIVE", "PENDING_VERIFICATION", "REJECTED", "ARCHIVED"]);

const validPlans = new Set<SubscriptionPlan>([
  "FREE_USER",
  "PSYCHOLOGIST_PRO",
  "COMPANY_NR1",
  "CLINIC",
  "INSTITUTIONAL",
  "SPONSOR",
  "INTERNAL"
]);

const validSubscriptionStatuses = new Set<SubscriptionStatus>([
  "FREE",
  "PENDING",
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED"
]);

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }
  return fallback;
}

export function normalizeAuthUser(rawUser: Record<string, unknown> | null | undefined): AuthUser | null {
  if (!rawUser || typeof rawUser !== "object") {
    return null;
  }

  const id = readString(rawUser.id);
  const email = readString(rawUser.email);
  if (!id || !email) {
    return null;
  }

  const fullName = readString(rawUser.full_name) ?? readString(rawUser.name) ?? email;
  const documentType = readString(rawUser.document_type);
  const documentLast4 = readString(rawUser.document_last4);

  return {
    id,
    email,
    full_name: fullName,
    role: pickEnum(rawUser.role, validRoles, "USER"),
    status: pickEnum(rawUser.status ?? rawUser.accountStatus, validStatuses, "ACTIVE"),
    document_type: documentType ?? null,
    document_last4: documentLast4 ?? null,
    subscription_plan: pickEnum(rawUser.subscription_plan, validPlans, "FREE_USER"),
    subscription_status: pickEnum(rawUser.subscription_status, validSubscriptionStatuses, "FREE")
  };
}
