import { apiRequest } from "@/lib/api";
import { SharingCategory } from "@/lib/emotional";
import { UserRole } from "@/types/auth";

export type InstitutionCategoryCount = {
  category: SharingCategory;
  count: number;
};

export type InstitutionMoodCount = {
  mood: string;
  count: number;
};

export type InstitutionSharedUserSummary = {
  user_id: string;
  full_name: string;
  email: string;
  categories: SharingCategory[];
  summary_only: boolean;
  latest_mood: string | null;
  average_intensity: number | null;
  journal_entries_visible: number;
  shared_at: string;
};

export type InstitutionDashboard = {
  institution_role: UserRole;
  participant_count: number;
  category_breakdown: InstitutionCategoryCount[];
  mood_breakdown: InstitutionMoodCount[];
  average_intensity: number | null;
  average_anxiety: number | null;
  average_stress: number | null;
  risk_flags: number;
  summary: string;
  privacy_note: string;
  shared_users: InstitutionSharedUserSummary[];
  generated_at: string;
};

export async function getInstitutionDashboard(): Promise<InstitutionDashboard> {
  return apiRequest<InstitutionDashboard>("/institution/dashboard");
}
