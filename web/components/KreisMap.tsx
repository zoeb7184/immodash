"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadJson } from "@/lib/api";
import { eur, num, ordinal, pct } from "@/lib/format";
import { MAP_H, MAP_W, useKreisPaths } from "@/lib/geo";
import { useTokens } from "@/lib/theme";
import type { KreisAffordability, KreisAskingRent, KreisSupplyDemand } from "@/lib/types";

type Metric = "asking" | "afford" | "sd" | "rent";
const METRICS: Record<Metric, { label: string; what: string; low: string; high: string }> = {
  asking: { label: "Rent today", what: "Estimated asking rent per m² for a new lease today. Measured in 37 cities, modelled elsewhere.", low: "cheaper", high: "dearer" },
  afford: { label: "Affordability", what: "Rent for 60 m² against what two residents earn after tax. Red: rent takes a large share of local income. Blue: a small share.", low: "rent takes more of income", high: "rent takes less" },
  sd: { label: "Supply vs. demand", what: "Red: population growing while almost no flats are empty (tight). Blue: many empty flats and little growth (slack).", low: "slack", high: "tight" },
  rent: { label: "Rent in 2022", what: "Average rent on existing leases in the 2022 census, per m².", low: "cheaper", high: "dearer" },
};
const RAMPS: Record<Metric, string[]> = {
  asking: ["--q1", "--q2", "--q3", "--q4", "--q5"],
  rent: ["--q1", "--q2", "--q3", "--q4", "--q5"],
  afford: ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2"],
  sd: ["--d-pos2", "--d-pos1", "--d-mid", "--d-neg1", "--d-neg2"],
};
const TOKENS = ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2", "--q1", "--q2", "--q3", "--q4", "--q5", "--surface", "--ink"];

export function KreisMap({ afford, sd, asking, citySlugs }: {
  afford: KreisAffordability[]; sd: KreisSupplyDemand[]; asking: KreisAskingRent[]; citySlugs: Record<string, string>;
}) {
  const [metric, setMetric] = useState<Metric>("asking");
  const [sel, setSel] = useState<string>("05711");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [rooms, setRooms] = useState<KreisAskingRent[] | null>(null);
  const paths = useKreisPaths();
  const t = useTokens(TOKENS);

  const byAgs = useMemo(() => {
    const m: Record<string, { a?: KreisAffordability; s?: KreisSupplyDemand; r?: KreisAskingRent }> = {};
    afford.forEach((a) => ((m[a.ags] ??= {}).a = a));
    sd.forEach((s) => ((m[s.ags] ??= {}).s = s));
    asking.forEach((r) => ((m[r.ags] ??= {}).r = r));
    return m;
  }, [afford, sd, asking]);
  const names = useMemo(() => afford.map((a) => ({ ags: a.ags, name: a.kreis_name })).sort((a, b) => a.name.localeCompare(b.name)), [afford]);
  const askRank = useMemo(() => Object.fromEntries([...asking].sort((a, b) => b.estimated_asking_rent_eur_sqm - a.estimated_asking_rent_eur_sqm).map((r, i) => [r.ags, i + 1])), [asking]);

  const value = (a: string): number | null => {
    const k = byAgs[a];
    if (metric === "afford") return k?.a?.affordability_index ?? null;
    if (metric === "sd") return k?.s?.supply_demand_index ?? null;
    if (metric === "rent") return k?.r?.rent_eur_sqm ?? null;
    return k?.r?.estimated_asking_rent_eur_sqm ?? null;
  };
  const scale = useMemo(() => {
    if (metric === "afford") return { domain: [50, 75, 100, 125, 150], lo: "50", hi: "150" };
    if (metric === "sd") return { domain: [-3, -1.5, 0, 1.5, 3], lo: "−3", hi: "+3" };
    const vals = asking.map((r) => (metric === "rent" ? r.rent_eur_sqm : r.estimated_asking_rent_eur_sqm)).sort((x, y) => x - y);
    const lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.98)];
    return { domain: [0, 0.25, 0.5, 0.75, 1].map((p) => lo + p * (hi - lo)), lo: `${lo.toFixed(1)} €`, hi: `${hi.toFixed(1)} €` };
  }, [metric, asking]);
  const color = useMemo(() => {
    if (!t["--q1"]) return () => "transparent";
    const s = scaleLinear<string>().domain(scale.domain).range(RAMPS[metric].map((k) => t[k])).clamp(true);
    return (a: string) => { const v = value(a); return v == null ? t["--surface"] : s(v); };
  }, [metric, scale, t, byAgs]);

  useEffect(() => {
    setRooms(null);
    loadJson<KreisAskingRent[]>("kreise-asking-rents.json")
      .then((all) => setRooms(all.filter((r) => r.ags === sel && r.rooms !== "total")
        .sort((a, b) => (a.rooms === "7+" ? 7 : Number(a.rooms)) - (b.rooms === "7+" ? 7 : Number(b.rooms)))))
      .catch(() => setRooms([]));
  }, [sel]);

  function search(v: string) {
    setQ(v);
    const hit = names.find((n) => n.name.toLowerCase() === v.trim().toLowerCase()) ?? (v.trim().length >= 3 ? names.find((n) => n.name.toLowerCase().startsWith(v.trim().toLowerCase())) : undefined);
    if (hit) setSel(hit.ags);
  }

  const s = byAgs[sel];
  const h = hover ? byAgs[hover.ags] : null;
  const nm = s?.a?.kreis_name.split(",")[0] ?? "";

  return (
    <div className="split">
      <div>
        <div className="controls" style={{ marginBottom: 10 }}>
          <div className="seg" role="group" aria-label="Map shows">
            {(Object.keys(METRICS) as Metric[]).map((m) => (
              <button key={m} aria-pressed={m === metric} onClick={() => setMetric(m)}>{METRICS[m].label}</button>
            ))}
          </div>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <input type="search" list="kreis-names" placeholder="Search a district, e.g. Bielefeld" aria-label="Search a district" value={q} onChange={(e) => search(e.target.value)} />
            <datalist id="kreis-names">{names.map((n) => <option key={n.ags} value={n.name} />)}</datalist>
          </div>
        </div>
        <p className="figure-sub" style={{ marginBottom: 8 }}>{METRICS[metric].what}</p>
        <div className="legend" style={{ marginBottom: 6 }}>
          <span>{scale.lo} · {METRICS[metric].low}</span>
          <span className="bar" style={{ background: `linear-gradient(90deg, ${RAMPS[metric].map((k) => t[k]).join(",")})` }} />
          <span>{scale.hi} · {METRICS[metric].high}</span>
        </div>
        <div className="mapwrap" onMouseLeave={() => setHover(null)}>
          {paths ? (
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", maxHeight: 740, display: "block" }} role="img" aria-label={`Map of German districts: ${METRICS[metric].label}`}>
              {paths.map((p) => (
                <path key={p.ags + p.d.length} className="k" d={p.d} fill={color(p.ags)} stroke={t["--surface"]} strokeWidth={0.5}
                  onClick={() => { setSel(p.ags); setQ(""); }}
                  onMouseMove={(e) => {
                    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                  }} />
              ))}
              {paths.filter((p) => p.ags === sel).map((p) => (
                <g key="sel" pointerEvents="none">
                  <path d={p.d} fill="none" stroke={t["--ink"]} strokeWidth={2.2} />
                </g>
              ))}
            </svg>
          ) : <p className="note">Loading map…</p>}
          {hover && h?.a && (
            <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 14, 300), top: hover.y + 14, pointerEvents: "none" }}>
              <b>{h.a.kreis_name.split(",")[0]}</b> <span className="tt-k">{h.a.land_name}</span><br />
              Today about {eur(h.r?.estimated_asking_rent_eur_sqm)}/m² · 2022 leases {eur(h.a.rent_eur_sqm)}<br />
              <span className="tt-k">Affordability {num(h.a.affordability_index)} · market {h.s?.market_balance ?? "–"}</span>
            </div>
          )}
        </div>
        <p className="note" style={{ marginTop: 6 }}>Hover for values, click or search to read about a district.</p>
      </div>

      <aside className="card">
        {s?.a ? (
          <>
            <div className="kicker" style={{ color: "var(--muted)" }}>{s.a.land_name} · {s.a.is_urban_district ? "City district" : "Rural district"}</div>
            <h3 style={{ fontSize: 26, margin: "4px 0 10px" }}>{nm}</h3>
            <div className="prose" style={{ fontSize: 17 }}>
              <p>A new lease here is estimated at <b>{eur(s.r?.estimated_asking_rent_eur_sqm)}</b> per m²
                {askRank[sel] && <> ({ordinal(askRank[sel])} most expensive of 400)</>}, so about{" "}
                <b>{num(Math.round(((s.r?.estimated_asking_rent_eur_sqm ?? 0) * 60) / 10) * 10)} €</b> a month for 60 m², cold.
                Existing leases averaged {eur(s.a.rent_eur_sqm)} in 2022.</p>
              <p>Rent on existing leases takes <b>{pct(s.a.rent_burden_pct)}</b> of two average residents&apos; net income, which makes {nm}{" "}
                {s.a.affordability_index >= 110 ? "more affordable than most of Germany" : s.a.affordability_index <= 90 ? "less affordable than most of Germany" : "about as affordable as the German middle"}{" "}
                (index {num(s.a.affordability_index)}, rank {s.a.affordability_rank} of 400).</p>
              {s.s && <p>The market is <b>{s.s.market_balance}</b>: {pct(s.s.market_active_vacancy_pct)} of flats stood empty and available, and the
                population {s.s.population_growth_5y_pct >= 0 ? "grew" : "shrank"} {pct(Math.abs(s.s.population_growth_5y_pct))} in five years.</p>}
            </div>
            {citySlugs[sel] && <p style={{ margin: "4px 0 12px" }}><Link className="btn" href={`/cities/${citySlugs[sel]}`}>Full city profile →</Link></p>}
            <p className="figure-title" style={{ fontSize: 14, marginTop: 6 }}>By number of rooms</p>
            <p className="note">Rent per m², 2022 leases vs. estimated new lease today</p>
            <div style={{ height: 200, marginTop: 6 }}>
              {rooms && rooms.length > 0 && (
                <ResponsiveContainer>
                  <BarChart data={rooms} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
                    <XAxis dataKey="rooms" tickFormatter={(v) => `${v} rm`} stroke="var(--muted)" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} €`} width={40} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="tooltip"><b>{label} room{label === "1" ? "" : "s"}</b><br />2022 leases: {Number(payload[0].value).toFixed(2)} €/m²<br />
                        New lease today: {Number(payload[1]?.value).toFixed(2)} €/m²</div>) : null} />
                    <Bar dataKey="rent_eur_sqm" fill="var(--s3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="estimated_asking_rent_eur_sqm" fill="var(--s2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="legend">
              <span className="key"><span className="sw" style={{ background: "var(--s3)" }} />2022 leases</span>
              <span className="key"><span className="sw" style={{ background: "var(--s2)" }} />New lease today (est.)</span>
            </div>
          </>
        ) : <p className="note">Select a district on the map.</p>}
      </aside>
    </div>
  );
}
