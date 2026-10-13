export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html) node.innerHTML = html;
  return node;
}

/** A panel section with a Gujarati + English header. */
export function section(gu: string, en: string): HTMLElement {
  return el("section", { class: "sec" }, `<h2 class="sec-h"><span class="gu">${gu}</span><span class="en">${en}</span></h2>`);
}

/**
 * Rebuild a container's contents, keeping keyboard focus on the control with the same
 * `data-focus` key so re-renders don't throw keyboard users back to the top.
 */
export function rebuild(container: HTMLElement, build: () => void) {
  const active = document.activeElement as HTMLElement | null;
  const key = active && container.contains(active) ? active.dataset.focus : undefined;
  container.replaceChildren();
  build();
  if (key) container.querySelector<HTMLElement>(`[data-focus="${CSS.escape(key)}"]`)?.focus();
}

/** Segmented control: one pressed button out of several. */
export function segmented<V extends string>(
  options: readonly { value: V; html: string }[],
  current: V | null,
  focusPrefix: string,
  onPick: (value: V) => void,
  label: string,
  small = false,
): HTMLElement {
  const group = el("div", { class: small ? "seg small" : "seg", role: "group", "aria-label": label });
  for (const o of options) {
    const b = el("button", { type: "button", "aria-pressed": String(o.value === current), "data-focus": `${focusPrefix}-${o.value}` }, o.html);
    b.onclick = () => onPick(o.value);
    group.append(b);
  }
  return group;
}

const RING_NAMES = ["Inner", "Second", "Third", "Fourth", "Outer"];

export function circleLabel(index: number, count: number): string {
  if (count === 1) return "Circle";
  if (index === count - 1) return "Outer";
  return RING_NAMES[index];
}

/** Scroll a list so one of its items is visible, without scrolling any ancestor (unlike scrollIntoView). */
export function revealInList(list: HTMLElement, item: Element | undefined) {
  if (!(item instanceof HTMLElement)) return;
  const top = item.offsetTop, bottom = top + item.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top - 6;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
}
