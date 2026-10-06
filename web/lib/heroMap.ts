// Build-time hero map: project the district outlines once on the server, so the browser receives finished
// SVG paths instead of downloading GeoJSON and running d3 itself. Colours are CSS color-mix() between the
// theme's ramp tokens, so light and dark mode work without any client-side colour code.
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { data } from "./data";

export const HERO_W = 560, HERO_H = 760;

export type HeroPath = { ags: string; d: string; fill: string; rank: number };

export function heroMap(rents: Record<string, number>) {
  const geo = data.geoLite();
  const proj = geoMercator().fitSize([HERO_W, HERO_H], geo as unknown as FeatureCollection);
  const gp = geoPath(proj).digits(1);
  const v = Object.values(rents).sort((a, b) => a - b);
  const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)];
  const rank = Object.fromEntries(Object.entries(rents).sort((a, b) => a[1] - b[1]).map(([a], i) => [a, i]));
  const fill = (ags: string) => {
    const r = rents[ags];
    if (r == null) return "var(--surface-2)";
    const t = Math.min(1, Math.max(0, (r - lo) / (hi - lo))) * 4; // four segments between q1..q5
    const i = Math.min(3, Math.floor(t)), f = Math.round((t - i) * 100);
    return f === 0 ? `var(--q${i + 1})` : `color-mix(in srgb, var(--q${i + 2}) ${f}%, var(--q${i + 1}))`;
  };
  const paths: HeroPath[] = geo.features.map((f) => ({
    ags: String(f.id), d: gp(f as unknown as Feature) ?? "", fill: fill(String(f.id)), rank: rank[String(f.id)] ?? 0,
  }));
  return { paths, lo, hi };
}
