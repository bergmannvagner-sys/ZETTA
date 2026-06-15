import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View, Pressable } from "react-native";

import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText, Field, Loading, SectionTitle } from "@/components/ui";
import { hasPaidAccess } from "@/lib/billing";
import {
  createNr1ActionItem,
  createNr1RiskItem,
  createNr1TrainingItem,
  deleteNr1ActionItem,
  deleteNr1RiskItem,
  deleteNr1TrainingItem,
  getNr1Workspace,
  Nr1ActionItem,
  Nr1ActionItemUpdate,
  Nr1ActionStatus,
  Nr1RiskCategory,
  Nr1RiskItem,
  Nr1RiskItemUpdate,
  Nr1RiskSource,
  Nr1RiskStatus,
  Nr1Summary,
  Nr1TrainingItem,
  Nr1TrainingItemUpdate,
  Nr1TrainingStatus,
  Nr1Workspace,
  Nr1WorkspaceStatus,
  updateNr1ActionItem,
  updateNr1RiskItem,
  updateNr1TrainingItem,
  updateNr1Workspace
} from "@/lib/nr1";
import { useAuthStore } from "@/store/auth-store";

type Choice<T extends string> = {
  value: T;
  label: string;
  tone?: "soft" | "info" | "success" | "warning" | "error";
};

const workspaceStatusChoices: Choice<Nr1WorkspaceStatus>[] = [
  { value: "DRAFT", label: "Rascunho", tone: "soft" },
  { value: "IN_REVIEW", label: "Em revisao", tone: "warning" },
  { value: "ACTIVE", label: "Ativo", tone: "success" },
  { value: "MONITORING", label: "Monitorando", tone: "info" },
  { value: "PAUSED", label: "Pausado", tone: "error" }
];

const riskCategoryChoices: Choice<Nr1RiskCategory>[] = [
  { value: "PSYCHOSOCIAL", label: "Psicossocial", tone: "warning" },
  { value: "ORGANIZATIONAL", label: "Organizacional", tone: "info" },
  { value: "ERGONOMIC", label: "Ergonomico", tone: "soft" },
  { value: "ENVIRONMENTAL", label: "Ambiental", tone: "success" },
  { value: "SAFETY", label: "Seguranca", tone: "error" }
];

const riskSourceChoices: Choice<Nr1RiskSource>[] = [
  { value: "TEMPLATE", label: "Modelo inicial", tone: "soft" },
  { value: "MANUAL", label: "Manual", tone: "info" },
  { value: "EMPLOYEE_FEEDBACK", label: "Feedback", tone: "warning" },
  { value: "EMOTIONAL_SIGNAL", label: "Sinal emocional", tone: "success" },
  { value: "INCIDENT", label: "Incidente", tone: "error" }
];

const riskStatusChoices: Choice<Nr1RiskStatus>[] = [
  { value: "OPEN", label: "Aberto", tone: "warning" },
  { value: "MITIGATING", label: "Mitigando", tone: "info" },
  { value: "CONTROLLED", label: "Controlado", tone: "success" },
  { value: "MONITORING", label: "Monitorando", tone: "soft" },
  { value: "ARCHIVED", label: "Arquivado", tone: "error" }
];

const actionStatusChoices: Choice<Nr1ActionStatus>[] = [
  { value: "PLANNED", label: "Planejado", tone: "soft" },
  { value: "IN_PROGRESS", label: "Em andamento", tone: "info" },
  { value: "BLOCKED", label: "Bloqueado", tone: "warning" },
  { value: "COMPLETED", label: "Concluido", tone: "success" },
  { value: "CANCELED", label: "Cancelado", tone: "error" }
];

const trainingStatusChoices: Choice<Nr1TrainingStatus>[] = [
  { value: "PENDING", label: "Pendente", tone: "warning" },
  { value: "SCHEDULED", label: "Agendado", tone: "info" },
  { value: "COMPLETED", label: "Concluido", tone: "success" },
  { value: "OVERDUE", label: "Vencido", tone: "error" },
  { value: "CANCELED", label: "Cancelado", tone: "soft" }
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function toNullableText(value: string): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInt(value: string): number | null {
  const parsed = toNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function toNullableDate(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Nao definido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Nao revisado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink dark:text-white">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-3 py-2 ${
                active
                  ? "border-primary bg-primary/15"
                  : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
              }`}
            >
              <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted dark:text-[#D1D5DB]"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[150px] flex-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-4">
      <Text className="text-sm text-muted dark:text-[#D1D5DB]">{label}</Text>
      <Text selectable className="text-2xl font-semibold text-ink dark:text-white">
        {value}
      </Text>
    </View>
  );
}

function metricTone(summary: Nr1Summary): "success" | "warning" | "info" | "soft" {
  if (summary.suppressed) return "soft";
  if (summary.overdue_action_count > 0 || summary.overdue_training_count > 0) return "warning";
  if (summary.open_risk_count > 0) return "info";
  return "success";
}

function itemTone(value: string): "soft" | "success" | "warning" | "error" | "info" {
  switch (value) {
    case "ACTIVE":
    case "CONTROLLED":
    case "COMPLETED":
      return "success";
    case "IN_REVIEW":
    case "MITIGATING":
    case "IN_PROGRESS":
    case "SCHEDULED":
      return "info";
    case "BLOCKED":
    case "OVERDUE":
    case "OPEN":
    case "PENDING":
      return "warning";
    case "PAUSED":
    case "ARCHIVED":
    case "CANCELED":
      return "error";
    default:
      return "soft";
  }
}

function statusLabel(value: string): string {
  const lookup: Record<string, string> = {
    DRAFT: "Rascunho",
    IN_REVIEW: "Em revisao",
    ACTIVE: "Ativo",
    MONITORING: "Monitorando",
    PAUSED: "Pausado",
    OPEN: "Aberto",
    MITIGATING: "Mitigando",
    CONTROLLED: "Controlado",
    ARCHIVED: "Arquivado",
    PLANNED: "Planejado",
    IN_PROGRESS: "Em andamento",
    BLOCKED: "Bloqueado",
    COMPLETED: "Concluido",
    CANCELED: "Cancelado",
    PENDING: "Pendente",
    SCHEDULED: "Agendado",
    OVERDUE: "Vencido"
  };
  return lookup[value] ?? value;
}

function currentWorkspaceValues(workspace?: Nr1Workspace) {
  return {
    organization_name: workspace?.organization_name ?? "",
    unit_name: workspace?.unit_name ?? "",
    gro_owner_name: workspace?.gro_owner_name ?? "",
    scope_statement: workspace?.scope_statement ?? "",
    notes: workspace?.notes ?? "",
    status: workspace?.status ?? "DRAFT"
  };
}

function compareText(nextValue: string, currentValue?: string | null): boolean {
  return normalizeText(nextValue) !== normalizeText(currentValue ?? "");
}

function compareDate(nextValue: string, currentValue?: string | null): boolean {
  return toNullableDate(nextValue) !== (currentValue ?? null);
}

function compareNumber(nextValue: string, currentValue?: number | null): boolean {
  const parsed = toNullableNumber(nextValue);
  if (nextValue.trim() === "") {
    return currentValue !== null && currentValue !== undefined;
  }
  return parsed === null ? true : parsed !== currentValue;
}

function compareInt(nextValue: string, currentValue?: number | null): boolean {
  const parsed = toNullableInt(nextValue);
  if (nextValue.trim() === "") {
    return currentValue !== null && currentValue !== undefined;
  }
  return parsed === null ? true : parsed !== currentValue;
}

function WorkspaceStatusCard({
  summary,
  workspace
}: {
  summary: Nr1Summary;
  workspace: Nr1Workspace;
}) {
  return (
    <Card>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={summary.current_state} tone={metricTone(summary)} />
        <Badge label={summary.suppressed ? "Amostra suprimida" : "Dados agregados"} tone={summary.suppressed ? "soft" : "success"} />
        <Badge label={`Workspace ${statusLabel(workspace.status)}`} tone="info" />
        <Badge label={`Template: ${summary.template_count}`} tone="soft" />
      </View>
      <Text selectable className="text-base leading-6 text-ink dark:text-white">
        {summary.summary}
      </Text>
      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
        {summary.privacy_note}
      </Text>
      <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
        Ultima revisao: {formatDateTime(workspace.last_reviewed_at)}
      </Text>
    </Card>
  );
}

function RiskItemCard({
  item,
  onSave,
  onDelete,
  saving,
  deleting
}: {
  item: Nr1RiskItem;
  onSave: (payload: Nr1RiskItemUpdate) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [title, setTitle] = React.useState(item.title);
  const [description, setDescription] = React.useState(item.description ?? "");
  const [category, setCategory] = React.useState<Nr1RiskCategory>(item.category);
  const [source, setSource] = React.useState<Nr1RiskSource>(item.source);
  const [status, setStatus] = React.useState<Nr1RiskStatus>(item.status);
  const [severity, setSeverity] = React.useState(String(item.severity));
  const [likelihood, setLikelihood] = React.useState(String(item.likelihood));
  const [ownerLabel, setOwnerLabel] = React.useState(item.owner_label ?? "");
  const [dueOn, setDueOn] = React.useState(item.due_on ?? "");
  const [notes, setNotes] = React.useState(item.notes ?? "");
  const [isTemplate, setIsTemplate] = React.useState(item.is_template);

  React.useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? "");
    setCategory(item.category);
    setSource(item.source);
    setStatus(item.status);
    setSeverity(String(item.severity));
    setLikelihood(String(item.likelihood));
    setOwnerLabel(item.owner_label ?? "");
    setDueOn(item.due_on ?? "");
    setNotes(item.notes ?? "");
    setIsTemplate(item.is_template);
  }, [item]);

  const dirty =
    compareText(title, item.title) ||
    compareText(description, item.description) ||
    category !== item.category ||
    source !== item.source ||
    status !== item.status ||
    compareInt(severity, item.severity) ||
    compareInt(likelihood, item.likelihood) ||
    compareText(ownerLabel, item.owner_label) ||
    compareDate(dueOn, item.due_on) ||
    compareText(notes, item.notes) ||
    isTemplate !== item.is_template;

  const invalid = toNullableInt(severity) === null || toNullableInt(likelihood) === null;

  return (
    <Card>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={`Score ${item.risk_score}`} tone={itemTone(item.status)} />
        <Badge label={statusLabel(item.status)} tone={itemTone(item.status)} />
        {item.is_template ? <Badge label="Modelo inicial" tone="soft" /> : null}
      </View>
      <Field label="Titulo" value={title} onChangeText={setTitle} maxLength={160} />
      <Field
        label="Descricao"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        maxLength={4000}
      />
      <ChoiceChips label="Categoria" value={category} options={riskCategoryChoices} onChange={setCategory} />
      <ChoiceChips label="Origem" value={source} options={riskSourceChoices} onChange={setSource} />
      <ChoiceChips label="Status" value={status} options={riskStatusChoices} onChange={setStatus} />
      <Field label="Severidade (1-5)" value={severity} onChangeText={setSeverity} keyboardType="number-pad" maxLength={2} />
      <Field label="Probabilidade (1-5)" value={likelihood} onChangeText={setLikelihood} keyboardType="number-pad" maxLength={2} />
      <Field label="Responsavel" value={ownerLabel} onChangeText={setOwnerLabel} maxLength={160} />
      <Field label="Prazo (YYYY-MM-DD)" value={dueOn} onChangeText={setDueOn} autoCapitalize="none" maxLength={10} />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline textAlignVertical="top" maxLength={4000} />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isTemplate }}
        onPress={() => setIsTemplate((value) => !value)}
        className={`rounded-2xl border p-4 ${
          isTemplate
            ? "border-primary bg-primary/10"
            : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
        }`}
      >
        <Text className="text-base font-semibold text-ink dark:text-white">
          {isTemplate ? "Template ativado" : "Template desativado"}
        </Text>
        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          Templates continuam editaveis e servem apenas como base inicial.
        </Text>
      </Pressable>
      <View className="flex-row flex-wrap gap-2">
        <Button
          label="Salvar risco"
          loading={saving}
          disabled={!dirty || invalid}
          onPress={() =>
            onSave({
              title,
              description: toNullableText(description),
              category,
              source,
              status,
              severity: toNullableInt(severity) ?? item.severity,
              likelihood: toNullableInt(likelihood) ?? item.likelihood,
              owner_label: toNullableText(ownerLabel),
              due_on: toNullableDate(dueOn),
              notes: toNullableText(notes),
              is_template: isTemplate
            })
          }
        />
        <Button label="Excluir risco" tone="ghost" loading={deleting} onPress={onDelete} />
      </View>
    </Card>
  );
}

function ActionItemCard({
  item,
  risks,
  onSave,
  onDelete,
  saving,
  deleting
}: {
  item: Nr1ActionItem;
  risks: Nr1RiskItem[];
  onSave: (payload: Nr1ActionItemUpdate) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [title, setTitle] = React.useState(item.title);
  const [description, setDescription] = React.useState(item.description ?? "");
  const [ownerLabel, setOwnerLabel] = React.useState(item.owner_label ?? "");
  const [status, setStatus] = React.useState<Nr1ActionStatus>(item.status);
  const [progressPercent, setProgressPercent] = React.useState(String(item.progress_percent));
  const [dueOn, setDueOn] = React.useState(item.due_on ?? "");
  const [completedOn, setCompletedOn] = React.useState(item.completed_on ?? "");
  const [notes, setNotes] = React.useState(item.notes ?? "");
  const [isTemplate, setIsTemplate] = React.useState(item.is_template);
  const linkedRisk = risks.find((risk) => risk.id === item.risk_item_id);

  React.useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? "");
    setOwnerLabel(item.owner_label ?? "");
    setStatus(item.status);
    setProgressPercent(String(item.progress_percent));
    setDueOn(item.due_on ?? "");
    setCompletedOn(item.completed_on ?? "");
    setNotes(item.notes ?? "");
    setIsTemplate(item.is_template);
  }, [item]);

  const dirty =
    compareText(title, item.title) ||
    compareText(description, item.description) ||
    compareText(ownerLabel, item.owner_label) ||
    status !== item.status ||
    compareInt(progressPercent, item.progress_percent) ||
    compareDate(dueOn, item.due_on) ||
    compareDate(completedOn, item.completed_on) ||
    compareText(notes, item.notes) ||
    isTemplate !== item.is_template;

  const invalid = toNullableInt(progressPercent) === null;

  return (
    <Card>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={statusLabel(item.status)} tone={itemTone(item.status)} />
        {item.is_template ? <Badge label="Modelo inicial" tone="soft" /> : null}
        <Badge label={`${item.progress_percent}%`} tone="info" />
      </View>
      <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
        Risco vinculado: {linkedRisk ? linkedRisk.title : item.risk_item_id ?? "nenhum"}
      </Text>
      <Field label="Titulo" value={title} onChangeText={setTitle} maxLength={160} />
      <Field
        label="Descricao"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        maxLength={4000}
      />
      <Field label="Responsavel" value={ownerLabel} onChangeText={setOwnerLabel} maxLength={160} />
      <ChoiceChips label="Status" value={status} options={actionStatusChoices} onChange={setStatus} />
      <Field label="Progresso (%)" value={progressPercent} onChangeText={setProgressPercent} keyboardType="number-pad" maxLength={3} />
      <Field label="Prazo (YYYY-MM-DD)" value={dueOn} onChangeText={setDueOn} autoCapitalize="none" maxLength={10} />
      <Field
        label="Concluido em (YYYY-MM-DD)"
        value={completedOn}
        onChangeText={setCompletedOn}
        autoCapitalize="none"
        maxLength={10}
      />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline textAlignVertical="top" maxLength={4000} />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isTemplate }}
        onPress={() => setIsTemplate((value) => !value)}
        className={`rounded-2xl border p-4 ${
          isTemplate
            ? "border-primary bg-primary/10"
            : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
        }`}
      >
        <Text className="text-base font-semibold text-ink dark:text-white">
          {isTemplate ? "Template ativado" : "Template desativado"}
        </Text>
        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          A relacao com um risco e opcional. O status concluido seta 100% automaticamente.
        </Text>
      </Pressable>
      <View className="flex-row flex-wrap gap-2">
        <Button
          label="Salvar acao"
          loading={saving}
          disabled={!dirty || invalid}
          onPress={() =>
            onSave({
              title,
              description: toNullableText(description),
              owner_label: toNullableText(ownerLabel),
              status,
              progress_percent: toNullableInt(progressPercent) ?? item.progress_percent,
              due_on: toNullableDate(dueOn),
              completed_on: toNullableDate(completedOn),
              notes: toNullableText(notes),
              risk_item_id: item.risk_item_id,
              is_template: isTemplate
            })
          }
        />
        <Button label="Excluir acao" tone="ghost" loading={deleting} onPress={onDelete} />
      </View>
    </Card>
  );
}

function TrainingItemCard({
  item,
  onSave,
  onDelete,
  saving,
  deleting
}: {
  item: Nr1TrainingItem;
  onSave: (payload: Nr1TrainingItemUpdate) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  const [title, setTitle] = React.useState(item.title);
  const [audience, setAudience] = React.useState(item.audience ?? "");
  const [status, setStatus] = React.useState<Nr1TrainingStatus>(item.status);
  const [frequencyDays, setFrequencyDays] = React.useState(item.frequency_days === null ? "" : String(item.frequency_days));
  const [requiredHours, setRequiredHours] = React.useState(item.required_hours === null ? "" : String(item.required_hours));
  const [dueOn, setDueOn] = React.useState(item.due_on ?? "");
  const [completedOn, setCompletedOn] = React.useState(item.completed_on ?? "");
  const [notes, setNotes] = React.useState(item.notes ?? "");
  const [isTemplate, setIsTemplate] = React.useState(item.is_template);

  React.useEffect(() => {
    setTitle(item.title);
    setAudience(item.audience ?? "");
    setStatus(item.status);
    setFrequencyDays(item.frequency_days === null ? "" : String(item.frequency_days));
    setRequiredHours(item.required_hours === null ? "" : String(item.required_hours));
    setDueOn(item.due_on ?? "");
    setCompletedOn(item.completed_on ?? "");
    setNotes(item.notes ?? "");
    setIsTemplate(item.is_template);
  }, [item]);

  const dirty =
    compareText(title, item.title) ||
    compareText(audience, item.audience) ||
    status !== item.status ||
    compareInt(frequencyDays, item.frequency_days) ||
    compareNumber(requiredHours, item.required_hours) ||
    compareDate(dueOn, item.due_on) ||
    compareDate(completedOn, item.completed_on) ||
    compareText(notes, item.notes) ||
    isTemplate !== item.is_template;

  const invalid = frequencyDays.trim().length > 0 && toNullableInt(frequencyDays) === null;

  return (
    <Card>
      <View className="flex-row flex-wrap items-center gap-2">
        <Badge label={statusLabel(item.status)} tone={itemTone(item.status)} />
        {item.is_template ? <Badge label="Modelo inicial" tone="soft" /> : null}
        <Badge label={item.due_on ? `Prazo ${formatDate(item.due_on)}` : "Sem prazo"} tone="info" />
      </View>
      <Field label="Titulo" value={title} onChangeText={setTitle} maxLength={160} />
      <Field label="Publico-alvo" value={audience} onChangeText={setAudience} maxLength={160} />
      <ChoiceChips label="Status" value={status} options={trainingStatusChoices} onChange={setStatus} />
      <Field label="Frequencia (dias)" value={frequencyDays} onChangeText={setFrequencyDays} keyboardType="number-pad" maxLength={4} />
      <Field label="Carga horaria" value={requiredHours} onChangeText={setRequiredHours} keyboardType="decimal-pad" maxLength={6} />
      <Field label="Prazo (YYYY-MM-DD)" value={dueOn} onChangeText={setDueOn} autoCapitalize="none" maxLength={10} />
      <Field
        label="Concluido em (YYYY-MM-DD)"
        value={completedOn}
        onChangeText={setCompletedOn}
        autoCapitalize="none"
        maxLength={10}
      />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline textAlignVertical="top" maxLength={4000} />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isTemplate }}
        onPress={() => setIsTemplate((value) => !value)}
        className={`rounded-2xl border p-4 ${
          isTemplate
            ? "border-primary bg-primary/10"
            : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
        }`}
      >
        <Text className="text-base font-semibold text-ink dark:text-white">
          {isTemplate ? "Template ativado" : "Template desativado"}
        </Text>
        <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
          Frequencia e carga horaria ajudam a manter o ciclo de capacitacao sob controle.
        </Text>
      </Pressable>
      <View className="flex-row flex-wrap gap-2">
        <Button
          label="Salvar treinamento"
          loading={saving}
          disabled={!dirty || invalid}
          onPress={() =>
            onSave({
              title,
              audience: toNullableText(audience),
              status,
              frequency_days: toNullableInt(frequencyDays),
              required_hours: toNullableNumber(requiredHours),
              due_on: toNullableDate(dueOn),
              completed_on: toNullableDate(completedOn),
              notes: toNullableText(notes),
              is_template: isTemplate
            })
          }
        />
        <Button label="Excluir treinamento" tone="ghost" loading={deleting} onPress={onDelete} />
      </View>
    </Card>
  );
}

export default function Nr1WorkspaceScreen() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const canAccess = Boolean(user?.role === "COMPANY" && paidAccess);
  const queryClient = useQueryClient();
  const sessionKey = user?.id ?? "anonymous";
  const workspaceQuery = useQuery({
    queryKey: ["nr1-workspace", sessionKey],
    queryFn: getNr1Workspace,
    enabled: canAccess,
    retry: false,
    staleTime: 30000
  });

  const workspace = workspaceQuery.data?.workspace;
  const summary = workspaceQuery.data?.summary;
  const risks: Nr1RiskItem[] = workspaceQuery.data?.risks ?? [];
  const actions: Nr1ActionItem[] = workspaceQuery.data?.actions ?? [];
  const trainings: Nr1TrainingItem[] = workspaceQuery.data?.trainings ?? [];

  const [organizationName, setOrganizationName] = React.useState("");
  const [unitName, setUnitName] = React.useState("");
  const [groOwnerName, setGroOwnerName] = React.useState("");
  const [scopeStatement, setScopeStatement] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [workspaceStatus, setWorkspaceStatus] = React.useState<Nr1WorkspaceStatus>("DRAFT");

  const [newRiskTitle, setNewRiskTitle] = React.useState("");
  const [newRiskDescription, setNewRiskDescription] = React.useState("");
  const [newRiskCategory, setNewRiskCategory] = React.useState<Nr1RiskCategory>("PSYCHOSOCIAL");
  const [newRiskSource, setNewRiskSource] = React.useState<Nr1RiskSource>("MANUAL");
  const [newRiskStatus, setNewRiskStatus] = React.useState<Nr1RiskStatus>("OPEN");
  const [newRiskSeverity, setNewRiskSeverity] = React.useState("4");
  const [newRiskLikelihood, setNewRiskLikelihood] = React.useState("3");
  const [newRiskOwnerLabel, setNewRiskOwnerLabel] = React.useState("RH e lideranca");
  const [newRiskDueOn, setNewRiskDueOn] = React.useState("");
  const [newRiskNotes, setNewRiskNotes] = React.useState("");
  const [newRiskTemplate, setNewRiskTemplate] = React.useState(false);

  const [newActionTitle, setNewActionTitle] = React.useState("");
  const [newActionDescription, setNewActionDescription] = React.useState("");
  const [newActionOwnerLabel, setNewActionOwnerLabel] = React.useState("Gestao");
  const [newActionStatus, setNewActionStatus] = React.useState<Nr1ActionStatus>("PLANNED");
  const [newActionProgress, setNewActionProgress] = React.useState("0");
  const [newActionDueOn, setNewActionDueOn] = React.useState("");
  const [newActionCompletedOn, setNewActionCompletedOn] = React.useState("");
  const [newActionNotes, setNewActionNotes] = React.useState("");
  const [newActionRiskId, setNewActionRiskId] = React.useState("");
  const [newActionTemplate, setNewActionTemplate] = React.useState(false);

  const [newTrainingTitle, setNewTrainingTitle] = React.useState("");
  const [newTrainingAudience, setNewTrainingAudience] = React.useState("");
  const [newTrainingStatus, setNewTrainingStatus] = React.useState<Nr1TrainingStatus>("PENDING");
  const [newTrainingFrequencyDays, setNewTrainingFrequencyDays] = React.useState("180");
  const [newTrainingRequiredHours, setNewTrainingRequiredHours] = React.useState("2");
  const [newTrainingDueOn, setNewTrainingDueOn] = React.useState("");
  const [newTrainingCompletedOn, setNewTrainingCompletedOn] = React.useState("");
  const [newTrainingNotes, setNewTrainingNotes] = React.useState("");
  const [newTrainingTemplate, setNewTrainingTemplate] = React.useState(false);

  React.useEffect(() => {
    if (!workspace) return;
    setOrganizationName(workspace.organization_name);
    setUnitName(workspace.unit_name ?? "");
    setGroOwnerName(workspace.gro_owner_name ?? "");
    setScopeStatement(workspace.scope_statement ?? "");
    setNotes(workspace.notes ?? "");
    setWorkspaceStatus(workspace.status);
  }, [workspace]);

  const workspaceMutation = useMutation({
    mutationFn: (input: {
      organization_name: string;
      unit_name: string | null;
      gro_owner_name: string | null;
      scope_statement: string | null;
      notes: string | null;
      status: Nr1WorkspaceStatus;
    }) =>
      updateNr1Workspace({
        organization_name: input.organization_name,
        unit_name: input.unit_name,
        gro_owner_name: input.gro_owner_name,
        scope_statement: input.scope_statement,
        notes: input.notes,
        status: input.status
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });

  const riskCreateMutation = useMutation({
    mutationFn: createNr1RiskItem,
    onSuccess: async () => {
      setNewRiskTitle("");
      setNewRiskDescription("");
      setNewRiskNotes("");
      setNewRiskDueOn("");
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const riskUpdateMutation = useMutation({
    mutationFn: ({ riskId, payload }: { riskId: string; payload: Nr1RiskItemUpdate }) => updateNr1RiskItem(riskId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const riskDeleteMutation = useMutation({
    mutationFn: deleteNr1RiskItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });

  const actionCreateMutation = useMutation({
    mutationFn: createNr1ActionItem,
    onSuccess: async () => {
      setNewActionTitle("");
      setNewActionDescription("");
      setNewActionNotes("");
      setNewActionDueOn("");
      setNewActionCompletedOn("");
      setNewActionRiskId("");
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const actionUpdateMutation = useMutation({
    mutationFn: ({ actionId, payload }: { actionId: string; payload: Nr1ActionItemUpdate }) =>
      updateNr1ActionItem(actionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const actionDeleteMutation = useMutation({
    mutationFn: deleteNr1ActionItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });

  const trainingCreateMutation = useMutation({
    mutationFn: createNr1TrainingItem,
    onSuccess: async () => {
      setNewTrainingTitle("");
      setNewTrainingAudience("");
      setNewTrainingNotes("");
      setNewTrainingDueOn("");
      setNewTrainingCompletedOn("");
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const trainingUpdateMutation = useMutation({
    mutationFn: ({ trainingId, payload }: { trainingId: string; payload: Nr1TrainingItemUpdate }) =>
      updateNr1TrainingItem(trainingId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });
  const trainingDeleteMutation = useMutation({
    mutationFn: deleteNr1TrainingItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nr1-workspace", sessionKey] });
    }
  });

  const workspaceDirty =
    compareText(organizationName, workspace?.organization_name) ||
    compareText(unitName, workspace?.unit_name) ||
    compareText(groOwnerName, workspace?.gro_owner_name) ||
    compareText(scopeStatement, workspace?.scope_statement) ||
    compareText(notes, workspace?.notes) ||
    workspaceStatus !== (workspace?.status ?? "DRAFT");

  const canCreateRisk =
    newRiskTitle.trim().length >= 3 &&
    toNullableInt(newRiskSeverity) !== null &&
    toNullableInt(newRiskLikelihood) !== null;
  const canCreateAction = newActionTitle.trim().length >= 3;
  const canCreateTraining = newTrainingTitle.trim().length >= 3;

  if (!canAccess) {
    return (
      <Screen>
        <View style={{ alignItems: "center", gap: 24 }}>
          <PageHero
            kicker="NR-1 / PGR / GRO"
            title="Gestao de riscos psicossociais"
            subtitle="A area de NR-1 exige plano ativo, consentimento e acesso pago."
            orbState="thinking"
          />
          <View style={{ width: "100%", maxWidth: 760, gap: 14 }}>
            <PaidAccessGate user={user} resourceLabel="Workspace NR-1 / PGR / GRO" />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="NR-1 / PGR / GRO"
          title="Workspace de riscos psicossociais"
          subtitle="Edite o plano operacional, acompanhe consentimentos agregados e mantenha o PGR/GRO vivo na pratica."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 980, gap: 16 }}>
          <ErrorText message={workspaceQuery.error?.message} />
          <ErrorText message={workspaceMutation.error?.message} />
          <ErrorText message={riskCreateMutation.error?.message ?? riskUpdateMutation.error?.message ?? riskDeleteMutation.error?.message} />
          <ErrorText message={actionCreateMutation.error?.message ?? actionUpdateMutation.error?.message ?? actionDeleteMutation.error?.message} />
          <ErrorText message={trainingCreateMutation.error?.message ?? trainingUpdateMutation.error?.message ?? trainingDeleteMutation.error?.message} />

          {workspaceQuery.isLoading ? <Loading label="Carregando workspace NR-1..." /> : null}

          {workspace && summary ? (
            <>
              <WorkspaceStatusCard summary={summary} workspace={workspace} />

              <Card>
                <SectionTitle
                  title="Visao executiva"
                  subtitle="Indicadores agregados e status operacional para validar risco, priorizacao e capacitacao."
                />
                <View className="flex-row flex-wrap gap-3">
                  <MetricTile label="Participantes" value={String(summary.participant_count)} />
                  <MetricTile label="Sinais" value={formatMetric(summary.signal_count)} />
                  <MetricTile label="Riscos abertos" value={String(summary.open_risk_count)} />
                  <MetricTile label="Acoes abertas" value={String(summary.open_action_count)} />
                  <MetricTile label="Treinamentos vencidos" value={String(summary.overdue_training_count)} />
                  <MetricTile label="Intensidade media" value={formatMetric(summary.average_intensity)} />
                  <MetricTile label="Ansiedade media" value={formatMetric(summary.average_anxiety)} />
                  <MetricTile label="Estresse medio" value={formatMetric(summary.average_stress)} />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Badge label={`Templates: ${summary.template_count}`} tone="soft" />
                  <Badge label={`Controlados: ${summary.controlled_risk_count}`} tone="success" />
                  <Badge label={`Mitigando: ${summary.mitigating_risk_count}`} tone="info" />
                  <Badge label={`Vencidos: ${summary.overdue_action_count}`} tone="warning" />
                </View>
              </Card>

              <Card>
                <SectionTitle
                  title="Dados do workspace"
                  subtitle="Ajuste o perfil da empresa, o responsavel do GRO e a descricao operacional."
                />
                <Field label="Organizacao" value={organizationName} onChangeText={setOrganizationName} maxLength={160} />
                <Field label="Unidade" value={unitName} onChangeText={setUnitName} maxLength={160} />
                <Field label="Responsavel do GRO" value={groOwnerName} onChangeText={setGroOwnerName} maxLength={160} />
                <Field
                  label="Escopo operacional"
                  value={scopeStatement}
                  onChangeText={setScopeStatement}
                  multiline
                  textAlignVertical="top"
                  maxLength={4000}
                />
                <Field
                  label="Notas internas"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                  maxLength={4000}
                />
                <ChoiceChips
                  label="Status do workspace"
                  value={workspaceStatus}
                  options={workspaceStatusChoices}
                  onChange={setWorkspaceStatus}
                />
                <Button
                  label="Salvar workspace"
                  loading={workspaceMutation.isPending}
                  disabled={!workspaceDirty}
                  onPress={() =>
                    workspaceMutation.mutate({
                      organization_name: organizationName,
                      unit_name: toNullableText(unitName),
                      gro_owner_name: toNullableText(groOwnerName),
                      scope_statement: toNullableText(scopeStatement),
                      notes: toNullableText(notes),
                      status: workspaceStatus
                    })
                  }
                />
              </Card>

              <Card>
                <SectionTitle
                  title="Risco inicial"
                  subtitle="Cadastre e edite riscos psicossociais, organizacionais e operacionais com rastreabilidade."
                />
                <Field label="Titulo" value={newRiskTitle} onChangeText={setNewRiskTitle} maxLength={160} />
                <Field
                  label="Descricao"
                  value={newRiskDescription}
                  onChangeText={setNewRiskDescription}
                  multiline
                  textAlignVertical="top"
                  maxLength={4000}
                />
                <ChoiceChips label="Categoria" value={newRiskCategory} options={riskCategoryChoices} onChange={setNewRiskCategory} />
                <ChoiceChips label="Origem" value={newRiskSource} options={riskSourceChoices} onChange={setNewRiskSource} />
                <ChoiceChips label="Status" value={newRiskStatus} options={riskStatusChoices} onChange={setNewRiskStatus} />
                <Field label="Severidade" value={newRiskSeverity} onChangeText={setNewRiskSeverity} keyboardType="number-pad" maxLength={2} />
                <Field
                  label="Probabilidade"
                  value={newRiskLikelihood}
                  onChangeText={setNewRiskLikelihood}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Field label="Responsavel" value={newRiskOwnerLabel} onChangeText={setNewRiskOwnerLabel} maxLength={160} />
                <Field label="Prazo (YYYY-MM-DD)" value={newRiskDueOn} onChangeText={setNewRiskDueOn} autoCapitalize="none" maxLength={10} />
                <Field label="Notas" value={newRiskNotes} onChangeText={setNewRiskNotes} multiline textAlignVertical="top" maxLength={4000} />
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: newRiskTemplate }}
                  onPress={() => setNewRiskTemplate((value) => !value)}
                  className={`rounded-2xl border p-4 ${
                    newRiskTemplate
                      ? "border-primary bg-primary/10"
                      : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
                  }`}
                >
                  <Text className="text-base font-semibold text-ink dark:text-white">
                    {newRiskTemplate ? "Criar como template" : "Criar como item ativo"}
                  </Text>
                  <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    Templates continuam editaveis e nao substituem trabalho real.
                  </Text>
                </Pressable>
                <Button
                  label="Adicionar risco"
                  loading={riskCreateMutation.isPending}
                  disabled={!canCreateRisk}
                  onPress={() =>
                    riskCreateMutation.mutate({
                      title: newRiskTitle,
                      description: toNullableText(newRiskDescription),
                      category: newRiskCategory,
                      source: newRiskSource,
                      status: newRiskStatus,
                      severity: toNullableInt(newRiskSeverity) ?? 1,
                      likelihood: toNullableInt(newRiskLikelihood) ?? 1,
                      owner_label: toNullableText(newRiskOwnerLabel),
                      due_on: toNullableDate(newRiskDueOn),
                      notes: toNullableText(newRiskNotes),
                      is_template: newRiskTemplate
                    })
                  }
                />
              </Card>

              <View className="gap-3">
                <SectionTitle
                  title="Riscos registrados"
                  subtitle="Cada item pode ser ajustado, concluido, arquivado ou removido."
                />
                {risks.length ? (
                  risks.map((item) => (
                    <RiskItemCard
                      key={item.id}
                      item={item}
                      onSave={(payload) => riskUpdateMutation.mutate({ riskId: item.id, payload })}
                      onDelete={() => riskDeleteMutation.mutate(item.id)}
                      saving={riskUpdateMutation.isPending && riskUpdateMutation.variables?.riskId === item.id}
                      deleting={riskDeleteMutation.isPending && riskDeleteMutation.variables === item.id}
                    />
                  ))
                ) : (
                  <Card>
                    <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">Nenhum risco cadastrado ainda.</Text>
                  </Card>
                )}
              </View>

              <Card>
                <SectionTitle
                  title="Acao do PGR"
                  subtitle="Defina plano, responsavel, progresso e vinculo opcional com um risco especifico."
                />
                <Field label="Titulo" value={newActionTitle} onChangeText={setNewActionTitle} maxLength={160} />
                <Field
                  label="Descricao"
                  value={newActionDescription}
                  onChangeText={setNewActionDescription}
                  multiline
                  textAlignVertical="top"
                  maxLength={4000}
                />
                <Field label="Responsavel" value={newActionOwnerLabel} onChangeText={setNewActionOwnerLabel} maxLength={160} />
                <ChoiceChips
                  label="Status"
                  value={newActionStatus}
                  options={actionStatusChoices}
                  onChange={setNewActionStatus}
                />
                <Field
                  label="Progresso (%)"
                  value={newActionProgress}
                  onChangeText={setNewActionProgress}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Field label="Prazo (YYYY-MM-DD)" value={newActionDueOn} onChangeText={setNewActionDueOn} autoCapitalize="none" maxLength={10} />
                <Field
                  label="Concluido em (YYYY-MM-DD)"
                  value={newActionCompletedOn}
                  onChangeText={setNewActionCompletedOn}
                  autoCapitalize="none"
                  maxLength={10}
                />
                <Field label="ID do risco vinculado" value={newActionRiskId} onChangeText={setNewActionRiskId} maxLength={36} />
                <Field label="Notas" value={newActionNotes} onChangeText={setNewActionNotes} multiline textAlignVertical="top" maxLength={4000} />
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: newActionTemplate }}
                  onPress={() => setNewActionTemplate((value) => !value)}
                  className={`rounded-2xl border p-4 ${
                    newActionTemplate
                      ? "border-primary bg-primary/10"
                      : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
                  }`}
                >
                  <Text className="text-base font-semibold text-ink dark:text-white">
                    {newActionTemplate ? "Criar como template" : "Criar como item ativo"}
                  </Text>
                  <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    Vincular a um risco e um jeito rapido de conectar PGR com a matriz.
                  </Text>
                </Pressable>
                <Button
                  label="Adicionar acao"
                  loading={actionCreateMutation.isPending}
                  disabled={!canCreateAction}
                  onPress={() =>
                    actionCreateMutation.mutate({
                      title: newActionTitle,
                      description: toNullableText(newActionDescription),
                      owner_label: toNullableText(newActionOwnerLabel),
                      status: newActionStatus,
                      progress_percent: toNullableInt(newActionProgress) ?? 0,
                      due_on: toNullableDate(newActionDueOn),
                      completed_on: toNullableDate(newActionCompletedOn),
                      notes: toNullableText(newActionNotes),
                      risk_item_id: toNullableText(newActionRiskId),
                      is_template: newActionTemplate
                    })
                  }
                />
              </Card>

              <View className="gap-3">
                <SectionTitle
                  title="Acoes e controles"
                  subtitle="Acompanhe as respostas do plano e remova o que nao faz mais sentido."
                />
                {actions.length ? (
                  actions.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      risks={risks}
                      onSave={(payload) => actionUpdateMutation.mutate({ actionId: item.id, payload })}
                      onDelete={() => actionDeleteMutation.mutate(item.id)}
                      saving={actionUpdateMutation.isPending && actionUpdateMutation.variables?.actionId === item.id}
                      deleting={actionDeleteMutation.isPending && actionDeleteMutation.variables === item.id}
                    />
                  ))
                ) : (
                  <Card>
                    <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">Nenhuma acao registrada ainda.</Text>
                  </Card>
                )}
              </View>

              <Card>
                <SectionTitle
                  title="Treinamentos e capacitação"
                  subtitle="Organize ciclos de treinamento, prazos, publico-alvo e carga horaria."
                />
                <Field label="Titulo" value={newTrainingTitle} onChangeText={setNewTrainingTitle} maxLength={160} />
                <Field label="Publico-alvo" value={newTrainingAudience} onChangeText={setNewTrainingAudience} maxLength={160} />
                <ChoiceChips
                  label="Status"
                  value={newTrainingStatus}
                  options={trainingStatusChoices}
                  onChange={setNewTrainingStatus}
                />
                <Field
                  label="Frequencia (dias)"
                  value={newTrainingFrequencyDays}
                  onChangeText={setNewTrainingFrequencyDays}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Field
                  label="Carga horaria"
                  value={newTrainingRequiredHours}
                  onChangeText={setNewTrainingRequiredHours}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
                <Field label="Prazo (YYYY-MM-DD)" value={newTrainingDueOn} onChangeText={setNewTrainingDueOn} autoCapitalize="none" maxLength={10} />
                <Field
                  label="Concluido em (YYYY-MM-DD)"
                  value={newTrainingCompletedOn}
                  onChangeText={setNewTrainingCompletedOn}
                  autoCapitalize="none"
                  maxLength={10}
                />
                <Field
                  label="Notas"
                  value={newTrainingNotes}
                  onChangeText={setNewTrainingNotes}
                  multiline
                  textAlignVertical="top"
                  maxLength={4000}
                />
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: newTrainingTemplate }}
                  onPress={() => setNewTrainingTemplate((value) => !value)}
                  className={`rounded-2xl border p-4 ${
                    newTrainingTemplate
                      ? "border-primary bg-primary/10"
                      : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
                  }`}
                >
                  <Text className="text-base font-semibold text-ink dark:text-white">
                    {newTrainingTemplate ? "Criar como template" : "Criar como item ativo"}
                  </Text>
                  <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    Treinamentos estruturados ajudam a sustentar o PGR no tempo.
                  </Text>
                </Pressable>
                <Button
                  label="Adicionar treinamento"
                  loading={trainingCreateMutation.isPending}
                  disabled={!canCreateTraining}
                  onPress={() =>
                    trainingCreateMutation.mutate({
                      title: newTrainingTitle,
                      audience: toNullableText(newTrainingAudience),
                      status: newTrainingStatus,
                      frequency_days: toNullableInt(newTrainingFrequencyDays),
                      required_hours: toNullableNumber(newTrainingRequiredHours),
                      due_on: toNullableDate(newTrainingDueOn),
                      completed_on: toNullableDate(newTrainingCompletedOn),
                      notes: toNullableText(newTrainingNotes),
                      is_template: newTrainingTemplate
                    })
                  }
                />
              </Card>

              <View className="gap-3">
                <SectionTitle
                  title="Treinamentos"
                  subtitle="Mantenha ciclos de formacao e alertas de vencimento visiveis."
                />
                {trainings.length ? (
                  trainings.map((item) => (
                    <TrainingItemCard
                      key={item.id}
                      item={item}
                      onSave={(payload) => trainingUpdateMutation.mutate({ trainingId: item.id, payload })}
                      onDelete={() => trainingDeleteMutation.mutate(item.id)}
                      saving={trainingUpdateMutation.isPending && trainingUpdateMutation.variables?.trainingId === item.id}
                      deleting={trainingDeleteMutation.isPending && trainingDeleteMutation.variables === item.id}
                    />
                  ))
                ) : (
                  <Card>
                    <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">Nenhum treinamento registrado ainda.</Text>
                  </Card>
                )}
              </View>
            </>
          ) : workspaceQuery.isLoading ? null : (
            <Card>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                O workspace NR-1 aparece assim que a conta empresarial estiver ativa e com acesso pago.
              </Text>
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
