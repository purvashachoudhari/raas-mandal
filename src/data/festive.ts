import type { CentreId, DecorId } from "../state/types";

export interface FestiveDef<Id> {
  id: Id;
  gu: string;
  en: string;
}

export const CENTRES: readonly FestiveDef<CentreId>[] = [
  { id: "garbo", gu: "ગરબો", en: "Garbo" },
  { id: "jyot", gu: "જ્યોત", en: "Akhand jyot" },
  { id: "mataji", gu: "માતાજી", en: "Mataji" },
  { id: "mandvi", gu: "માંડવી", en: "Mandvi" },
  { id: "pillar", gu: "થાંભલો", en: "Light pillar" },
  { id: "dhol", gu: "ઢોલ", en: "Dhol stage" },
  { id: "rangoli", gu: "રંગોળી", en: "Rangoli" },
];

// Between-circle decor (P1, drawn from M5).
export const DECORS: readonly FestiveDef<DecorId>[] = [
  { id: "diyas", gu: "દીવા", en: "Row of diyas" },
  { id: "garland", gu: "તોરણ", en: "Marigold garland" },
  { id: "lights", gu: "લાઇટ", en: "String lights" },
  { id: "rangoliBorder", gu: "રંગોળી", en: "Rangoli border" },
];

export const CENTRE_IDS = CENTRES.map((c) => c.id);
export const DECOR_IDS = DECORS.map((d) => d.id);
