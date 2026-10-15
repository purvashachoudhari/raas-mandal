export type NightNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PrintId = "bandhani" | "patola" | "ajrakh" | "abhla";
export type Gender = "women" | "men" | "alternate";
export type Direction = "cw" | "ccw";
export type StepId =
  | "beTaali" | "tranTaali" | "dodhiyu" | "hinch" | "fudardi" | "dandiya"
  | "popatiyu" | "sanedo" | "hudo" | "tippani" | "walk" | "handFlow"
  | "centreInOut" | "partnerSwap";
export type CentreId = "garbo" | "jyot" | "mataji" | "mandvi" | "pillar" | "dhol" | "rangoli";
export type DecorId = "diyas" | "garland" | "lights" | "rangoliBorder";

export interface Circle {
  arrangement: Gender;
  direction: Direction;
}

export interface SequenceItem {
  step: StepId;
  bars: number;
}

export interface Scene {
  night: NightNumber;
  print: PrintId;
  circles: Circle[]; // 1–5, inner to outer
  centre: CentreId;
  betweenDecor: DecorId[];
  sequence: SequenceItem[];
  songId: string | null;
}
