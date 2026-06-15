import { apiRequest } from "@/lib/api";

export type Nr1WorkspaceStatus = "DRAFT" | "IN_REVIEW" | "ACTIVE" | "MONITORING" | "PAUSED";
export type Nr1RiskCategory = "PSYCHOSOCIAL" | "ORGANIZATIONAL" | "ERGONOMIC" | "ENVIRONMENTAL" | "SAFETY";
export type Nr1RiskSource = "TEMPLATE" | "MANUAL" | "EMPLOYEE_FEEDBACK" | "EMOTIONAL_SIGNAL" | "INCIDENT";
export type Nr1RiskStatus = "OPEN" | "MITIGATING" | "CONTROLLED" | "MONITORING" | "ARCHIVED";
export type Nr1ActionStatus = "PLANNED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELED";
export type Nr1TrainingStatus = "PENDING" | "SCHEDULED" | "COMPLETED" | "OVERDUE" | "CANCELED";

export type Nr1Workspace = {
  id: string;
  company_user_id: string;
  organization_name: string;
  unit_name: string | null;
  gro_owner_name: string | null;
  scope_statement: string | null;
  notes: string | null;
  status: Nr1WorkspaceStatus;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Nr1RiskItem = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  category: Nr1RiskCategory;
  source: Nr1RiskSource;
  status: Nr1RiskStatus;
  severity: number;
  likelihood: number;
  risk_score: number;
  owner_label: string | null;
  due_on: string | null;
  notes: string | null;
  is_template: boolean;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Nr1ActionItem = {
  id: string;
  workspace_id: string;
  risk_item_id: string | null;
  title: string;
  description: string | null;
  owner_label: string | null;
  status: Nr1ActionStatus;
  progress_percent: number;
  due_on: string | null;
  completed_on: string | null;
  notes: string | null;
  is_template: boolean;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

export type Nr1TrainingItem = {
  id: string;
  workspace_id: string;
  title: string;
  audience: string | null;
  status: Nr1TrainingStatus;
  frequency_days: number | null;
  required_hours: number | null;
  due_on: string | null;
  completed_on: string | null;
  notes: string | null;
  is_template: boolean;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

export type Nr1Summary = {
  participant_count: number;
  minimum_participants: number;
  suppressed: boolean;
  signal_count: number | null;
  average_intensity: number | null;
  average_anxiety: number | null;
  average_stress: number | null;
  high_risk_signal_count: number | null;
  open_risk_count: number;
  mitigating_risk_count: number;
  controlled_risk_count: number;
  open_action_count: number;
  overdue_action_count: number;
  training_count: number;
  overdue_training_count: number;
  template_count: number;
  summary: string;
  current_state: string;
  privacy_note: string;
  generated_at: string;
};

export type Nr1WorkspaceOverview = {
  workspace: Nr1Workspace;
  summary: Nr1Summary;
  risks: Nr1RiskItem[];
  actions: Nr1ActionItem[];
  trainings: Nr1TrainingItem[];
};

export type Nr1WorkspaceUpdate = {
  organization_name?: string | null;
  unit_name?: string | null;
  gro_owner_name?: string | null;
  scope_statement?: string | null;
  notes?: string | null;
  status?: Nr1WorkspaceStatus | null;
};

export type Nr1RiskItemCreate = {
  title: string;
  description?: string | null;
  category: Nr1RiskCategory;
  source?: Nr1RiskSource;
  status?: Nr1RiskStatus;
  severity: number;
  likelihood: number;
  owner_label?: string | null;
  due_on?: string | null;
  notes?: string | null;
  is_template?: boolean;
};

export type Nr1RiskItemUpdate = Partial<Nr1RiskItemCreate> & {
  reviewed_at?: string | null;
};

export type Nr1ActionItemCreate = {
  title: string;
  description?: string | null;
  owner_label?: string | null;
  status?: Nr1ActionStatus;
  progress_percent?: number;
  due_on?: string | null;
  completed_on?: string | null;
  notes?: string | null;
  risk_item_id?: string | null;
  is_template?: boolean;
};

export type Nr1ActionItemUpdate = Partial<Nr1ActionItemCreate>;

export type Nr1TrainingItemCreate = {
  title: string;
  audience?: string | null;
  status?: Nr1TrainingStatus;
  frequency_days?: number | null;
  required_hours?: number | null;
  due_on?: string | null;
  completed_on?: string | null;
  notes?: string | null;
  is_template?: boolean;
};

export type Nr1TrainingItemUpdate = Partial<Nr1TrainingItemCreate>;

export async function getNr1Workspace(): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>("/nr1/workspace");
}

export async function updateNr1Workspace(input: Nr1WorkspaceUpdate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>("/nr1/workspace", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function createNr1RiskItem(input: Nr1RiskItemCreate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>("/nr1/risks", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateNr1RiskItem(riskId: string, input: Nr1RiskItemUpdate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/risks/${riskId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteNr1RiskItem(riskId: string): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/risks/${riskId}`, {
    method: "DELETE"
  });
}

export async function createNr1ActionItem(input: Nr1ActionItemCreate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>("/nr1/actions", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateNr1ActionItem(actionId: string, input: Nr1ActionItemUpdate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/actions/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteNr1ActionItem(actionId: string): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/actions/${actionId}`, {
    method: "DELETE"
  });
}

export async function createNr1TrainingItem(input: Nr1TrainingItemCreate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>("/nr1/trainings", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateNr1TrainingItem(trainingId: string, input: Nr1TrainingItemUpdate): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/trainings/${trainingId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function deleteNr1TrainingItem(trainingId: string): Promise<Nr1WorkspaceOverview> {
  return apiRequest<Nr1WorkspaceOverview>(`/nr1/trainings/${trainingId}`, {
    method: "DELETE"
  });
}
