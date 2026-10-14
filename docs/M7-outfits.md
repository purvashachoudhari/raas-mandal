# M7 — Outfit customization (PRD addendum)

**Status:** Draft · 13 Oct 2026
**Merge into:** `docs/PRD.md` as section **5.12 Outfits**, plus milestone **M7** in section 13 and new items in section 14.

## Summary

Let the user style the dancers' outfits. One setting applies to **everyone on the ground** (no per-circle outfits). Outfits keep the Navratri colour system from §5.1: the night's colour stays the main colour, with the night's accent as a second colour.

## Panel placement

New panel section **Outfits** (પોશાક) directly after **Prints**, with two tabs: **Women** (સ્ત્રી) and **Men** (પુરુષ). Each option is a row of labelled buttons with a small icon preview. Changes show live in the preview.

## Colour split: 70 / 30 (P0)

- **70% night colour:** the main garment, which is the ghagra for women and the kediyu for men, carrying the selected print (§5.2) and the tonal variants from §5.1.
- **30% night accent:** the pieces that frame the main garment:
  - Women: choli, dupatta, ghagra hem border, parandi tassel or hair ribbon.
  - Men: headwear, kediyu hem border.
- **Neutral:** men's bottoms stay traditional off-white/cream so the kediyu stays the focus. Skin, hair and gajra flowers keep their natural colours.
- Rationale: from the top-down view the ghagra and kediyu fill most of each dancer, so they carry the night colour and print. Accent on the edges (choli, dupatta, borders, headwear) outlines each dancer and keeps the circle from reading as one flat block.
- The second colour is always the night's accent from the §5.1 table; no separate picker in this version.

## Women's options (P0)

### Dupatta (ઓઢણી)
| Option | How it renders from above |
|---|---|
| **Over both shoulders** (default) | A band across both shoulders falling down the back, in accent with a thin border |
| **Covering the head** | Accent fabric over the head, framing the face and falling over the shoulders |
| **Tied at the waist** | A knotted band across the waist with short tails; shoulders clear |
| **Flowing behind** | A long trailing length from one shoulder that lags behind the dancer's motion and swings out on Fudardi spins |

### Hairstyle
| Option | How it renders from above |
|---|---|
| **Braid with parandi** (default) | A long plait behind the head ending in an accent tassel that sways with movement |
| **Bun with gajra** | A round bun ringed with small white flower dots |
| **Open hair with flowers** | Hair fanned around the head with a few small flowers |
| **Side braid with ribbon** | A plait over one shoulder with an accent ribbon |

When the dupatta covers the head, the hairstyle is hidden except for the end of a braid or side braid.

## Men's options (P0)

### Bottoms
| Option | How it renders |
|---|---|
| **Dhoti** (default) | Off-white, fuller at the legs with gathered folds |
| **Churidar** | Off-white, slim legs with small gathers at the ankle |
| **Patiyala** | Off-white, very full and pleated, ballooning at the knee |

### Headwear
| Option | How it renders |
|---|---|
| **Pagdi** (default) | Rounded wrapped turban in accent |
| **Safo** | Looser wrapped turban with a tail hanging down the back that swings with motion |
| **Topi** | Small rounded cap in accent with a thin border |
| **None** | Bare head with hair |

## Animation

- Dupatta tails, safo tails, braids, parandi and ribbons are **secondary motion**: they lag slightly behind the dancer's turns and swing outward on spins. Drive their swing from the same beat clock and pose values (sway, spin) so they stay in sync with the music.
- Keep the extra drawing cheap enough to hold 60 fps at 5 circles (§10).

## Data model change

```ts
interface Outfit {
  women: {
    dupatta: "shoulders" | "head" | "waist" | "flowing";
    hair: "parandi" | "gajraBun" | "openFlowers" | "sideBraidRibbon";
  };
  men: {
    bottoms: "dhoti" | "churidar" | "patiyala";
    headwear: "pagdi" | "safo" | "topi" | "none";
  };
}
// Scene gains: outfit: Outfit
```

Defaults: shoulders, braid with parandi, dhoti, pagdi. Saved with the rest of the scene in localStorage.

## Code organisation

- `src/data/outfits.ts`: option lists, labels (Gujarati + English), defaults.
- `src/stage/outfits/`: one small drawing module per part (dupatta, hair, bottoms, headwear), each taking the dancer's size, colours and pose.
- `src/ui/outfits.ts`: the Outfits panel section with Women/Men tabs.

## Acceptance

- [ ] Outfits section with Women and Men tabs appears after Prints
- [ ] Every option is visibly different at 5 circles
- [ ] Ghagra and kediyu stay in the night colour with the print; choli, dupatta, borders and headwear use the night accent; men's bottoms are off-white
- [ ] Switching nights recolours all outfit parts correctly
- [ ] Dupatta tails, safo tail, braids and ribbons swing on spins and stay in time with the beat
- [ ] Dupatta over the head hides the hair correctly
- [ ] Still 60 fps at 5 circles with all decorations on
- [ ] Outfit settings persist after refresh
