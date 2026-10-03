// Series colours are CSS variables, so charts follow the light/dark theme without re-rendering.
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
export const MAX_SERIES = SERIES.length;
export const DEFAULT_CITIES = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Bielefeld"];

/** Colour follows the city: keep existing slots, give newcomers the lowest free slot. */
export function assignSlots(selected: string[], prev: Record<string, number>): Record<string, number> {
  const kept: Record<string, number> = {};
  for (const c of selected) if (c in prev) kept[c] = prev[c];
  const used = new Set(Object.values(kept));
  for (const c of selected) {
    if (c in kept) continue;
    let s = 0;
    while (used.has(s)) s++;
    kept[c] = s;
    used.add(s);
  }
  return kept;
}
