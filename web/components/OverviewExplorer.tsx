"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { assignSlots, DEFAULT_CITIES, MAX_SERIES, SERIES } from "@/lib/colors";
import { eur, month, num, pct } from "@/lib/format";
import type { CitySnapshot, Forecast } from "@/lib/types";

export type CompactPoint = { c: string; d: string; m: number };
type City = CitySnapshot & { slug: string };

const PERIODS = { "12M": 12, "3Y": 36, "5Y": 60 } as const;
type Period = keyof typeof PERIODS;
type SortKey = "median_rent_sqm" | "index_yoy_pct" | "asking_rent_burden_pct" | "time_on_market_days_4q" | "f12";

export function OverviewExplorer({ cities, monthly, forecasts }: {
  cities: City[]; monthly: CompactPoint[]; forecasts: Forecast[];
}) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_CITIES);
  const [slots, setSlots] = useState<Record<string, number>>(() => assignSlots(DEFAULT_CITIES, {}));
  const [period, setPeriod] = useState<Period>("3Y");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "median_rent_sqm", desc: true });
  const names = useMemo(() => Object.fromEntries(cities.map((c) => [c.city, c.city_en])), [cities]);

  function toggle(city: string) {
    let next = selected.includes(city) ? selected.filter((c) => c !== city) : [...selected, city];
    if (next.length > MAX_SERIES) next = next.slice(next.length - MAX_SERIES);
    setSelected(next);
    setSlots((s) => assignSlots(next, s));
  }

  const data = useMemo(() => {
    const last = monthly.reduce((m, r) => (r.d > m ? r.d : m), "");
    const cutoff = new Date(last);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - PERIODS[period]);
    const byDate = new Map<string, Record<string, number | string>>();
    for (const r of monthly) {
      if (!selected.includes(r.c) || new Date(r.d) <= cutoff) continue;
      const row = byDate.get(r.d) ?? { date: r.d };
      row[r.c] = r.m;
      byDate.set(r.d, row);
    }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [monthly, selected, period]);

  const f12 = useMemo(() => Object.fromEntries(forecasts.filter((f) => f.horizon_months === 12).map((f) => [f.city, f])), [forecasts]);
  const rows = useMemo(() => {
    const val = (c: City) => (sort.key === "f12" ? f12[c.city]?.change_p50_pct ?? null : c[sort.key]);
    return [...cities].sort((a, b) => {
      const va = val(a) ?? -Infinity, vb = val(b) ?? -Infinity;
      return sort.desc ? Number(vb) - Number(va) : Number(va) - Number(vb);
    });
  }, [cities, sort, f12]);

  const th = (key: SortKey, label: string) => (
    <th className="num" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}>
        {label} {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
      </button>
    </th>
  );

  return (
    <div className="grid">
      <section className="panel c12" aria-label="Rent trend">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2>Median asking rent</h2>
            <p className="sub">€ per m², monthly, nominal · GREIX Mietpreisindex · up to {MAX_SERIES} cities</p>
          </div>
          <div className="seg" role="group" aria-label="Period">
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <button key={p} aria-pressed={p === period} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="chips" role="group" aria-label="Cities">
          {[...cities].sort((a, b) => a.city_en.localeCompare(b.city_en)).map((c) => {
            const on = selected.includes(c.city);
            return (
              <button key={c.city} className="chip" aria-pressed={on} onClick={() => toggle(c.city)}>
                <span className="dot" style={{ background: on ? SERIES[slots[c.city]] : "var(--context)" }} />
                {c.city_en}
              </button>
            );
          })}
        </div>
        <div style={{ height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => month(d)} stroke="var(--muted)" tick={{ fontSize: 12 }} minTickGap={40} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v} €`} width={52} />
              <Tooltip content={<ChartTooltip labelFmt={(l) => month(String(l))} />} />
              {selected.map((c) => (
                <Line key={c} dataKey={c} name={names[c]} stroke={SERIES[slots[c]]} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel c12" aria-label="All cities">
        <h2>All 37 cities</h2>
        <p className="sub">Latest month · click a column to sort · click a city for its outlook, neighbourhood map and AI summary</p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>City</th>
                {th("median_rent_sqm", "Median €/m²")}
                {th("index_yoy_pct", "YoY")}
                {th("asking_rent_burden_pct", "Rent burden")}
                {th("time_on_market_days_4q", "Days on market")}
                {th("f12", "12 m forecast")}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.city}>
                  <td><Link href={`/cities/${c.slug}`}>{c.city_en}</Link></td>
                  <td className="num">{eur(c.median_rent_sqm)}</td>
                  <td className={`num ${(c.index_yoy_pct ?? 0) >= 0 ? "up" : "down"}`}>{pct(c.index_yoy_pct, 1, true)}</td>
                  <td className="num">{pct(c.asking_rent_burden_pct)}</td>
                  <td className="num">{num(c.time_on_market_days_4q)}</td>
                  <td className="num">{f12[c.city] ? `${eur(f12[c.city].p50_rent_sqm)} (${pct(f12[c.city].change_p50_pct, 1, true)})` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
