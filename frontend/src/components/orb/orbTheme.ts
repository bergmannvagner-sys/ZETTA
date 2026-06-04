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
  shell: ["#4D46AA", "#5DD5E8", "#8064F5", "#6E82F0", "#343C6A", "#293250", "#6757A8", "#314174"],
  core: ["#D4D9FF", "#E5FBFF", "#E4D3FF", "#D9F3FF", "#8E98BD", "#A0ACC9", "#DDCCFF", "#B9C8F4"],
  halo: ["#171F4A", "#123B55", "#2A1D55", "#1A285E", "#111A35", "#10172B", "#241F4B", "#132549"],
  wave: ["#8B82FF", "#6FE7F5", "#B9A7FF", "#85DBF0", "#7F88B4", "#6E789B", "#C7B5FF", "#7F9BEA"],
  surface: "#070B18"
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
