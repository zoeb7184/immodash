"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { ArrowRight } from "@phosphor-icons/react";
import { MAP_H, MAP_W, useKreisPaths } from "@/lib/geo";
import { useTokens } from "@/lib/theme";

const RAMP = ["--q1", "--q2", "--q3", "--q4", "--q5"];

/** Hero visual: every district coloured by estimated asking rent (real data, not decoration). */
export function HeroMap({ rents, names }: { rents: Record<string, number>; names: Record<string, string> }) {
  const paths = useKreisPaths(undefined, true);
  const t = useTokens([...RAMP, "--bg", "--surface-2"]);
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const rank = useMemo(() => Object.fromEntries(Object.entries(rents).sort((a, b) => a[1] - b[1]).map(([a], i) => [a, i])), [rents]);
  const { color, lo, hi } = useMemo(() => {
    const v = Object.values(rents).sort((a, b) => a - b);
    const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.floor(v.length * 0.98)];
    const s = scaleLinear<string>().domain([0, 0.25, 0.5, 0.75, 1].map((p) => lo + p * (hi - lo))).range(RAMP.map((k) => t[k] || "#ccc")).clamp(true);
    return { color: (a: string) => (rents[a] != null ? s(rents[a]) : t["--surface-2"]), lo, hi };
  }, [rents, t]);

  return (
    <div className="hero-visual">
      <div className="mapwrap" onMouseLeave={() => setHover(null)} style={{ maxWidth: "min(100%, 680px, calc((100svh - 230px) * 0.737))", minWidth: "min(100%, 300px)", marginInline: "auto" }}>
        {paths && t["--q1"] ? (
          <svg className="hero-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", display: "block" }} role="img"
            aria-label="Map of Germany's 400 districts coloured by estimated asking rent">
            {paths.map((p) => (
              <path key={p.ags + p.d.length} className="k" d={p.d} fill={color(p.ags)} stroke={t["--bg"]} strokeWidth={0.6}
                style={{ ["--rank" as string]: rank[p.ags] ?? 0 }}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                }} />
            ))}
          </svg>
        ) : <div className="map-skeleton" aria-hidden />}
        {hover && rents[hover.ags] != null && (
          <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 12, 260), top: hover.y + 12, pointerEvents: "none" }}>
            <b>{names[hover.ags]?.split(",")[0]}</b><br />about {rents[hover.ags].toFixed(2)} € per m²
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <div className="legend">
          <span>{lo?.toFixed(0)} €</span>
          <span className="bar" style={{ width: 120, background: `linear-gradient(90deg, ${RAMP.map((k) => t[k]).join(",")})` }} />
          <span>{hi?.toFixed(0)} € per m²</span>
        </div>
        <Link href="/map" className="textlink" style={{ fontSize: 14 }}>Explore the map <ArrowRight size={14} weight="bold" aria-hidden /></Link>
      </div>
    </div>
  );
}
