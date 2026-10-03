"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadJson } from "@/lib/api";
import { eur, num, pct } from "@/lib/format";
import { useTokens } from "@/lib/theme";
import type { Feature, FeatureCollection } from "geojson";
import type { KreisAffordability, KreisAskingRent, KreisGeo, KreisSupplyDemand } from "@/lib/types";

type Metric = "afford" | "sd" | "rent" | "asking";
const METRICS: Record<Metric, { label: string; sub: string }> = {
  afford: { label: "Affordability", sub: "Index 100 = median Kreis · red = rent takes a larger share of local income (2022)" },
  sd: { label: "Supply vs demand", sub: "Red = demand outpaces supply (low vacancy, growing population) · blue = slack" },
  rent: { label: "Zensus rent", sub: "Average net cold rent of existing contracts, € per m², May 2022" },
  asking: { label: "Est. asking rent", sub: "Zensus rent uplifted by asking premia observed in GREIX cities (modelled)" },
};
const TOKENS = ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2", "--q1", "--q2", "--q3", "--q4", "--q5", "--surface", "--ink"];
const W = 560, H = 760;

export function KreisMap({ geo, afford, sd, asking }: {
  geo: KreisGeo; afford: KreisAffordability[]; sd: KreisSupplyDemand[]; asking: KreisAskingRent[];
}) {
  const [metric, setMetric] = useState<Metric>("afford");
  const [sel, setSel] = useState<string>("05711");
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [rooms, setRooms] = useState<KreisAskingRent[] | null>(null);
  const t = useTokens(TOKENS);

  const byAgs = useMemo(() => {
    const m: Record<string, { a?: KreisAffordability; s?: KreisSupplyDemand; r?: KreisAskingRent }> = {};
    afford.forEach((a) => ((m[a.ags] ??= {}).a = a));
    sd.forEach((s) => ((m[s.ags] ??= {}).s = s));
    asking.forEach((r) => ((m[r.ags] ??= {}).r = r));
    return m;
  }, [afford, sd, asking]);

  const paths = useMemo(() => {
    const proj = geoMercator().fitSize([W, H], geo as unknown as FeatureCollection);
    const gp = geoPath(proj);
    return geo.features.map((f) => ({ ags: f.id, d: gp(f as unknown as Feature) ?? "" }));
  }, [geo]);

  const color = useMemo(() => {
    if (!t["--q1"]) return () => "transparent";
    if (metric === "afford") {
      const s = scaleLinear<string>().domain([50, 75, 100, 125, 150])
        .range(["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2"].map((k) => t[k])).clamp(true);
      return (a: string) => (byAgs[a]?.a ? s(byAgs[a].a!.affordability_index) : t["--surface"]);
    }
    if (metric === "sd") {
      const s = scaleLinear<string>().domain([-3, -1.5, 0, 1.5, 3])
        .range(["--d-pos2", "--d-pos1", "--d-mid", "--d-neg1", "--d-neg2"].map((k) => t[k])).clamp(true);
      return (a: string) => (byAgs[a]?.s ? s(byAgs[a].s!.supply_demand_index) : t["--surface"]);
    }
    const val = (a: string) => (metric === "rent" ? byAgs[a]?.r?.rent_eur_sqm : byAgs[a]?.r?.estimated_asking_rent_eur_sqm);
    const vals = asking.map((r) => val(r.ags)!).sort((x, y) => x - y);
    const lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.98)];
    const s = scaleLinear<string>().domain([0, 0.25, 0.5, 0.75, 1].map((p) => lo + p * (hi - lo)))
      .range(["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => t[k])).clamp(true);
    return (a: string) => (val(a) != null ? s(val(a)!) : t["--surface"]);
  }, [metric, byAgs, asking, t]);

  useEffect(() => {
    setRooms(null);
    loadJson<KreisAskingRent[]>("kreise-asking-rents.json")
      .then((all) => setRooms(all.filter((r) => r.ags === sel)
        .sort((a, b) => (a.rooms === "7+" ? 7 : Number(a.rooms) || 0) - (b.rooms === "7+" ? 7 : Number(b.rooms) || 0))))
      .catch(() => setRooms([]));
  }, [sel]);

  const s = byAgs[sel];
  const h = hover ? byAgs[hover.ags] : null;

  return (
    <div className="grid">
      <section className="panel c7">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Germany by Kreis</h2>
          <div className="seg" role="group" aria-label="Map metric">
            {(Object.keys(METRICS) as Metric[]).map((m) => (
              <button key={m} aria-pressed={m === metric} onClick={() => setMetric(m)}>{METRICS[m].label}</button>
            ))}
          </div>
        </div>
        <p className="sub">{METRICS[metric].sub} · click a Kreis</p>
        <div className="legend">
          <span>{metric === "afford" ? "50 · less affordable" : metric === "sd" ? "−3 · slack" : "low"}</span>
          <span className="bar" style={{ background: `linear-gradient(90deg, ${(metric === "afford"
            ? ["--d-neg2", "--d-neg1", "--d-mid", "--d-pos1", "--d-pos2"]
            : metric === "sd" ? ["--d-pos2", "--d-pos1", "--d-mid", "--d-neg1", "--d-neg2"]
            : ["--q1", "--q2", "--q3", "--q4", "--q5"]).map((k) => t[k]).join(",")})` }} />
          <span>{metric === "afford" ? "150 · more affordable" : metric === "sd" ? "+3 · tight" : "high (P2–P98, € per m²)"}</span>
        </div>
        <div className="mapwrap" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 720, display: "block" }} role="img" aria-label={`Map of German Kreise by ${METRICS[metric].label}`}>
            {paths.map((p) => (
              <path key={p.ags + p.d.length} d={p.d} fill={color(p.ags)} stroke={t["--surface"]} strokeWidth={0.5}
                onClick={() => setSel(p.ags)}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                }} />
            ))}
            {paths.filter((p) => p.ags === sel).map((p) => (
              <path key="sel" d={p.d} fill="none" stroke={t["--ink"]} strokeWidth={2} pointerEvents="none" />
            ))}
          </svg>
          {hover && h?.a && (
            <div className="tooltip" style={{ position: "absolute", left: hover.x + 14, top: hover.y + 14, pointerEvents: "none" }}>
              <b>{h.a.kreis_name}</b><br />
              Zensus rent {eur(h.a.rent_eur_sqm)}/m² · est. asking {eur(h.r?.estimated_asking_rent_eur_sqm)}<br />
              Affordability {num(h.a.affordability_index)} · supply/demand {h.s ? h.s.supply_demand_index.toFixed(2) : "–"} ({h.s?.market_balance})
            </div>
          )}
        </div>
      </section>
      <section className="panel c5">
        {s?.a ? (
          <>
            <div className="eyebrow">{s.a.land_name} · AGS {sel}</div>
            <h2 style={{ fontSize: 22 }}>{s.a.kreis_name}</h2>
            <div className="kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
              <div className="kpi"><span className="label">Zensus rent 2022</span><span className="value">{num(s.a.rent_eur_sqm, 2)}<span className="unit">€/m²</span></span></div>
              <div className="kpi"><span className="label">Est. asking rent</span><span className="value">{num(s.r?.estimated_asking_rent_eur_sqm, 2)}<span className="unit">€/m²</span></span></div>
              <div className="kpi"><span className="label">Affordability</span><span className="value">{num(s.a.affordability_index)}</span><span className="sub">#{s.a.affordability_rank} of 400 · burden {pct(s.a.rent_burden_pct)}</span></div>
              <div className="kpi"><span className="label">Market</span><span className="value" style={{ textTransform: "capitalize" }}>{s.s?.market_balance}</span>
                <span className="sub">{pct(s.s?.market_active_vacancy_pct)} vacancy · {pct(s.s?.population_growth_5y_pct, 1, true)} pop.</span></div>
            </div>
            <p className="sub">Rent by number of rooms: Zensus 2022 vs. estimated asking rent today</p>
            <div style={{ height: 240 }}>
              {rooms && (
                <ResponsiveContainer>
                  <BarChart data={rooms.filter((r) => r.rooms !== "total")} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="rooms" tickFormatter={(v) => `${v} rm`} stroke="var(--muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} €`} width={44} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="tooltip"><b>{label} room(s)</b><br />Zensus 2022: {Number(payload[0].value).toFixed(2)} €/m²<br />
                        Est. asking: {Number(payload[1]?.value).toFixed(2)} €/m²</div>) : null} />
                    <Bar dataKey="rent_eur_sqm" fill="var(--s1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="estimated_asking_rent_eur_sqm" fill="var(--s2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="legend"><span className="dot" style={{ width: 10, height: 10, borderRadius: 2, background: "var(--s1)" }} /> Zensus 2022
              <span className="dot" style={{ width: 10, height: 10, borderRadius: 2, background: "var(--s2)", marginLeft: 10 }} /> Est. asking today</div>
          </>
        ) : <p className="note">Select a Kreis on the map.</p>}
      </section>
    </div>
  );
}
