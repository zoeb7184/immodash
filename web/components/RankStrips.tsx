"use client";

import { useState } from "react";
import { ordinal } from "@/lib/format";
import { useWidth } from "@/lib/useWidth";

export type Fmt = { d: number; suffix: string; sign?: boolean };
const fmtV = (f: Fmt, v: number) => `${f.sign && v > 0 ? "+" : ""}${v.toLocaleString("en-GB", { minimumFractionDigits: f.d, maximumFractionDigits: f.d })}${f.suffix}`;

export type Strip = {
  key: string; label: string; fmt: Fmt; higherIs: string; lowerIs: string;
  values: { city: string; city_en: string; v: number | null }[];
};

/** Spread dots that would overlap: alternate above and below the line. */
function dodge<T extends { cx: number }>(pts: T[]): (T & { dy: number })[] {
  const placed: (T & { dy: number })[] = [];
  const offsets = [0, -8, 8, -16, 16];
  for (const p of [...pts].sort((a, b) => a.cx - b.cx)) {
    const dy = offsets.find((o) => !placed.some((q) => q.dy === o && Math.abs(q.cx - p.cx) < 9)) ?? 0;
    placed.push({ ...p, dy });
  }
  return placed;
}

/** For each measure, all 37 cities as dots on one line; the current city is highlighted and ranked in words. */
export function RankStrips({ strips, city }: { strips: Strip[]; city: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<{ strip: string; city: string; x: number } | null>(null);
  const pad = 10;

  return (
    <div ref={ref} style={{ display: "grid", gap: 22 }}>
      {strips.map((s) => {
        const vals = s.values.filter((x) => x.v != null) as { city: string; city_en: string; v: number }[];
        const me = vals.find((x) => x.city === city);
        if (!me) return null;
        const lo = Math.min(...vals.map((x) => x.v)), hi = Math.max(...vals.map((x) => x.v));
        const x = (v: number) => pad + ((v - lo) / (hi - lo || 1)) * (w - 2 * pad);
        const rankHigh = [...vals].sort((a, b) => b.v - a.v).findIndex((x) => x.city === city) + 1;
        const n = vals.length;
        const words = rankHigh <= n / 2 ? `${rankHigh === 1 ? "The" : ordinal(rankHigh)} ${s.higherIs} of ${n}`
          : `${n + 1 - rankHigh === 1 ? "The" : ordinal(n + 1 - rankHigh)} ${s.lowerIs} of ${n}`;
        const hv = hover?.strip === s.key ? vals.find((v) => v.city === hover.city) : null;
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ font: "600 14px var(--sans)" }}>{s.label}</span>
              <span style={{ font: "400 15px var(--serif)", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)", fontFamily: "var(--sans)" }}>{fmtV(s.fmt, me.v)}</b> · {words}</span>
            </div>
            <div style={{ position: "relative" }}>
              <svg className="svgchart" width={w} height={52} role="img" aria-label={`${s.label}: ${fmtV(s.fmt, me.v)}, ${words}`}>
                <line x1={pad} x2={w - pad} y1={28} y2={28} stroke="var(--line)" strokeWidth={2} />
                {dodge(vals.filter((v) => v.city !== city).map((v) => ({ ...v, cx: x(v.v) }))).map((v) => (
                  <circle key={v.city} cx={v.cx} cy={28 + v.dy} r={4.5} fill="var(--context)" stroke="var(--surface)" strokeWidth={1.5}
                    onMouseEnter={() => setHover({ strip: s.key, city: v.city, x: v.cx })} onMouseLeave={() => setHover(null)} />
                ))}
                <circle cx={x(me.v)} cy={28} r={8} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2.5} />
              </svg>
              {hv && (
                <div className="tooltip" style={{ position: "absolute", left: Math.min(hover!.x + 8, w - 150), top: -30, pointerEvents: "none", padding: "4px 8px" }}>
                  {hv.city_en}: <b>{fmtV(s.fmt, hv.v)}</b>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", font: "12px var(--sans)", color: "var(--muted)" }}>
                <span>{fmtV(s.fmt, lo)}</span><span>{fmtV(s.fmt, hi)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
