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
  shell: ["#4DA3FF", "#0EA5A4", "#3B82F6", "#EC4899", "#14B8A6", "#7C6CFF", "#F59E0B", "#EF4444", "#84CC16", "#F43F5E", "#8B5CF6"],
  core: ["#F5FAFF", "#ECFEFF", "#EFF6FF", "#FFF1F7", "#F0FDFA", "#FAF5FF", "#FFFBEB", "#FEF2F2", "#F7FEE7", "#FFF1F2", "#EEF2FF"],
  halo: ["#B9DBFF", "#A5F3FC", "#BFDBFE", "#FBCFE8", "#99F6E4", "#E9D5FF", "#FDE68A", "#FCA5A5", "#D9F99D", "#FDA4AF", "#C7D2FE"],
  wave: ["#7CC4FF", "#2DD4BF", "#60A5FA", "#F472B6", "#14B8A6", "#A78BFA", "#F97316", "#FB7185", "#84CC16", "#FB7185", "#A78BFA"],
  surface: "#050816"
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
