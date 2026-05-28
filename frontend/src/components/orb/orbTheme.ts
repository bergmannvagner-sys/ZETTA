import { OrbState } from "@/components/orb/orbTypes";

export const orbStateOrder: OrbState[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
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
  crisis: 4,
  low_energy: 5,
  error: 6,
  silent_presence: 7
};

export const orbPalette = {
  shell: ["#0D47FF", "#00E5FF", "#8A28E2", "#5A7BFF", "#435B9B", "#263B69", "#6A58B7", "#203D78"],
  core: ["#F2F7FF", "#E7FCFF", "#F3D7FF", "#D8F6FF", "#C6D2F4", "#8EA4D2", "#E5D7FF", "#B8CFFF"],
  halo: ["#132B86", "#064D69", "#36115E", "#193787", "#1C2A58", "#13243F", "#34235F", "#12294E"],
  wave: ["#00E5FF", "#00E5FF", "#FF4DFF", "#8A28E2", "#7B8FDD", "#526993", "#B89BFF", "#6F8FE8"],
  surface: "#0A0F1F"
};

export const orbAccessibilityLabels: Record<OrbState, string> = {
  idle: "Bergmann em repouso, respirando suavemente",
  listening: "Bergmann ouvindo com atencao",
  thinking: "Bergmann pensando com calma",
  speaking: "Bergmann respondendo",
  crisis: "Bergmann em modo de crise, com estimulo reduzido",
  low_energy: "Bergmann em modo de baixa energia",
  error: "Bergmann sinalizando falha discreta",
  silent_presence: "Bergmann em presenca silenciosa"
};
