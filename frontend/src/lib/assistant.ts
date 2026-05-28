import { apiRequest } from "@/lib/api";

export type CareReminderCategory = "WATER" | "PAUSE" | "BREATHING" | "REST" | "ROUTINE" | "CUSTOM";

export type CareReminder = {
  id: string;
  title: string;
  category: CareReminderCategory;
  cadence: string;
  time_local: string | null;
  note: string | null;
  active: boolean;
  last_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createCareReminder(input: {
  title: string;
  category: CareReminderCategory;
  cadence?: string;
  time_local?: string | null;
  note?: string | null;
}): Promise<CareReminder> {
  return apiRequest<CareReminder>("/assistant/reminders", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      category: input.category,
      cadence: input.cadence ?? "DAILY",
      time_local: input.time_local ?? null,
      note: input.note ?? null
    })
  });
}

export async function listCareReminders(): Promise<CareReminder[]> {
  return apiRequest<CareReminder[]>("/assistant/reminders");
}

export async function completeCareReminder(reminderId: string): Promise<CareReminder> {
  return apiRequest<CareReminder>(`/assistant/reminders/${reminderId}/complete`, {
    method: "POST"
  });
}
