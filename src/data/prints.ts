import type { PrintId } from "../state/types";

export interface PrintDef {
  id: PrintId;
  gu: string;
  en: string;
  origin: string;
}

export const PRINTS: readonly PrintDef[] = [
  { id: "bandhani", gu: "બાંધણી", en: "Bandhani", origin: "Kutch, Jamnagar" },
  { id: "patola", gu: "પટોળું", en: "Patola", origin: "Patan" },
  { id: "ajrakh", gu: "અજરખ", en: "Ajrakh", origin: "Kutch" },
  { id: "abhla", gu: "આભલા ભરત", en: "Abhla bharat", origin: "Kutch" },
];

export const PRINT_IDS = PRINTS.map((p) => p.id);
