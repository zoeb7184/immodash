"use client";

import { X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { assignSlots, MAX_SERIES, SERIES } from "@/lib/colors";
import { month, num } from "@/lib/format";
import { niceTicks } from "./RentCheck";

export type CompactPoint = { c: string; d: string; m: number };
type CityLite = { city: string; city_en: string; population: number | null; index_5y_pct: number | null; median: number };
type Mode = "eur" | "idx";

const PRESETS: { key: string; label: string; pick: (cs: CityLite[]) => string[] }[] = [
  { key: "big", label: "Biggest cities", pick: (cs) => [...cs].sort((a, b) => (b.population ?? 0) - (a.population ?? 0)).slice(0, 5).map((c) => c.city) },
  { key: "fast", label: "Fastest risers", pick: (cs) => [...cs].sort((a, b) => (b.index_5y_pct ?? 0) - (a.index_5y_pct ?? 0)).slice(0, 4).map((c) => c.city) },
  { key: "dear", label: "Most expensive", pick: (cs) => [...cs].sort((a, b) => b.median - a.median).slice(0, 4).map((c) => c.city) },
  { key: "cheap", label: "Cheapest", pick: (cs) => [...cs].sort((a, b) => a.median - b.median).slice(0, 4).map((c) => c.city) },
];

export function TrendStory({ monthly, cities, rateBand, initial }: {
  monthly: CompactPoint[]; cities: CityLite[]; initial: string[];
  rateBand: { from: string; to: string; label: string } | null;
}) {
  const [mode, setMode] = useState<Mode>("idx");
  const [selected, setSelected] = useState<string[]>(initial);
  const [slots, setSlots] = useState<Record<string, number>>(() => assignSlots(initial, {}));
  const names = useMemo(() => Object.fromEntries(cities.map((c) => [c.city, c.city_en])), [cities]);

  function setSel(next: string[]) {
    next = next.slice(-MAX_SERIES);
    setSelected(next);
    setSlots((s) => assignSlots(next, s));
  }
  const toggle = (c: string) => setSel(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);

  const { rows, all } = useMemo(() => {
    const first: Record<string, number> = {};
    for (const r of monthly) if (!(r.c in first)) first[r.c] = r.m;
    const byDate = new Map<string, Record<string, number | string>>();
    for (const r of monthly) {
      const row = byDate.get(r.d) ?? { date: r.d };
      row[r.c] = mode === "eur" ? r.m : Math.round((100 * r.m) / first[r.c] - 100) / 1;
      byDate.set(r.d, row);
    }
    return { rows: [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))), all: Object.keys(first) };
  }, [monthly, mode]);
  const last = rows[rows.length - 1];
  const firstMonth = rows[0]?.date as string;
  const unit = mode === "eur" ? " €" : "%";

  // Fixed y-domain so end-label positions can be computed here (deterministic), then spread to avoid overlap.
  const H = 420, TOP = 22, BOTTOM = H - 4 - 30;
  const { ticks, lo, hi } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const r of rows) for (const k of all) { const v = Number(r[k]); if (Number.isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }
    const t = niceTicks(mn, mx, 6);
    const step = t.length > 1 ? t[1] - t[0] : 1;
    const lo_ = Math.min(t[0], Math.floor(mn / step) * step), hi_ = Math.max(t[t.length - 1], Math.ceil(mx / step) * step);
    return { ticks: niceTicks(lo_, hi_, 6).concat(hi_ > t[t.length - 1] ? [hi_] : []).filter((v, i, a) => a.indexOf(v) === i), lo: lo_, hi: hi_ };
  }, [rows, all]);
  const labelY = useMemo(() => {
    const ys = selected.map((c) => ({ c, y: TOP + ((hi - Number(last?.[c] ?? 0)) / (hi - lo || 1)) * (BOTTOM - TOP) + 4 }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < 14) ys[i].y = ys[i - 1].y + 14;
    return Object.fromEntries(ys.map((e) => [e.c, e.y]));
  }, [selected, last, lo, hi, BOTTOM]);

  return (
    <div>
      <div className="controls" style={{ marginBottom: 12, justifyContent: "space-between" }}>
        <div className="seg" role="group" aria-label="Show as">
          <button aria-pressed={mode === "idx"} onClick={() => setMode("idx")}>Change since {month(firstMonth)}</button>
          <button aria-pressed={mode === "eur"} onClick={() => setMode("eur")}>€ per m²</button>
        </div>
        <div className="chips" role="group" aria-label="Quick picks">
          {PRESETS.map((p) => (
            <button key={p.key} className="chip" onClick={() => setSel(p.pick(cities))}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 10 }} role="group" aria-label="Highlighted cities">
        {selected.map((c) => (
          <button key={c} className="chip" aria-pressed onClick={() => toggle(c)} aria-label={`Remove ${names[c]}`}>
            <span className="dot" style={{ background: SERIES[slots[c]] }} />{names[c]}<X size={12} weight="bold" aria-hidden style={{ color: "var(--muted)" }} />
          </button>
        ))}
        {selected.length < MAX_SERIES && (
          <select aria-label="Add a city" value="" onChange={(e) => e.target.value && toggle(e.target.value)} style={{ minHeight: 32, padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>
            <option value="">+ Add a city</option>
            {[...cities].filter((c) => !selected.includes(c.city)).sort((a, b) => a.city_en.localeCompare(b.city_en))
              .map((c) => <option key={c.city} value={c.city}>{c.city_en}</option>)}
          </select>
        )}
      </div>
      <div style={{ height: H }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 22, right: 96, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            {rateBand && (
              <ReferenceArea x1={rateBand.from} x2={rateBand.to} fill="var(--s4)" fillOpacity={0.12} stroke="none" ifOverflow="extendDomain"
                label={{ value: rateBand.label, position: "insideTop", fontSize: 12, fill: "var(--ink-2)", offset: -16 }} />
            )}
            {mode === "idx" && <ReferenceLine y={0} stroke="var(--muted)" />}
            <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(0, 4)} stroke="var(--muted)" tick={{ fontSize: 12 }} interval={11} tickLine={false} />
            <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} domain={[lo, hi]} ticks={ticks} tickFormatter={(v) => `${mode === "idx" && v > 0 ? "+" : ""}${v}${unit}`} width={56} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const items = payload.filter((p) => selected.includes(String(p.dataKey))).sort((a, b) => Number(b.value) - Number(a.value));
              return (
                <div className="tooltip">
                  <div className="tt-k">{month(String(label))}</div>
                  {items.map((p) => (
                    <div key={String(p.dataKey)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: SERIES[slots[String(p.dataKey)]] }} />
                      {names[String(p.dataKey)]}
                      <b style={{ marginLeft: "auto", paddingLeft: 10 }}>
                        {mode === "eur" ? `${num(Number(p.value), 2)} €/m²` : `${Number(p.value) > 0 ? "+" : ""}${num(Number(p.value), 0)}%`}
                      </b>
                    </div>
                  ))}
                </div>
              );
            }} />
            {all.filter((c) => !selected.includes(c)).map((c) => (
              <Line key={c} dataKey={c} stroke="var(--context)" strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} />
            ))}
            {selected.map((c) => (
              <Line key={c} dataKey={c} stroke={SERIES[slots[c]]} strokeWidth={2.5} dot={false} isAnimationActive={false}
                label={(p: { index?: number; x?: number | string; y?: number | string }) => {
                  if (p.index !== rows.length - 1) return <g key={`${c}-l`} />;
                  const y = labelY[c];
                  const v = Number(last[c]);
                  return (
                    <text key={`${c}-l`} x={Number(p.x) + 6} y={y} fontSize={12} fontWeight={600} fill="var(--ink)">
                      {names[c]} {mode === "eur" ? `${num(v, 2)} €` : `${v > 0 ? "+" : ""}${num(v, 0)}%`}
                    </text>
                  );
                }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="legend" style={{ marginTop: 6 }}>
        {selected.map((c) => <span key={c} className="key"><span className="ln" style={{ background: SERIES[slots[c]], height: 3 }} />{names[c]}</span>)}
        <span className="key"><span className="ln" style={{ background: "var(--context)" }} />The other cities</span>
        {rateBand && <span className="key"><span className="sw" style={{ background: "color-mix(in srgb, var(--s4) 25%, transparent)" }} />Interest-rate jump</span>}
      </div>
    </div>
  );
}

