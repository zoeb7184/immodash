"use client";

import Link from "next/link";
import { useState } from "react";
import { eur, num, pct } from "@/lib/format";
import { useWidth } from "@/lib/useWidth";
import { niceTicks } from "./RentCheck";

type Row = { city: string; city_en: string; slug: string; population: number | null };

function ShowAll({ total, shown, onToggle, all }: { total: number; shown: number; onToggle: () => void; all: boolean }) {
  if (total <= shown && !all) return null;
  return (
    <button className="chip" style={{ marginTop: 14 }} onClick={onToggle}>
      {all ? "Show fewer cities" : `Show all ${total} cities`}
    </button>
  );
}

/** Dumbbell: what existing tenants paid in 2022 vs. what a new lease is advertised at today. */
export function PremiumChart({ rows, highlight }: {
  rows: (Row & { existing: number; asking: number; premium: number })[]; highlight?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(900);
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const sorted = [...rows].sort((a, b) => b.premium - a.premium);
  const big = new Set([...rows].sort((a, b) => (b.population ?? 0) - (a.population ?? 0)).slice(0, 14).map((r) => r.city));
  const shown = all ? sorted : sorted.filter((r) => big.has(r.city) || r.city === highlight);
  const narrow = w < 560;
  const labelW = narrow ? 104 : 150, rightW = narrow ? 52 : 70, rowH = 26, top = 26;
  const xmax = Math.ceil(Math.max(...rows.map((r) => r.asking)) / 5) * 5;
  const x = (v: number) => labelW + (v / xmax) * (w - labelW - rightW);
  const H = top + shown.length * rowH + 8;
  const ticks = niceTicks(0, xmax, narrow ? 3 : 5);

  return (
    <div ref={ref}>
      <div className="legend" style={{ marginBottom: 8 }}>
        <span className="key"><span className="sw" style={{ background: "var(--s3)", borderRadius: 6 }} /> Existing tenants, 2022 average</span>
        <span className="key"><span className="sw" style={{ background: "var(--s2)", borderRadius: 6 }} /> New lease today (median asking rent)</span>
      </div>
      <svg className="svgchart" width={w} height={H} role="img" aria-label="Existing contract rent in 2022 versus asking rent today, per city">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 6} stroke="var(--grid)" />
            <text x={x(t)} y={top - 12} textAnchor="middle" fontSize={11.5} fill="var(--muted)">{t} €/m²</text>
          </g>
        ))}
        <text x={w - 2} y={top - 12} textAnchor="end" fontSize={11.5} fill="var(--muted)">extra</text>
        {shown.map((r, i) => {
          const y = top + i * rowH + rowH / 2, hl = r.city === highlight || r.city === hover;
          return (
            <g key={r.city} onMouseEnter={() => setHover(r.city)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <rect x={0} y={y - rowH / 2} width={w} height={rowH} fill={hl ? "var(--surface-2)" : "transparent"} />
              <Link href={`/cities/${r.slug}`}>
                <text x={labelW - 10} y={y + 4} textAnchor="end" fontSize={13} fontWeight={hl ? 700 : 500} fill="var(--ink)">{r.city_en}</text>
              </Link>
              <line x1={x(r.existing)} x2={x(r.asking)} y1={y} y2={y} stroke="var(--context)" strokeWidth={3} strokeLinecap="round" />
              <circle cx={x(r.existing)} cy={y} r={6} fill="var(--s3)" stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(r.asking)} cy={y} r={6} fill="var(--s2)" stroke="var(--surface)" strokeWidth={2} />
              {hl && !narrow && (
                <text x={x(r.asking) + 10} y={y + 4} fontSize={12} fill="var(--ink-2)">{eur(r.existing)} to {eur(r.asking)}</text>
              )}
              <text x={w - 2} y={y + 4} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--ink)">+{num(r.premium)}%</text>
            </g>
          );
        })}
      </svg>
      <ShowAll total={rows.length} shown={shown.length} all={all} onToggle={() => setAll((a) => !a)} />
    </div>
  );
}

/** Forecast ranges: most likely 12-month change with its 80% interval, per city. */
export function OutlookChart({ rows, highlight }: {
  rows: (Row & { now: number; p10: number; p50: number; p90: number })[]; highlight?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(900);
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const ch = (v: number, now: number) => (100 * v) / now - 100;
  const data = rows.map((r) => ({ ...r, lo: ch(r.p10, r.now), mid: ch(r.p50, r.now), hi: ch(r.p90, r.now) }))
    .sort((a, b) => b.mid - a.mid);
  const big = new Set([...rows].sort((a, b) => (b.population ?? 0) - (a.population ?? 0)).slice(0, 14).map((r) => r.city));
  const shown = all ? data : data.filter((r) => big.has(r.city) || r.city === highlight);
  const narrow = w < 560;
  const labelW = narrow ? 104 : 150, rightW = narrow ? 52 : 120, rowH = 26, top = 26;
  const lo = Math.min(0, Math.floor(Math.min(...data.map((r) => r.lo)))), hi = Math.ceil(Math.max(...data.map((r) => r.hi)));
  const x = (v: number) => labelW + ((v - lo) / (hi - lo)) * (w - labelW - rightW);
  const H = top + shown.length * rowH + 8;
  const ticks = niceTicks(lo, hi, narrow ? 4 : 7);

  return (
    <div ref={ref}>
      <div className="legend" style={{ marginBottom: 8 }}>
        <span className="key"><span className="sw" style={{ background: "var(--s1)", borderRadius: 6 }} /> Most likely change</span>
        <span className="key"><span className="sw" style={{ background: "color-mix(in srgb, var(--s1) 30%, transparent)", width: 22 }} /> 80% range</span>
      </div>
      <svg className="svgchart" width={w} height={H} role="img" aria-label="Forecast change in asking rent over the next 12 months, per city">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 6} stroke={t === 0 ? "var(--muted)" : "var(--grid)"} />
            <text x={x(t)} y={top - 12} textAnchor="middle" fontSize={11.5} fill="var(--muted)">{t > 0 ? "+" : ""}{t}%</text>
          </g>
        ))}
        {shown.map((r, i) => {
          const y = top + i * rowH + rowH / 2, hl = r.city === highlight || r.city === hover;
          return (
            <g key={r.city} onMouseEnter={() => setHover(r.city)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={y - rowH / 2} width={w} height={rowH} fill={hl ? "var(--surface-2)" : "transparent"} />
              <Link href={`/cities/${r.slug}`}>
                <text x={labelW - 10} y={y + 4} textAnchor="end" fontSize={13} fontWeight={hl ? 700 : 500} fill="var(--ink)">{r.city_en}</text>
              </Link>
              <rect x={x(r.lo)} y={y - 5} width={Math.max(2, x(r.hi) - x(r.lo))} height={10} rx={5}
                fill="color-mix(in srgb, var(--s1) 30%, transparent)" />
              <circle cx={x(r.mid)} cy={y} r={6} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
              <text x={w - 2} y={y + 4} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--ink)">
                {pct(r.mid, 1, true)}{!narrow && <tspan fill="var(--muted)" fontWeight={400}>{`  ${num(r.p50, 2)} €`}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>
      <ShowAll total={rows.length} shown={shown.length} all={all} onToggle={() => setAll((a) => !a)} />
    </div>
  );
}
