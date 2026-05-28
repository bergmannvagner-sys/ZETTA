import { apiRequest } from "@/lib/api";

export type JournalEntry = {
  id: string;
  content: string;
  entry_type: string;
  tags: string[];
  occurred_at: string;
  created_at: string;
};

export type EmotionLog = {
  id: string;
  mood: string;
  emotions: string[];
  intensity: number;
  energy: number | null;
  anxiety: number | null;
  stress: number | null;
  sleep_quality: number | null;
  motivation: number | null;
  note: string | null;
  created_at: string;
};

export type SharingCategory = "JOURNAL" | "AI_SUMMARY" | "TRENDS" | "MOOD" | "CRISIS";

export type SharingConsent = {
  id: string;
  target_user_id: string;
  target_email: string;
  target_role: string;
  categories: SharingCategory[];
  summary_only: boolean;
  period_start: string | null;
  period_end: string | null;
  granted_at: string;
  revoked_at: string | null;
};

export type EmotionalReport = {
  id: string;
  summary: string;
  risk_level: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuthorizedUserSummary = {
  user_id: string;
  full_name: string;
  email: string;
  categories: SharingCategory[];
  summary_only: boolean;
  latest_mood: string | null;
  average_intensity: number | null;
  journal_entries_visible: number;
};

export type NR1Report = {
  participant_count: number;
  suppressed: boolean;
  summary: string;
  indicators: Record<string, unknown>;
  generated_at: string;
};

export async function createJournalEntry(input: {
  content: string;
  entry_type?: string;
  tags?: string[];
}): Promise<JournalEntry> {
  return apiRequest<JournalEntry>("/journal/entries", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      entry_type: input.entry_type ?? "REFLECTION",
      tags: input.tags ?? []
    })
  });
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  return apiRequest<JournalEntry[]>("/journal/entries");
}

export async function createEmotionLog(input: {
  mood: string;
  emotions?: string[];
  intensity: number;
  energy?: number | null;
  anxiety?: number | null;
  stress?: number | null;
  sleep_quality?: number | null;
  motivation?: number | null;
  note?: string | null;
}): Promise<EmotionLog> {
  return apiRequest<EmotionLog>("/emotions/logs", {
    method: "POST",
    body: JSON.stringify({
      mood: input.mood,
      emotions: input.emotions ?? [],
      intensity: input.intensity,
      energy: input.energy ?? null,
      anxiety: input.anxiety ?? null,
      stress: input.stress ?? null,
      sleep_quality: input.sleep_quality ?? null,
      motivation: input.motivation ?? null,
      note: input.note ?? null
    })
  });
}

export async function createSharingConsent(input: {
  target_email: string;
  categories: SharingCategory[];
  summary_only: boolean;
}): Promise<SharingConsent> {
  return apiRequest<SharingConsent>("/sharing/consents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listSharingConsents(): Promise<SharingConsent[]> {
  return apiRequest<SharingConsent[]>("/sharing/consents");
}

export async function revokeSharingConsent(consentId: string): Promise<void> {
  await apiRequest<void>(`/sharing/consents/${consentId}`, {
    method: "DELETE"
  });
}

export async function createMyEmotionalReport(): Promise<EmotionalReport> {
  return apiRequest<EmotionalReport>("/reports/emotional/me", {
    method: "POST"
  });
}

export async function listAuthorizedUsers(): Promise<AuthorizedUserSummary[]> {
  return apiRequest<AuthorizedUserSummary[]>("/professional/authorized-users");
}

export async function getNR1Report(): Promise<NR1Report> {
  return apiRequest<NR1Report>("/nr1/report");
}
