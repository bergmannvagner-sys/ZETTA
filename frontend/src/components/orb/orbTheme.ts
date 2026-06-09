import { OrbState } from "@/components/orb/orbTypes";

export const orbStateOrder: OrbState[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "breathing",
  "calm",
  "sos",
  "crisis",
  "low_energy",
  "error",
  "silent_presence"
];

export const orbStateIndex: Record<OrbState, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
  breathing: 4,
  calm: 5,
  sos: 6,
  crisis: 7,
  low_energy: 8,
  error: 9,
  silent_presence: 10
};

export const orbPalette = {
  shell: ["#8B5CF6", "#7C3AED", "#A855F7", "#C084FC", "#6D28D9", "#8B5CF6", "#9333EA", "#7E22CE", "#7C3AED", "#A855F7", "#C4B5FD"],
  core: ["#FFFFFF", "#F5F3FF", "#F3E8FF", "#FAF5FF", "#EEF2FF", "#F8FAFC", "#F3E8FF", "#F5F3FF", "#F8FAFC", "#F3E8FF", "#F5F3FF"],
  halo: ["#EDE9FE", "#DDD6FE", "#E9D5FF", "#F3E8FF", "#C7D2FE", "#EDE9FE", "#E9D5FF", "#DDD6FE", "#E2E8F0", "#E9D5FF", "#DDD6FE"],
  wave: ["#8B5CF6", "#7C3AED", "#A855F7", "#C084FC", "#6366F1", "#8B5CF6", "#A855F7", "#7E22CE", "#7C3AED", "#9333EA", "#A78BFA"],
  surface: "#FAFAFC"
};

export const orbAccessibilityLabels: Record<OrbState, string> = {
  idle: "Bergmann em repouso, respirando suavemente",
  listening: "Bergmann ouvindo com atenção",
  thinking: "Bergmann pensando com calma",
  speaking: "Bergmann respondendo",
  breathing: "Bergmann guiando respiração lenta",
  calm: "Bergmann em modo calmo",
  sos: "Bergmann em SOS com estímulo reduzido",
  crisis: "Bergmann em modo de crise, com estímulo reduzido",
  low_energy: "Bergmann em modo de baixa energia",
  error: "Bergmann sinalizando falha discreta",
  silent_presence: "Bergmann em presença silenciosa"
};

export const orbAccessibilityLabelKeys: Record<OrbState, string> = {
  idle: "orb.idle",
  listening: "orb.listening",
  thinking: "orb.thinking",
  speaking: "orb.speaking",
  breathing: "orb.breathing",
  calm: "orb.calm",
  sos: "orb.sos",
  crisis: "orb.crisis",
  low_energy: "orb.lowEnergy",
  error: "orb.error",
  silent_presence: "orb.silentPresence"
};
