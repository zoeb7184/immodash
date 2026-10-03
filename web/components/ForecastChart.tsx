"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { month, num } from "@/lib/format";
import type { Anomaly, Forecast } from "@/lib/types";

export type HistPoint = { c: string; d: string; m: number };
type Row = { date: number; hist?: number; p50?: number; band?: [number, number]; cmp?: number; cmpF?: number };
const ts = (iso: string) => Date.parse(iso);

export function ForecastChart({ city, cityEn, history, forecasts, anomalies, others }: {
  city: string; cityEn: string; history: HistPoint[]; forecasts: Forecast[]; anomalies: Anomaly[];
  others: { city: string; city_en: string }[];
}) {
  const [cmp, setCmp] = useState<string>("");
  const [range, setRange] = useState<"4y" | "all">("4y");
  const cmpName = others.find((o) => o.city === cmp)?.city_en;

  const rows = useMemo(() => {
    const own = history.filter((p) => p.c === city);
    const h = range === "4y" ? own.slice(-48) : own;
    const start = h[0]?.d ?? "";
    const map = new Map<number, Row>();
    const get = (d: number) => map.get(d) ?? (map.set(d, { date: d }), map.get(d)!);
    h.forEach((p) => (get(ts(p.d)).hist = p.m));
    const fs = forecasts.filter((f) => f.city === city).sort((a, b) => a.horizon_months - b.horizon_months);
    if (h.length && fs.length) {
      const last = get(ts(h[h.length - 1].d));
      last.p50 = last.hist; last.band = [last.hist!, last.hist!];
      fs.forEach((f) => { const r = get(ts(f.target_month)); r.p50 = f.p50_rent_sqm; r.band = [f.p10_rent_sqm, f.p90_rent_sqm]; });
    }
    if (cmp) {
      const ch = history.filter((p) => p.c === cmp && p.d >= start);
      ch.forEach((p) => (get(ts(p.d)).cmp = p.m));
      const cf = forecasts.filter((f) => f.city === cmp).sort((a, b) => a.horizon_months - b.horizon_months);
      if (ch.length && cf.length) {
        get(ts(ch[ch.length - 1].d)).cmpF = ch[ch.length - 1].m;
        cf.forEach((f) => (get(ts(f.target_month)).cmpF = f.p50_rent_sqm));
      }
    }
    return [...map.values()].sort((a, b) => a.date - b.date);
  }, [history, forecasts, city, cmp, range]);

  const first = rows[0]?.date ?? 0;
  const lastD = rows[rows.length - 1]?.date ?? 0;
  const ticks: number[] = [];
  for (let y = new Date(first).getUTCFullYear(); y <= new Date(lastD).getUTCFullYear(); y++) {
    for (const m of range === "4y" ? [0, 6] : [0]) { const t = Date.UTC(y, m, 1); if (t >= first && t <= lastD) ticks.push(t); }
  }
  const shown = anomalies.filter((a) => ts(a.period_date) >= first);

  return (
    <div>
      <div className="controls" style={{ marginBottom: 12 }}>
        <div className="seg" role="group" aria-label="Time range">
          <button aria-pressed={range === "4y"} onClick={() => setRange("4y")}>Last 4 years</button>
          <button aria-pressed={range === "all"} onClick={() => setRange("all")}>Since 2020</button>
        </div>
        <div className="field">
          <select aria-label="Compare with another city" value={cmp} onChange={(e) => setCmp(e.target.value)}>
            <option value="">Compare with…</option>
            {others.map((o) => <option key={o.city} value={o.city}>{o.city_en}</option>)}
          </select>
        </div>
      </div>
      <div style={{ height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="date" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={ticks} tickFormatter={(d) => month(new Date(d).toISOString())}
              stroke="var(--muted)" tick={{ fontSize: 12 }} minTickGap={24} tickLine={false} />
            <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v} €`} width={52} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return (
                <div className="tooltip">
                  <div className="tt-k">{month(new Date(Number(label)).toISOString())}</div>
                  {r.hist != null && <div>{cityEn}: <b>{num(r.hist, 2)} €/m²</b></div>}
                  {r.hist == null && r.p50 != null && (
                    <div>{cityEn} forecast: <b>{num(r.p50, 2)} €/m²</b><br /><span className="tt-k">likely {num(r.band![0], 2)} to {num(r.band![1], 2)} €</span></div>
                  )}
                  {r.cmp != null && <div>{cmpName}: <b>{num(r.cmp, 2)} €/m²</b></div>}
                  {r.cmp == null && r.cmpF != null && <div>{cmpName} forecast: <b>{num(r.cmpF, 2)} €/m²</b></div>}
                </div>
              );
            }} />
            <Area dataKey="band" stroke="none" fill="var(--s1)" fillOpacity={0.16} isAnimationActive={false} />
            {cmp && <Line dataKey="cmp" stroke="var(--s2)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />}
            {cmp && <Line dataKey="cmpF" stroke="var(--s2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls />}
            <Line dataKey="hist" stroke="var(--s1)" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
            <Line dataKey="p50" stroke="var(--s1)" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false} connectNulls />
            {shown.map((a) => (
              <ReferenceDot key={a.period_date} x={ts(a.period_date)} y={a.median_rent_sqm} r={7} fill="none"
                stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="2 2" />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="legend" style={{ marginTop: 6 }}>
        <span className="key"><span className="ln" style={{ background: "var(--s1)", height: 3 }} />{cityEn}</span>
        <span className="key"><span className="ln" style={{ borderTop: "2px dashed var(--s1)", background: "none" }} />Forecast</span>
        <span className="key"><span className="sw" style={{ background: "color-mix(in srgb, var(--s1) 22%, transparent)" }} />80% range</span>
        {cmp && <span className="key"><span className="ln" style={{ background: "var(--s2)", height: 3 }} />{cmpName}</span>}
        {shown.length > 0 && <span className="key"><span className="sw" style={{ border: "1.5px dashed var(--ink)", borderRadius: 7, background: "none" }} />Unusual month</span>}
      </div>
    </div>
  );
}
