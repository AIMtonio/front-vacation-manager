import type { Architect } from "./types";

const PALETTE = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c",
  "#0891b2", "#db2777", "#65a30d", "#ca8a04", "#4f46e5",
  "#0d9488", "#be123c", "#7c3aed", "#b45309", "#0369a1",
];

/** Devuelve el color del arquitecto, o uno de la paleta según su posición. */
export function architectColor(architect: Architect, index: number): string {
  return architect.color ?? PALETTE[index % PALETTE.length];
}
