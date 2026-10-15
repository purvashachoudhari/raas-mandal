import { ringBell } from "../audio/bell";
import { t } from "./i18n";

// Intro (§5.14): a carved haveli door on black opens on its own, light spills out, and "ચાલો ગરબે
// રમીએ" fades in with an Enter / ચાલો button that rings a temple bell and zooms through the doorway
// into the site. Shown once a day per visitor; Skip always works; reduced motion shows it already open.

const KEY = "raasMandal.introSeen.v1";
/** Before the door opens, after the intro appears (ms). */
const OPEN_AFTER = 1000;
/** Door swing (ms); the CSS transition matches. */
const SWING = 1200;
/** Zoom through the doorway into the site (ms); the CSS transition matches. */
const ZOOM = 800;

/** Local date as y-m-d. index.html's inline script uses the same format to hide the site until the intro is up. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** The intro is for the laptop layout; narrow windows get the "open on a laptop" message instead. */
const narrow = () => window.innerWidth < 1024;

// ---------- Drawing (SVG, in a 300 × 380 unit box) ----------
// Doorway opening: x 64–236, arched top from the spring line (y 140) up to the apex (y 78), sill at y 362.
// Each leaf is 86 × 284 units; the right leaf is the left one mirrored.

const BRASS = (id: string) => `
  <radialGradient id="${id}" cx="35%" cy="35%" r="70%">
    <stop offset="0" stop-color="#fff1b0"/><stop offset=".45" stop-color="#e2b14a"/><stop offset="1" stop-color="#7a5212"/>
  </radialGradient>`;

const stud = (x: number, y: number, fill: string, r = 3.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${fill})"/>`;

/** A carved rosette: eight petals round a dark boss. */
function rosette(cx: number, cy: number, r: number, brass: string): string {
  const petals = Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${r * 0.22}" ry="${r * 0.48}" transform="rotate(${i * 45} ${cx} ${cy})"/>`,
  ).join("");
  return `<g fill="#a8682f" stroke="#3a1d0c" stroke-width=".8">${petals}</g>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="#3a1d0c"/>${stud(cx, cy, brass, r * 0.18)}`;
}

/** One door leaf. `side` keeps gradient ids unique; the right leaf is mirrored. */
function leafSvg(side: "l" | "r"): string {
  const wood = `wood-${side}`, brass = `brass-${side}`;
  const studRow = (y: number) => [10, 26, 43, 60, 76].map((x) => stud(x, y, brass)).join("");
  const grain = [14, 23, 37, 51, 64, 73].map((x, i) => `<path d="M${x} ${i % 2 ? 40 : 70} V284" stroke="#3a1d0c" stroke-opacity=".18" stroke-width=".8"/>`).join("");
  const panel = (y: number) => `
    <rect x="8" y="${y}" width="70" height="70" rx="2" fill="#4f2a12" stroke="#2e170a" stroke-width="1.2"/>
    <rect x="13" y="${y + 5}" width="60" height="60" rx="1.5" fill="none" stroke="#b07a3c" stroke-opacity=".7"/>`;
  return `<svg class="intro-leaf intro-leaf-${side}" viewBox="0 0 86 284" aria-hidden="true">
    <defs>
      <linearGradient id="${wood}" x1="0" x2="1">
        <stop offset="0" stop-color="#5e3216"/><stop offset=".6" stop-color="#7a4520"/><stop offset="1" stop-color="#8a5126"/>
      </linearGradient>${BRASS(brass)}
    </defs>
    <g${side === "r" ? ' transform="translate(86 0) scale(-1 1)"' : ""}>
      <path d="M0 284 V62 A86 62 0 0 1 86 0 V284 Z" fill="url(#${wood})" stroke="#2e170a" stroke-width="2"/>
      ${grain}
      <path d="M8 118 V64 A70 54 0 0 1 78 10 V118 Z" fill="#4f2a12" stroke="#2e170a" stroke-width="1.2"/>
      <path d="M14 112 V66 A64 50 0 0 1 78 16 V112 Z" fill="none" stroke="#b07a3c" stroke-opacity=".7"/>
      ${rosette(50, 80, 20, brass)}
      ${studRow(124)}
      ${panel(130)}
      <path d="M43 145 L63 165 L43 185 L23 165 Z" fill="#5e3216" stroke="#a8682f" stroke-width="1.4"/>
      <path d="M43 154 L54 165 L43 176 L32 165 Z" fill="none" stroke="#a8682f"/>
      ${stud(43, 165, brass, 3)}
      ${studRow(206)}
      ${panel(212)}
      ${rosette(43, 247, 22, brass)}
      ${studRow(280)}
      <path d="M85 4 V284" stroke="#2e170a" stroke-width="1.5"/>
      ${stud(76, 152, brass, 4.5)}
      <circle cx="76" cy="163" r="9" fill="none" stroke="url(#${brass})" stroke-width="2.8"/>
    </g>
  </svg>`;
}

/** Marigold head: a ring of petals round a deeper centre. */
function marigold(x: number, y: number, petal: string, heart: string): string {
  const ring = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<circle cx="${(x + Math.cos(a) * 4.6).toFixed(1)}" cy="${(y + Math.sin(a) * 4.6).toFixed(1)}" r="3"/>`;
  }).join("");
  return `<g fill="${petal}">${ring}<circle cx="${x}" cy="${y}" r="4.6"/></g><circle cx="${x}" cy="${y}" r="2.6" fill="${heart}"/>`;
}

/** A small clay diya with a flickering flame. */
function diya(x: number): string {
  return `<g class="intro-diya">
    <ellipse class="intro-diya-glow" cx="${x}" cy="342" rx="16" ry="20" fill="url(#flameGlow)"/>
    <path class="intro-flame" d="M${x} 330 C${x + 5} 338 ${x + 5} 344 ${x} 348 C${x - 5} 344 ${x - 5} 338 ${x} 330 Z" fill="url(#flame)"/>
    <path d="M${x - 14} 350 Q${x} 366 ${x + 14} 350 Z" fill="#b5542a" stroke="#6e2b10" stroke-width="1"/>
    <ellipse cx="${x}" cy="350" rx="14" ry="3" fill="#d9773d"/>
    <ellipse cx="${x}" cy="350" rx="9" ry="1.6" fill="#5a2a10"/>
  </g>`;
}

function frameSvg(): string {
  // Toran: a gently sagging string with marigolds, and mango leaves hanging between them.
  const sag = (x: number) => 26 + 10 * (1 - ((x - 150) / 114) ** 2);
  const flowers: string[] = [], leaves: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = 40 + i * 22;
    flowers.push(marigold(x, sag(x), i % 2 ? "#f5b324" : "#f07a1a", i % 2 ? "#e0961a" : "#c95a10"));
    if (i < 10) {
      const lx = x + 11, ly = sag(lx) + 2;
      leaves.push(`<path d="M${lx} ${ly} C${lx + 6} ${ly + 8} ${lx + 4} ${ly + 18} ${lx} ${ly + 24} C${lx - 4} ${ly + 18} ${lx - 6} ${ly + 8} ${lx} ${ly} Z" fill="${i % 2 ? "#3d8b37" : "#2e9a3e"}"/>
        <path d="M${lx} ${ly + 2} V${ly + 22}" stroke="#1f6b2a" stroke-width=".8"/>`);
    }
  }
  const beads = "M54 362 V140 A96 75 0 0 1 246 140 V362";
  return `<svg class="intro-frame" viewBox="0 0 300 380" aria-hidden="true">
    <defs>
      <linearGradient id="frameWood" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#5a3015"/><stop offset="1" stop-color="#3e200d"/>
      </linearGradient>
      ${BRASS("brass-f")}
      <radialGradient id="flame" cx="50%" cy="70%" r="60%">
        <stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffc23d"/><stop offset="1" stop-color="#f06a10"/>
      </radialGradient>
      <radialGradient id="flameGlow">
        <stop offset="0" stop-color="#ffcf6b" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="M44 376 V140 A106 88 0 0 1 256 140 V376 Z M64 362 V140 A86 62 0 0 1 236 140 V362 Z" fill="url(#frameWood)" fill-rule="evenodd" stroke="#2a1508" stroke-width="2"/>
    <path d="${beads}" fill="none" stroke="#b07a3c" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0 7"/>
    <path d="M64 362 V140 A86 62 0 0 1 236 140 V362" fill="none" stroke="#2a1508" stroke-width="3"/>
    <rect x="34" y="362" width="232" height="14" rx="2" fill="#3a1e0b" stroke="#2a1508"/>
    <path d="M150 40 C156 46 157 52 150 56 C143 52 144 46 150 40 Z" fill="url(#brass-f)"/>
    ${stud(150, 60, "brass-f", 5)}
    <path d="M36 ${sag(36)} Q150 ${sag(150) * 2 - 26} 264 ${sag(264)}" fill="none" stroke="#7a4a1c" stroke-width="1.4"/>
    ${leaves.join("")}${flowers.join("")}
    ${diya(20)}${diya(280)}
  </svg>`;
}

// ---------- Behaviour ----------

/** Show the intro if it hasn't been seen today. The site keeps running underneath, hidden and inert. */
export function mountIntro() {
  const root = document.documentElement;
  let seen = false;
  try {
    seen = localStorage.getItem(KEY) === today();
  } catch {
    // Storage unavailable: show it (it can always be skipped).
  }
  if (seen || narrow()) {
    root.classList.remove("intro-pending");
    return;
  }
  try {
    localStorage.setItem(KEY, today());
  } catch {
    // Storage unavailable: the intro shows again next time.
  }

  const s = t();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const intro = document.createElement("div");
  intro.className = "intro";
  intro.setAttribute("role", "dialog");
  intro.setAttribute("aria-modal", "true");
  intro.setAttribute("aria-label", s.introAria);
  intro.tabIndex = -1;
  intro.innerHTML = `
    <button type="button" class="intro-skip">${s.introSkip}</button>
    <div class="intro-scene">
      <div class="intro-door">
        <div class="intro-spill" aria-hidden="true"></div>
        ${frameSvg()}
        <div class="intro-light" aria-hidden="true"></div>
        <div class="intro-leaves">${leafSvg("l")}${leafSvg("r")}</div>
        <div class="intro-words">
          <p class="intro-title" lang="gu">${s.introTitle}</p>
          <p class="intro-sub" lang="en">${s.introSubtitle}</p>
          <button type="button" class="intro-enter">${s.introEnter}</button>
        </div>
      </div>
    </div>`;

  // Everything else is hidden from keyboard and screen readers until the intro closes.
  const others = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.inert);
  for (const el of others) el.inert = true;
  document.body.append(intro);
  root.classList.remove("intro-pending");
  intro.focus({ preventScroll: true });

  const enter = intro.querySelector<HTMLButtonElement>(".intro-enter")!;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  function showButton() {
    intro.classList.add("show-button");
    // Move focus to the button unless the visitor already went to Skip.
    if (document.activeElement === intro) enter.focus({ preventScroll: true });
  }

  if (reduce) {
    intro.classList.add("open", "show-text");
    showButton();
  } else {
    later(OPEN_AFTER, () => intro.classList.add("open"));
    later(OPEN_AFTER + SWING * 0.75, () => intro.classList.add("show-text"));
    later(OPEN_AFTER + SWING + 500, showButton);
  }

  let closing = false;
  function close(zoom: boolean) {
    if (closing) return;
    closing = true;
    timers.forEach(clearTimeout);
    const done = () => {
      intro.remove();
      for (const el of others) el.inert = false;
      document.getElementById("playBtn")?.focus({ preventScroll: true });
    };
    if (!zoom || reduce) return done();
    // Zoom towards the middle of the doorway.
    const light = intro.querySelector<HTMLElement>(".intro-words")!.getBoundingClientRect();
    const scene = intro.querySelector<HTMLElement>(".intro-scene")!;
    scene.style.transformOrigin = `${light.left + light.width / 2}px ${light.top + light.height * 0.55}px`;
    intro.classList.add("leaving");
    window.setTimeout(done, ZOOM);
  }

  enter.onclick = () => {
    ringBell();
    close(true);
  };
  intro.querySelector<HTMLButtonElement>(".intro-skip")!.onclick = () => close(false);
  // Esc also skips; Tab stays inside the intro.
  intro.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(false);
    } else if (e.key === "Tab") {
      const focusable = [...intro.querySelectorAll<HTMLElement>("button")].filter((b) => getComputedStyle(b).visibility !== "hidden");
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === intro)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
