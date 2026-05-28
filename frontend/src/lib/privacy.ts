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

export async function getConsentStatus() {
  return apiRequest<ConsentStatus>("/privacy/consent");
}

export async function acceptConsent(policyVersion: string) {
  return apiRequest<AcceptConsentResponse>("/privacy/consent", {
    method: "POST",
    body: JSON.stringify({ policy_version: policyVersion })
  });
}
