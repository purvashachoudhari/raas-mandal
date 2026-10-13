import type { NightNumber } from "../state/types";
import { bestOn, contrast, mix, tone } from "../util/color";

/** One row of the §5.1 colour table. */
export interface Night {
  n: NightNumber;
  name: string;
  devi: string;
  date: string;
  /** Dancer base colour. */
  wear: string;
  /** Deep complementary background. */
  bg: string;
  bgName: string;
  /** Trims, print motifs and UI highlights. */
  accent: string;
  accentName: string;
  /** Hand-tuned tonal variants where the computed ones don't work. */
  wearLight?: string;
  wearDark?: string;
}

export const NIGHTS: readonly Night[] = [
  { n: 1, name: "Orange", devi: "Shailaputri", date: "Sun 11 Oct", wear: "#F07A1A", bg: "#0E2A47", bgName: "Deep indigo", accent: "#F2C94C", accentName: "Gold" },
  // White can't go lighter, so its variants are ivory and cream instead.
  { n: 2, name: "White", devi: "Brahmacharini", date: "Mon 12 Oct", wear: "#F6F1E6", bg: "#4A0C17", bgName: "Deep maroon", accent: "#E8B92D", accentName: "Gold", wearLight: "#FFFDF8", wearDark: "#E4D8BF" },
  { n: 3, name: "Red", devi: "Chandraghanta", date: "Tue 13 Oct", wear: "#C8102E", bg: "#0B3B33", bgName: "Deep teal", accent: "#F2A51A", accentName: "Marigold" },
  { n: 4, name: "Royal blue", devi: "Kushmanda", date: "Wed 14 Oct", wear: "#2547C4", bg: "#5A2408", bgName: "Burnt umber", accent: "#F2A51A", accentName: "Marigold" },
  { n: 5, name: "Yellow", devi: "Skandamata", date: "Thu 15 Oct", wear: "#F2C315", bg: "#2E1248", bgName: "Deep violet", accent: "#E0307F", accentName: "Rani pink" },
  { n: 6, name: "Green", devi: "Katyayani", date: "Fri 16 Oct", wear: "#2E9A3E", bg: "#4A0E2E", bgName: "Deep magenta-maroon", accent: "#F2C94C", accentName: "Gold" },
  // Grey has no true complement, so Night 7 uses a warm dark ground to keep it festive.
  { n: 7, name: "Grey", devi: "Kalaratri", date: "Sat 17 Oct", wear: "#8D9096", bg: "#3A1F0C", bgName: "Deep saffron-brown", accent: "#D6278A", accentName: "Fuchsia" },
  { n: 8, name: "Purple", devi: "Mahagauri", date: "Sun 18 Oct", wear: "#7B2FA6", bg: "#33330A", bgName: "Deep olive", accent: "#F5B324", accentName: "Mango" },
  { n: 9, name: "Peacock green", devi: "Siddhidatri", date: "Mon 19 Oct", wear: "#0F8F86", bg: "#5A1A12", bgName: "Deep rust", accent: "#E3B23C", accentName: "Gold" },
];

export const nightFor = (n: NightNumber): Night => NIGHTS[n - 1];

/** Every colour the stage and panel use for one night, derived from the table row. */
export interface NightTheme {
  wear: string;
  wearLight: string;
  wearDark: string;
  bg: string;
  /** Lighter centre glow on the stage. */
  glow: string;
  panel: string;
  ink: string;
  accent: string;
  /** Text on accent fills. */
  accentInk: string;
  /** Off-white used for print motifs and trims. */
  cream: string;
}

const INK = "#FBF3E4";
const DARK_INK = "#1A0E08";
const themes = new Map<NightNumber, NightTheme>();

export function themeFor(n: NightNumber): NightTheme {
  const cached = themes.get(n);
  if (cached) return cached;
  const night = nightFor(n);
  const theme: NightTheme = {
    wear: night.wear,
    wearLight: night.wearLight ?? tone(night.wear, 0.1),
    wearDark: night.wearDark ?? tone(night.wear, -0.12),
    bg: night.bg,
    glow: mix(mix(night.bg, night.accent, 0.1), "#FFFFFF", 0.1),
    panel: mix(night.bg, "#000000", 0.3),
    ink: INK,
    accent: night.accent,
    // Prefer the warm dark ink; fall back to black or white where it misses WCAG AA (e.g. rani pink).
    accentInk: contrast(DARK_INK, night.accent) >= 4.5 ? DARK_INK : bestOn(night.accent, "#000000", "#FFFFFF"),
    cream: INK,
  };
  themes.set(n, theme);
  return theme;
}

const FESTIVAL_START = new Date(2026, 9, 11);

/** Tonight's Navratri night by local date, or Night 1 outside the festival. */
export function tonight(now = new Date()): NightNumber {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - FESTIVAL_START.getTime()) / 86_400_000);
  return (diff >= 0 && diff <= 8 ? diff + 1 : 1) as NightNumber;
}
