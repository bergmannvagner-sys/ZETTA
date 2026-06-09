import { apiRequest } from "@/lib/api";

export type TelecareProvider = {
  id: string;
  full_name: string;
  role: "PSYCHOLOGIST" | "CLINIC" | "HOSPITAL";
  session_price_brl: number;
  platform_fee_percent: number;
  platform_fee_brl: number;
  provider_payout_brl: number;
  accepts_telecare: boolean;
};

export type TelecareSession = {
  id: string;
  requester_user_id: string;
  requester_name: string;
  provider_user_id: string;
  provider_name: string;
  provider_role: string;
  status: "REQUESTED" | "ACCEPTED" | "IN_SESSION" | "COMPLETED" | "CANCELED";
  room_code: string;
  session_price_brl: number;
  platform_fee_percent: number;
  platform_fee_brl: number;
  provider_payout_brl: number;
  payment_status: string;
  notes: string | null;
  requested_at: string;
  scheduled_for: string | null;
  updated_at: string;
  room_title: string;
  video_engine_status: string;
};

export type TelecareJoin = {
  session_id: string;
  room_code: string;
  provider_name: string;
  requester_name: string;
  join_url: string;
  expires_at: string;
  video_engine: "DAILY";
};

export async function listTelecareProviders(): Promise<TelecareProvider[]> {
  return apiRequest<TelecareProvider[]>("/telecare/providers");
}

export async function listTelecareSessions(): Promise<TelecareSession[]> {
  return apiRequest<TelecareSession[]>("/telecare/sessions");
}

export async function requestTelecareSession(input: {
  provider_user_id: string;
  notes?: string;
}): Promise<TelecareSession> {
  return apiRequest<TelecareSession>("/telecare/sessions", {
    method: "POST",
    body: JSON.stringify({
      provider_user_id: input.provider_user_id,
      notes: input.notes?.trim() || null
    })
  });
}

export async function updateTelecareSessionStatus(input: {
  sessionId: string;
  status: TelecareSession["status"];
}): Promise<TelecareSession> {
  return apiRequest<TelecareSession>(`/telecare/sessions/${input.sessionId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status })
  });
}

export async function joinTelecareSession(sessionId: string): Promise<TelecareJoin> {
  return apiRequest<TelecareJoin>(`/telecare/sessions/${sessionId}/join`, {
    method: "POST"
  });
}
