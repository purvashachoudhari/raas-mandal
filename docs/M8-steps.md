# M8 — More steps and formations (PRD addendum)

**Status:** Draft · 13 Oct 2026
**Merge into:** `docs/PRD.md` section **5.9 Steps** (extend the tables), milestone **M8** in section 13, and new items in section 14.
**Build after:** M7 (outfits) is finished and checked.

## Summary

Add four traditional steps and two whole-circle formation moves to the step library. Everything follows the existing rules from §5.9 and §8: poses are pure functions of `(step, beatPosInStep, dancerIndex)`, all motion is driven by the beat clock, step changes snap to downbeats, and steps blend over the first quarter-beat.

## Panel change

The step library splits into two groups in the Steps section:
- **Steps** (સ્ટેપ્સ): the six existing steps plus the four new ones.
- **Formations** (રચના): the two new whole-circle moves.

Both groups add into the **same sequence**, so a formation can sit between steps (for example Be Taali 2 bars → Into the centre & out → Dodhiyu 4 bars).

## New steps (P0)

| Step | Gujarati | Length unit | Travel factor | Motion (seen from above) |
|---|---|---|---|---|
| **Popatiyu** | પોપટિયું | 1 bar | 0.5 | Playful "parrot" step. Beats 1–2: dancers dip low (body scales down slightly, ghagra spreads wider as they crouch), arms forward and low. Beats 3–4: two quick bobs with low claps close to the ground, then rise on the next downbeat. Small side-to-side head tilt on each bob. |
| **Sanedo** | સનેડો | 1 bar | 1.0 | Bouncy Kutchi folk step. A bounce on every beat; arms swing together to one side and then the other on alternate beats; a quick shoulder shake (small rapid sway) on each off-beat. |
| **Hudo** | હુડો | 1 bar | 0.5 | Partner clapping step. Dancers pair up with their neighbour (even/odd index) and turn to face each other, as in Dandiya. Beats 1 and 3: each dancer claps their own hands. Beats 2 and 4: partners clap each other's palms, hands meeting in the space between them with a clap spark there. Partners switch sides every 2 bars. |
| **Tippani** | ટિપ્પણી | 1 bar | 0.6 | Traditional Saurashtra step with a tippani: a long stick with a small wooden block at the end. Each dancer holds it in both hands and strikes the ground just in front of them on every beat, bending forward on the strike. Each strike shows a small dust ring at the block. The stick is a new prop (wood colour with an accent band). |

Notes:
- Hudo and Partner swap need an even dancer count per circle, which the layout already guarantees (§5.3).
- Tippani's stick replaces dandiya sticks when the step is active and disappears when it ends, using the same prop logic as Dandiya.

## New formations (P0)

| Formation | Gujarati | Length | Travel factor | Motion |
|---|---|---|---|---|
| **Into the centre & out** | અંદર-બહાર | 2 bars | 0.2 | Beats 1–4: every circle steps inward toward the centrepiece while arms rise, with a big shared clap on beat 4. Beats 5–8: everyone steps back out to their normal radius, arms lowering. Inner circles move less than outer circles so no dancer overlaps the centrepiece or another circle; keep at least half a dancer's width between circles at the closest point. |
| **Partner swap** | જોડી બદલો | 1 bar | 0.8 | Dancers pair with their neighbour (even/odd index). Over beats 1–3 each pair orbits around the point between them, half a turn, so they end in each other's place; a clap on beat 4. Positions **stay swapped** afterwards (the circle keeps a swap offset), so with **Alternate** arrangement men and women trade places around the circle. |

## Auto choreography update (§5.9, P1)

Extend the energy mapping:
- Low energy: Hinch, Be Taali, Popatiyu
- Medium energy: Tran Taali, Hudo, Tippani
- High energy: Dodhiyu, Sanedo, Dandiya
- Section changes: Fudardi or **Into the centre & out**
- End of a long phrase (every 8 bars in one energy level): **Partner swap**

## Data model change

```ts
type StepId =
  | "beTaali" | "tranTaali" | "dodhiyu" | "hinch" | "fudardi" | "dandiya"
  | "popatiyu" | "sanedo" | "hudo" | "tippani"
  | "centreInOut" | "partnerSwap";

interface StepDef {
  id: StepId;
  group: "step" | "formation";
  gu: string; en: string;
  unitBeats: number;     // 2, 4 or 8
  travel: number;        // circle speed factor
  pairs?: boolean;       // Dandiya, Hudo, Partner swap
  prop?: "dandiya" | "tippani";
}
```

Circles gain a persistent `swapOffset` used by Partner swap.

## Acceptance

- [ ] Steps section shows Steps and Formations groups; both add into one sequence
- [ ] Popatiyu, Sanedo, Hudo and Tippani are each clearly recognisable at 3 and 5 circles
- [ ] Hudo partner claps land between the partners on beats 2 and 4
- [ ] Tippani sticks strike the ground on every beat and the dust ring shows at the strike
- [ ] Into the centre & out never overlaps the centrepiece or neighbouring circles at 5 circles
- [ ] Partner swap leaves dancers in their new places; with Alternate, men and women trade places
- [ ] All new moves stay in time with the beat after scrubbing
- [ ] Auto choreography uses the new steps and formations
- [ ] Still 60 fps at 5 circles with all decorations and outfits on
