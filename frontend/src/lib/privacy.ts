import { ApiError, apiRequest } from "@/lib/api";

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

const REGISTRATION_CONSENT_VERSION = "registration-lgpd-consent";

function registrationConsentFallback(): ConsentStatus {
  return {
    required: false,
    accepted: true,
    policy_version: REGISTRATION_CONSENT_VERSION,
    accepted_at: null
  };
}

export async function getConsentStatus() {
  try {
    return await apiRequest<ConsentStatus>("/privacy/consent");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      if (__DEV__) {
        console.info("[privacy] /privacy/consent unavailable; using registration LGPD consent fallback");
      }
      return registrationConsentFallback();
    }
    throw error;
  }
}

export async function acceptConsent(policyVersion: string) {
  if (policyVersion === REGISTRATION_CONSENT_VERSION) {
    return {
      accepted: true,
      policy_version: REGISTRATION_CONSENT_VERSION,
      accepted_at: new Date().toISOString()
    };
  }

  try {
    return await apiRequest<AcceptConsentResponse>("/privacy/consent", {
      method: "POST",
      body: JSON.stringify({ policy_version: policyVersion })
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      if (__DEV__) {
        console.info("[privacy] consent POST unavailable; continuing with registration LGPD consent");
      }
      return {
        accepted: true,
        policy_version: REGISTRATION_CONSENT_VERSION,
        accepted_at: new Date().toISOString()
      };
    }
    throw error;
  }
}
