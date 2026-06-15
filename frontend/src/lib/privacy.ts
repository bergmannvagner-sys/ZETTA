import { apiRequest } from "@/lib/api";

export type ConsentStatus = {
  required: boolean;
  accepted: boolean;
  policy_version: string;
  accepted_at: string | null;
};

export type AcceptConsentResponse = {
  accepted: boolean;
  policy_version: string;
  accepted_at: string;
};

export type RevokeConsentResponse = {
  accepted: boolean;
  policy_version: string;
  revoked_at: string;
};

export type ArchiveAccountResponse = {
  archived: boolean;
  archived_at: string;
  revoked_refresh_tokens: number;
  revoked_sharing_consents: number;
  consent_revoked: boolean;
};

export type PrivacyExport = {
  exported_at: string;
  user: Record<string, unknown>;
  consent_records: Record<string, unknown>[];
  sharing_consents_granted: Record<string, unknown>[];
  sharing_consents_received: Record<string, unknown>[];
  journal_entries: Record<string, unknown>[];
  emotion_logs: Record<string, unknown>[];
  emotional_reports: Record<string, unknown>[];
  chat_sessions: Record<string, unknown>[];
  sos_events: Record<string, unknown>[];
  care_reminders: Record<string, unknown>[];
};

export type PrivacyAuditEntry = {
  id: string;
  action: string;
  actor_user_id?: string | null;
  target_user_id?: string | null;
  resource_type: string;
  resource_id?: string | null;
  metadata?: unknown;
  created_at: string;
};

export async function getConsentStatus() {
  return apiRequest<ConsentStatus>("/privacy/consent");
}

export async function getPrivacyAudit() {
  return apiRequest<PrivacyAuditEntry[]>("/privacy/audit?limit=8");
}

export async function acceptConsent(policyVersion: string) {
  return apiRequest<AcceptConsentResponse>("/privacy/consent", {
    method: "POST",
    body: JSON.stringify({ policy_version: policyVersion })
  });
}

export async function revokeConsent() {
  return apiRequest<RevokeConsentResponse>("/privacy/consent/revoke", {
    method: "POST"
  });
}

export async function archiveAccount() {
  return apiRequest<ArchiveAccountResponse>("/privacy/account/archive", {
    method: "POST"
  });
}

export async function exportPrivacyData() {
  return apiRequest<PrivacyExport>("/privacy/export");
}
