# Raas Mandal — Product Requirements Document

**Status:** Draft v1.0 · 13 Oct 2026
**Owner:** Purvasha Choudhari
**Build:** Solo, vibe-coded in VS Code with Claude Code
**Reference prototype:** `raas-mandal.html` (single-file v0 built in Claude)

---

## 1. Summary

Raas Mandal (રાસ મંડળ) is a laptop web app for people who are away from home during Navratri. You build your own garba ground: pick the Navratri night, dress the dancers in that night's colour and a Gujarati print, choose how many circles dance and which way they move, set what sits in the centre, choose a song from your own music files, and arrange the steps. Press play and the circles dance to the song, with every clap, hop and spin landing on the song's real beats through automatic beat detection.

## 2. Goals and non-goals

### Goals
1. Feel like a real garba night: authentic colours, prints, steps and festive elements.
2. Dancers move on the actual beat of any song file the user adds, without manual tapping.
3. A clean, modular codebase where the scene settings, the renderer, the audio engine and the beat analysis are independent.
4. Runs entirely in the browser. No backend, no accounts.

### Non-goals (this version)
- Phone or tablet layouts.
- Streaming music (YouTube, Spotify).
- Accounts, cloud saving, multiplayer or shared live rooms.
- Angled 2.5D or 3D views (the renderer must make these possible later, see §9).
- Per-circle step sequences.

## 3. Users and context

- **Primary user:** the owner, a Gujarati/Indian student abroad missing garba, using a laptop in a dorm or apartment.
- **Secondary users:** friends and family who open the deployed site on their laptops and add their own music files.
- **Usage moment:** evenings during the nine nights; often on a large screen or projected, with music on speakers.

## 4. Experience overview

Two modes:

1. **Build mode.** Left panel of controls, live preview of the garba ground on the right. Every change shows immediately in the preview.
2. **Play mode.** The ground goes full screen, the selected song plays, and the dancers follow the beat. A translucent control panel docked on the left shows the current step and song progress, and fades away while you watch.

**Primary flow**
1. Open the app. It opens on tonight's Navratri night (by date), or Night 1 outside the festival.
2. Adjust the scene top to bottom in the left panel (order in §5).
3. Select a song. Beat analysis runs once (progress shown), then the song is marked ready.
4. Press **Play garba**. Full-screen dance begins on the first downbeat.
5. Press Esc or **Back to build** to return. All settings persist on reload.

---

## 5. Functional requirements

The left panel follows this order, top to bottom. Priorities: **P0** must ship, **P1** should ship, **P2** later.

### 5.1 Night colours (P0)

- Nine swatches for the nine nights, showing night number and colour name; selected night shows its devi and date.
- **Dancers wear the night's colour.** The **background is a deep complementary colour** so the dancers stand out.
- Each night defines: dancer base colour, two tonal variants (lighter and darker) so a full circle doesn't read as a flat block, an accent for trims, prints and UI highlights, and a background with a lighter centre glow.
- The UI panel, buttons and text are themed from the same tokens.

**2026 colour table** (starting values; tune visually during M2)

| Night | Date | Devi | Dancer colour | Background (complement) | Accent |
|---|---|---|---|---|---|
| 1 | Sun 11 Oct | Shailaputri | Orange `#F07A1A` | Deep indigo `#0E2A47` | Gold `#F2C94C` |
| 2 | Mon 12 Oct | Brahmacharini | White `#F6F1E6` | Deep maroon `#4A0C17` | Gold `#E8B92D` |
| 3 | Tue 13 Oct | Chandraghanta | Red `#C8102E` | Deep teal `#0B3B33` | Marigold `#F2A51A` |
| 4 | Wed 14 Oct | Kushmanda | Royal blue `#2547C4` | Burnt umber `#5A2408` | Marigold `#F2A51A` |
| 5 | Thu 15 Oct | Skandamata | Yellow `#F2C315` | Deep violet `#2E1248` | Rani pink `#E0307F` |
| 6 | Fri 16 Oct | Katyayani | Green `#2E9A3E` | Deep magenta-maroon `#4A0E2E` | Gold `#F2C94C` |
| 7 | Sat 17 Oct | Kalaratri | Grey `#8D9096` | Deep saffron-brown `#3A1F0C` | Fuchsia `#D6278A` |
| 8 | Sun 18 Oct | Mahagauri | Purple `#7B2FA6` | Deep olive `#33330A` | Mango `#F5B324` |
| 9 | Mon 19 Oct | Siddhidatri | Peacock green `#0F8F86` | Deep rust `#5A1A12` | Gold `#E3B23C` |

Grey has no true complement, so Night 7 uses a warm dark ground to keep it festive.

**Acceptance:** switching nights recolours dancers, background, panel and accents within one frame; text contrast in the panel meets WCAG AA on all nine nights.

### 5.2 Prints (P0)

One print applies to **all dancers, men and women alike**. Prints render in the night's colour with the accent and off-white as the motif colours.

| Print | Origin | How it renders |
|---|---|---|
| **Bandhani** (બાંધણી) | Kutch, Jamnagar | Tie-dye dot clusters (four dots around a darker centre) in an offset grid |
| **Patola** (પટોળું) | Patan | Double-ikat diamond lattice with slightly feathered edges, small diamond motifs inside |
| **Ajrakh** (અજરખ) | Kutch | Block-print star-and-trellis repeat with a dark resist outline |
| **Abhla bharat** (આભલા ભરત) | Kutch | Embroidered border bands with small round mirrors that glint on the beat |

- Garments: women wear chaniya choli with a flared ghagra and dupatta; men wear a flared kediyu with churidar and pagdi. The print covers the ghagra and kediyu; trims, choli and pagdi use the accent.
- Each print is a procedural pattern tile generated in code (no image assets), cached per print × colour × scale.
- **Acceptance:** each print is recognisable at the smallest dancer size (5 circles); switching prints updates all dancers immediately.

### 5.3 Number of circles (P0)

- Stepper, 1 to 5 circles.
- Dancers per circle fill automatically by circumference: inner circles get fewer, outer more; always an even count (needed for Alternate and Dandiya pairs).
- Circle spacing and dancer size scale so the whole ground fits the stage.

### 5.4 Direction (P0)

- Each circle: **Anticlockwise** or **Clockwise**. Garba traditionally moves anticlockwise, so that is the default for the inner circle; new circles alternate.
- A **Set all** shortcut applies one direction to every circle.
- Direction changes ease over ~0.5 s rather than snapping.

### 5.5 Arrangement (P0)

- Each circle: **Women**, **Men** or **Alternate** (woman, man, woman…).
- A **Set all** shortcut as in 5.4.

### 5.6 Festive elements (P0 centre, P1 between circles)

**Centre (choose one):**
- **Garbo:** perforated earthen pot with a diya inside; holes glow and pulse on the beat.
- **Akhand jyot:** brass lamp with a flickering flame.
- **Mataji's shrine:** decorated arch with red chunari, trishul and a diya (abstract, no depiction of the deity's face).
- **Mandvi:** carved wooden canopy seen from above.
- **Decorated pillar:** centre pole with toran strings and marigold lights running to the edge.
- **Dhol stage:** two dhol drums whose sticks strike on the beat.
- **Rangoli:** layered petal mandala in the night's palette, slowly rotating.

**Between circles (toggle any, P1):** a row of diyas, a marigold garland ring, string lights that chase on the beat, or a rangoli border. Drawn in the gaps between circles without overlapping dancers.

### 5.7 Music (P0)

- Songs live as audio files in the project's `music/` folder (`.mp3`, `.m4a`, `.wav`, `.ogg`).
- `npm run music` scans the folder and writes `music/manifest.json` (title from file tags or filename, duration).
- The app also accepts files by **drag and drop** or a file picker at runtime, so the deployed site works with anyone's own songs.
- Song list shows title, duration, and analysis status: *Not analysed*, *Analysing 40%*, *Ready · 132 bpm*, or *Couldn't analyse*.
- Selecting a song starts analysis if needed. Only one song is active at a time.
- Playback: preview controls in Build mode (play/pause, scrub); full playback in Play mode.
- No synth dhol is required in this version; the prototype's synth may remain as a fallback when no song is selected (P2).

### 5.8 Automatic beat matching (P0)

When a song is selected the app detects its beats, downbeats and tempo changes, and the dancers follow them. Full spec in §8.

- Runs in a Web Worker so the UI stays responsive; shows progress.
- Results cached per file, so a song is analysed once.
- Handles garba's usual **speed-up within a song** (tempo curve, not one fixed BPM).
- Manual corrections available but optional: nudge the beat earlier/later (±10 ms steps), halve or double the tempo, and **Tap to correct** (tap 8 beats to re-fit the phase).
- **Acceptance:** on the test set (§12), at least 90% of detected beats fall within ±70 ms of hand-marked beats, and step changes land on downbeats.

### 5.9 Steps (P0)

A preset library of six steps. The user arranges them into one sequence that every circle performs together; the sequence loops for the length of the song.

| Step | Gujarati | Feel | Length unit | Motion |
|---|---|---|---|---|
| Be Taali | બે તાળી | Two claps | 1 bar (4 beats) | Step and turn, two claps on beats 3 and 4, gentle sway |
| Tran Taali | ત્રણ તાળી | Three claps | 1 bar | Step back and in, three quick claps |
| Dodhiyu | દોઢિયું | Fast hop | 1 bar | Hop every beat, alternating in/out, arms open and close; circle travels fastest |
| Hinch | હીંચ | 6/8 sway | 2 beats | Hip-pivot sway left/right, slow travel, one clap per cycle |
| Fudardi | ફુદરડી | Spin | 2 beats | Full turn every 2 beats, ghagra flares wide |
| Dandiya | દાંડિયા | Pairs | 1 bar | Partners face each other, sticks clack on the off-beats, partners swap every bar |

- Sequence editor: add from library, reorder, remove, set length in bars (1 to 16).
- Default sequence: Be Taali 2 bars → Tran Taali 2 → Hinch 2 → Dodhiyu 4 → Fudardi 1 → Dandiya 2.
- **Auto choreography (P1):** picks steps from the song's energy curve: calm sections get Hinch and Be Taali, high-energy sections Dodhiyu and Dandiya, a Fudardi at section changes.
- Steps blend into each other over the first quarter-beat to avoid pops.

### 5.10 Play mode (P0)

- Full-screen stage (Fullscreen API, with graceful fallback).
- **Ground fit:** the whole garba ground, including the outer edge lights, fits inside the screen with a 4% margin (of the screen's shorter side) on every side, centred both ways. It is sized to the full screen, not reduced by the controls, and recalculated on window resize and when entering or leaving full screen. Nothing is clipped at 1280×720, 1440×900 or 1920×1080.
- **Control panel:** a vertical panel about 240 px wide, docked on the left with a translucent background, overlaying the stage. Top to bottom:
  1. Current step (Gujarati large, English small).
  2. Sequence progress as stacked segments, one per step, each filling as it is danced; the current step is highlighted.
  3. Song title and time (elapsed / total).
  4. Song scrubber.
  5. Restart, play/pause, **Back to build**.
- Keyboard: Space play/pause, ←/→ seek 5 s, R restart, F fullscreen, Esc exit.
- **Auto-hide:** the panel fades out after 3 s without mouse movement and fades back on mouse movement or any key press. The mouse cursor is hidden while the panel is hidden. The panel overlays the stage, so the ground never moves when it appears or disappears.

### 5.11 Persistence (P0)

- Scene settings (night, print, circles, directions, arrangements, festive elements, sequence, last song) saved to `localStorage` on every change.
- Beat analysis results saved in IndexedDB, keyed by a hash of the file.
- No accounts, no server.

---

## 6. Visual design

- **Look:** flat folk-art illustration seen from above. Dancers face the centre, heads outward, arms raised.
- **Typography:** Baloo Bhai 2 (display, Gujarati and Latin) and Hind Vadodara (body). Gujarati title first, English subtitle second throughout.
- **Panel:** 400 px fixed left column, section headers in Gujarati + English small caps, themed from the night tokens.
- **Stage:** background colour with a soft centre glow, faint guide circles, a ring of edge lights that chase on the beat.
- **Motion:** everything that pulses (garbo holes, lights, clap sparks, mirror glints) is driven by the beat clock, never by wall-clock timers.
- **Laptop only:** designed for 1280×720 and up. Below 1024 px wide, show a friendly "Open Raas Mandal on a laptop" screen.

## 7. Technical architecture

**Stack:** Vite + TypeScript, Canvas 2D, Web Audio API, Web Workers, IndexedDB (via `idb-keyval`). No UI framework; small DOM modules per panel section. Deployed to GitHub Pages via a GitHub Actions workflow.

```
raas-mandal/
├── index.html
├── docs/PRD.md
├── music/                    # local songs (git-ignored) + manifest.json
├── scripts/build-manifest.ts # npm run music
└── src/
    ├── main.ts               # boot, mode switching
    ├── state/
    │   ├── store.ts          # scene state, subscribe/notify, persistence
    │   └── types.ts
    ├── data/
    │   ├── nights.ts         # §5.1 table
    │   ├── prints.ts         # print metadata
    │   ├── steps.ts          # §5.9 table
    │   └── festive.ts        # centre + between-circle elements
    ├── ui/                   # one module per panel section + Play mode panel
    ├── stage/
    │   ├── renderer.ts       # frame loop, layout, draw order
    │   ├── layout.ts         # ring radii, dancer counts, sizes
    │   ├── dancers.ts        # woman/man drawing
    │   ├── poses.ts          # pose(step, beatPos, dancerIndex)
    │   ├── patterns/         # bandhani.ts, patola.ts, ajrakh.ts, abhla.ts
    │   └── festive/          # centrepieces and between-circle decor
    ├── audio/
    │   ├── library.ts        # manifest + drag-drop files
    │   ├── player.ts         # decode, play, seek, clock
    │   └── beatClock.ts      # audio time → beat position
    ├── analysis/
    │   ├── worker.ts         # runs the pipeline off the main thread
    │   ├── onset.ts
    │   ├── tempo.ts
    │   ├── beatTrack.ts
    │   └── cache.ts
    └── styles/               # tokens.css, panel.css, stage.css, play.css
```

**Key data types**

```ts
type Gender = "women" | "men" | "alternate";
type Direction = "cw" | "ccw";
interface Circle { arrangement: Gender; direction: Direction }
interface SequenceItem { step: StepId; bars: number }
interface Scene {
  night: 1|2|3|4|5|6|7|8|9;
  print: "bandhani" | "patola" | "ajrakh" | "abhla";
  circles: Circle[];                 // 1–5
  centre: CentreId;
  betweenDecor: DecorId[];
  sequence: SequenceItem[];
  choreography: "manual" | "auto";
  songId: string | null;
}
interface BeatMap {
  beats: number[];        // seconds
  downbeats: number[];    // seconds
  tempoCurve: { t: number; bpm: number }[];
  bpm: number;            // median
  confidence: number;     // 0–1
  energy: number[];       // per-beat loudness, for auto choreography
  version: number;        // bump to invalidate cache
}
```

**Module rules**
- The renderer only reads `Scene`, `BeatMap` and the current beat position. It never touches the DOM panel or audio directly.
- `pose()` is a pure function of `(step, beatPosInStep, dancerIndex)`, so swapping in a 2.5D renderer later reuses all choreography.
- One clock: the audio playback position. Animation never runs on its own timer while a song plays.

## 8. Beat-matching specification

Runs once per song in a Web Worker.

1. **Decode and prepare:** decode with `AudioContext.decodeAudioData`, mix to mono, resample to 22,050 Hz.
2. **Onset strength:** STFT (window 1024, hop 256 ≈ 11.6 ms), 40-band mel log-magnitude, half-wave-rectified spectral flux summed across bands. Also keep a separate low-band (< 150 Hz) flux to capture the dhol's bass stroke.
3. **Tempo curve:** autocorrelation of the onset envelope over 8 s windows with a 2 s hop, searching 70–200 BPM with a log-Gaussian prior centred near 120 BPM. Resolve octave errors by scoring T, 2T, T/2 and 2T/3 candidates (garba often has a 6/8 feel). Smooth the curve so it can rise steadily, since garba songs commonly accelerate.
4. **Beat tracking:** dynamic-programming beat tracker (Ellis 2007) using the local period from the tempo curve, so beats follow speed-ups.
5. **Downbeats:** for each of the four bar phases, sum the low-band flux at those beats; the strongest phase is beat 1.
6. **Energy:** RMS loudness per beat, smoothed over 4 bars, for auto choreography.
7. **Confidence:** mean onset strength at beats relative to off-beat positions. Below 0.35, show "Beat detection is unsure. Tap to correct" and offer the manual tools.

- **Performance:** a 5-minute song analyses in under 4 s on a recent laptop; progress events at least every 10%.
- **Reference check:** during development, compare results against essentia.js `RhythmExtractor2013` on the test set. If our tracker is clearly worse, ship essentia.js (WASM) in the worker instead.
- **Cache:** IndexedDB key = SHA-1 of the file's bytes + analysis `version`.

**Beat clock (playback):** binary-search the current audio time in `beats` to get index *i* and fraction *f*; beat position = *i* + *f*. Sequence position is counted from the first downbeat, and step boundaries snap to downbeats. Hinch and Fudardi (2-beat units) still change only on bar boundaries.

## 9. Rendering specification

- One `<canvas>` sized to the stage, device pixel ratio capped at 2.
- Draw order: background and glow → guide circles and edge lights → between-circle decor → centrepiece → dancers (inner to outer) → clap sparks.
- Dancer geometry in local units (1 = dancer size): head outward, ghagra or kediyu toward the centre; rotation = circle angle + 90° + pose sway + pose spin.
- Print fills use cached `CanvasPattern`s; pattern scale tracks dancer size.
- Circle angular speed = direction × step travel factor × local tempo, normalised so all circles move at a similar walking speed; speed changes ease over 0.25 s.
- Respect `prefers-reduced-motion` in Build mode (static preview until Play).

## 10. Quality targets

| Area | Target |
|---|---|
| Frame rate | 60 fps with 5 circles (~220 dancers) on a 2021+ laptop with integrated graphics |
| Audio–visual sync | Claps and hops within ±30 ms of detected beats |
| Beat accuracy | ≥ 90% of beats within ±70 ms on the test set |
| Analysis time | < 4 s for a 5-minute song |
| First load | Interactive in < 2 s on broadband, excluding song files |
| Browsers | Latest Chrome, Edge, Safari, Firefox on macOS and Windows |

## 11. Accessibility

- All controls reachable and operable by keyboard, with visible focus.
- Panel text meets WCAG AA contrast on all nine night themes.
- Every swatch, print and centre option has a text label (not colour alone).
- `prefers-reduced-motion` honoured as in §9.

## 12. Music files and test set

- Song files are personal copies. Keep `music/` in `.gitignore` so they are never committed or published with the GitHub Pages build; the deployed site relies on drag and drop.
- **Test set:** 10 tracks covering slow traditional garba, fast filmi garba, a 6/8 hinch-heavy song, a song that speeds up, and a nonstop mashup. Hand-mark beats for 30 s of each in Audacity or Sonic Visualiser and keep the marks in `tests/beats/`.

## 13. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Project setup | Vite + TS app runs; folders as in §7; GitHub Pages deploy works |
| M1 | Port the prototype | Panel, circles, directions, arrangement, centrepieces and steps work as in v0, from separate modules |
| M2 | Colours and prints | §5.1 colour system and all four prints implemented and tuned |
| M3 | Music library | Manifest script, drag and drop, playback, Play mode panel |
| M4 | Beat matching | Worker pipeline, cache, beat clock driving all animation; test-set accuracy met |
| M5 | Festive polish | Between-circle decor, beat-driven lights, auto choreography |
| M6 | QA and release | Quality targets in §10 met; accessibility pass; v1 deployed |

## 14. Release checklist

- [ ] Opens on tonight's night by date; all nine nights recolour correctly
- [ ] Four prints render clearly at 1 and 5 circles
- [ ] 1–5 circles, per-circle direction and arrangement, Set all shortcuts
- [ ] Seven centrepieces; between-circle decor toggles
- [ ] Songs load from `music/` and by drag and drop
- [ ] Analysis runs in a worker with progress, caches, and handles speed-ups
- [ ] Steps change on downbeats; claps land on beats
- [ ] Manual correction tools work when confidence is low
- [ ] Play mode keyboard controls, auto-hiding control panel, ground fits the screen
- [ ] Settings persist across reloads; no network calls except fonts
- [ ] Narrow-window message below 1024 px

## 15. Open questions

1. **"Cloth style":** are the four prints enough, or should users also pick a garment silhouette (for example a longer kediyu or a lehenga-style ghagra)?
2. **Between the circles:** confirm you want decorations in the gaps between circles as well as the centrepiece.
3. **Steps:** should users arrange the sequence (as specified), or should the six steps play in one fixed pre-decided order?
4. **Direction and arrangement:** per circle with a Set all shortcut (as specified), or one setting for the whole ground?
5. **Repo visibility:** public (needed for free GitHub Pages on a personal account) or private?

## 16. Later

- Angled 2.5D balcony view using the same poses.
- Per-circle step sequences.
- Share a scene as a link (scene encoded in the URL).
- More genres and steps (Popatiyu, Sanedo), and more prints (Leheriya-style, Kutchi embroidery panels).
- Recording a clip of the dance to share.
