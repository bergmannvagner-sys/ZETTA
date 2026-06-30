import { EmotionLog, EmotionalReport, JournalEntry } from "@/lib/emotional";

export type ZettaIndexStatus = "stable" | "attention" | "delicate" | "unknown";

export type ZettaMindSnapshot = {
  emotionalIndex: number | null;
  stabilityIndex: number | null;
  wellnessIndex: number | null;
  riskIndex: number | null;
  status: ZettaIndexStatus;
  headline: string;
  insights: string[];
  voiceEmotionalIndex: number | null;
  emotionalStabilityIndex: number | null;
  vocalFatigueIndex: number | null;
  disclaimer: string;
};

const DELICATE_TERMS = [
  "ansiedade",
  "ansioso",
  "ansiosa",
  "panico",
  "pânico",
  "crise",
  "exausto",
  "exausta",
  "esgotado",
  "esgotada",
  "desesperanca",
  "desesperança",
  "sem saida",
  "sem saída",
  "quero morrer",
  "me matar",
  "suicidio",
  "suicídio"
];

const POSITIVE_TERMS = ["calmo", "calma", "alivio", "alívio", "bem", "esperanca", "esperança", "grato", "grata", "vitoria", "vitória"];
const NEGATIVE_MOODS = new Set(["ansioso", "ansiosa", "triste", "cansado", "cansada", "irritado", "irritada"]);
const POSITIVE_MOODS = new Set(["calmo", "calma", "bem", "esperançoso", "esperancoso", "hopeful"]);

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (clean.length === 0) {
    return null;
  }
  return clean.reduce((total, value) => total + value, 0) / clean.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function countTerms(entries: JournalEntry[], terms: string[]): number {
  const text = normalizeText(entries.map((entry) => `${entry.content} ${entry.tags.join(" ")}`).join(" "));
  return terms.reduce((count, term) => (text.includes(normalizeText(term)) ? count + 1 : count), 0);
}

function moodAdjustment(logs: EmotionLog[]): number {
  if (logs.length === 0) {
    return 0;
  }
  return logs.reduce((score, log) => {
    const mood = normalizeText(log.mood);
    if (POSITIVE_MOODS.has(mood)) {
      return score + 2.5;
    }
    if (NEGATIVE_MOODS.has(mood)) {
      return score - 3;
    }
    return score;
  }, 0);
}

export function formatZettaIndex(value: number | null): string {
  return typeof value === "number" ? `${value}/100` : "--";
}

export function getZettaStatusLabel(status: ZettaIndexStatus): string {
  if (status === "stable") {
    return "Estável";
  }
  if (status === "attention") {
    return "Atenção";
  }
  if (status === "delicate") {
    return "Delicado";
  }
  return "Sem dados";
}

export function buildZettaMindSnapshot(
  logs: EmotionLog[] = [],
  entries: JournalEntry[] = [],
  report?: EmotionalReport | null
): ZettaMindSnapshot {
  const reportMetadata = report?.metadata ?? {};
  const reportRiskIndex = typeof reportMetadata.risk_index === "number" ? reportMetadata.risk_index : null;
  const reportEmotionalIndex = typeof reportMetadata.emotional_index === "number" ? reportMetadata.emotional_index : null;
  const reportStabilityIndex = typeof reportMetadata.stability_index === "number" ? reportMetadata.stability_index : null;
  const reportWellnessIndex = typeof reportMetadata.wellness_index === "number" ? reportMetadata.wellness_index : null;

  if (logs.length === 0 && entries.length === 0 && !report) {
    return {
      emotionalIndex: null,
      stabilityIndex: null,
      wellnessIndex: null,
      riskIndex: null,
      status: "unknown",
      headline: "Comece com um check-in ou diário.",
      insights: [
        "O ZETTA precisa de alguns registros para mostrar tendências.",
        "Esses indicadores são de bem-estar e não representam diagnóstico."
      ],
      voiceEmotionalIndex: null,
      emotionalStabilityIndex: null,
      vocalFatigueIndex: null,
      disclaimer: "Indicadores de apoio emocional. Não substituem avaliação médica ou psicológica."
    };
  }

  const intensities = logs.map((log) => log.intensity);
  const avgIntensity = average(intensities) ?? 5;
  const avgAnxiety = average(logs.map((log) => log.anxiety)) ?? avgIntensity;
  const avgStress = average(logs.map((log) => log.stress)) ?? avgIntensity;
  const avgEnergy = average(logs.map((log) => log.energy)) ?? 5;
  const avgSleep = average(logs.map((log) => log.sleep_quality)) ?? 5;
  const avgMotivation = average(logs.map((log) => log.motivation)) ?? avgEnergy;
  const volatility = standardDeviation(intensities);
  const delicateSignals = countTerms(entries, DELICATE_TERMS);
  const positiveSignals = countTerms(entries, POSITIVE_TERMS);
  const moodScore = moodAdjustment(logs);

  const calculatedRisk = clamp(avgIntensity * 5.6 + avgAnxiety * 3.2 + avgStress * 3.2 + delicateSignals * 8 - avgEnergy * 1.8 - avgSleep * 1.2 - positiveSignals * 2);
  const riskIndex = reportRiskIndex ?? calculatedRisk;
  const emotionalIndex = reportEmotionalIndex ?? clamp(76 - avgIntensity * 4.8 - avgAnxiety * 2 + positiveSignals * 4 + moodScore);
  const stabilityIndex = reportStabilityIndex ?? clamp(88 - volatility * 11 - Math.max(0, avgStress - 5) * 3 - delicateSignals * 4);
  const wellnessIndex = reportWellnessIndex ?? clamp((emotionalIndex + stabilityIndex + avgEnergy * 7 + avgSleep * 6 + avgMotivation * 5) / 4.1);
  const status: ZettaIndexStatus = riskIndex >= 70 ? "delicate" : riskIndex >= 45 ? "attention" : "stable";
  const headline =
    status === "delicate"
      ? "Sinais pedem cuidado humano e passos pequenos."
      : status === "attention"
        ? "Há sinais para acompanhar com gentileza."
        : "Sinais recentes parecem mais estáveis.";
  const insights = [
    logs.length ? `Registros emocionais analisados: ${logs.length}.` : "Ainda há poucos check-ins emocionais.",
    entries.length ? `Registros de diário analisados: ${entries.length}.` : "O diário ajuda a detectar padrões com mais contexto.",
    status === "delicate"
      ? "Se houver risco imediato, procure ajuda humana, emergência local ou CVV 188 no Brasil."
      : "Use os índices para perceber tendências, não para rotular sua saúde."
  ];

  return {
    emotionalIndex,
    stabilityIndex,
    wellnessIndex,
    riskIndex,
    status,
    headline,
    insights,
    voiceEmotionalIndex: null,
    emotionalStabilityIndex: stabilityIndex,
    vocalFatigueIndex: null,
    disclaimer: "Indicadores de apoio emocional. Não substituem avaliação médica ou psicológica."
  };
}
