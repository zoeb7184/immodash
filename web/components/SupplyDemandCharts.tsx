"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { num, pct } from "@/lib/format";
import type { KreisSupplyDemand } from "@/lib/types";

const GROUPS = [
  { key: "tight", label: "Tight", fill: "var(--d-neg2)" },
  { key: "balanced", label: "Balanced", fill: "var(--context)" },
  { key: "slack", label: "Slack", fill: "var(--d-pos2)" },
] as const;

export function SupplyDemandScatter({ data, highlight }: { data: KreisSupplyDemand[]; highlight: Record<string, string> }) {
  const [q, setQ] = useState("");
  const names = useMemo(() => [...data].sort((a, b) => a.kreis_name.localeCompare(b.kreis_name)), [data]);
  const needle = q.trim().toLowerCase();
  const found = needle.length >= 3
    ? data.find((d) => d.kreis_name.toLowerCase().startsWith(needle)) ?? data.find((d) => d.kreis_name.toLowerCase().includes(needle))
    : undefined;
  const med = (k: "market_active_vacancy_pct" | "population_growth_5y_pct") => {
    const v = data.map((d) => d[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const mv = med("market_active_vacancy_pct"), mp = med("population_growth_5y_pct");
  const ymin = Math.floor(Math.min(...data.map((d) => d.population_growth_5y_pct))), ymax = Math.ceil(Math.max(...data.map((d) => d.population_growth_5y_pct)));
  // with a district selected, the big cities step back so the selection is the one labelled point
  const labels = found ? {} : highlight;

  return (
    <div>
      <div className="controls" style={{ marginBottom: 10, justifyContent: "space-between" }}>
        <div className="legend">
          {GROUPS.map((g) => <span key={g.key} className="key"><span className="sw" style={{ background: g.fill, borderRadius: 6 }} />{g.label}</span>)}
          {found ? <span className="key"><span className="sw" style={{ background: "var(--accent)", borderRadius: 6 }} />Your search</span>
            : <span className="key"><span className="sw" style={{ border: "2px solid var(--ink)", borderRadius: 6, background: "none" }} />Labelled cities</span>}
        </div>
        <div className="field" style={{ minWidth: 220 }}>
          <input type="search" list="sd-names" placeholder="Find a district" aria-label="Find a district on the chart" value={q} onChange={(e) => setQ(e.target.value)} />
          <datalist id="sd-names">{names.map((n) => <option key={n.ags} value={n.kreis_name} />)}</datalist>
        </div>
      </div>
      {found ? (
        <p className="note" style={{ marginBottom: 8, fontSize: 14 }}>
          <b style={{ color: "var(--ink)" }}>{found.kreis_name}</b> is the highlighted dot: {pct(found.market_active_vacancy_pct)} of flats empty and available,
          population {pct(found.population_growth_5y_pct, 1, true)} in five years, so the market is <b style={{ color: "var(--ink)" }}>{found.market_balance}</b>
          {" "}(index {num(found.supply_demand_index, 2)}). The guide lines show where it sits on each axis.
        </p>
      ) : (
        <p className="note" style={{ marginBottom: 8, fontSize: 14 }}>
          The chart always shows all 400 districts. Search for one to highlight it and see where it sits.
        </p>
      )}
      <div style={{ height: 520 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 16, bottom: 30, left: 8 }}>
            <CartesianGrid stroke="var(--grid)" />
            <ReferenceArea x1={0.6} x2={mv} y1={mp} y2={ymax} fill="var(--d-neg2)" fillOpacity={0.05} stroke="none"
              label={{ value: "Growing, few empty flats: tight", position: "insideTopLeft", fontSize: 12, fill: "var(--d-neg2)", fontWeight: 600 }} />
            <ReferenceArea x1={mv} x2={11} y1={ymin} y2={mp} fill="var(--d-pos2)" fillOpacity={0.05} stroke="none"
              label={{ value: "Shrinking, many empty flats: slack", position: "insideBottomRight", fontSize: 12, fill: "var(--d-pos2)", fontWeight: 600 }} />
            <XAxis type="number" dataKey="market_active_vacancy_pct" scale="log" domain={[0.6, 11]} ticks={[1, 2, 3, 5, 10]}
              tickFormatter={(v) => `${v}%`} stroke="var(--muted)" tick={{ fontSize: 12 }}
              label={{ value: "Flats empty and available, 2022 (log scale)", position: "insideBottom", offset: -18, fontSize: 12, fill: "var(--muted)" }} />
            <YAxis type="number" dataKey="population_growth_5y_pct" domain={[ymin, ymax]} ticks={Array.from({ length: Math.floor((ymax - ymin) / 2) + 1 }, (_, i) => Math.ceil(ymin / 2) * 2 + 2 * i).filter((v) => v <= ymax)} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} stroke="var(--muted)" tick={{ fontSize: 12 }}
              label={{ value: "Population change over 5 years", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--muted)", dy: 90 }} />
            <ZAxis type="number" dataKey="population" range={[16, 300]} />
            <ReferenceLine x={mv} stroke="var(--muted)" strokeDasharray="3 3" />
            <ReferenceLine y={mp} stroke="var(--muted)" strokeDasharray="3 3" />
            <Tooltip cursor={false} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as KreisSupplyDemand;
              return (<div className="tooltip"><b>{d.kreis_name.split(",")[0]}</b> <span className="tt-k">{d.land_name}</span><br />
                {pct(d.market_active_vacancy_pct)} empty · population {pct(d.population_growth_5y_pct, 1, true)}<br />
                <span className="tt-k">Index {num(d.supply_demand_index, 2)}, {d.market_balance}{d.rent_eur_sqm != null && ` · 2022 rent ${num(d.rent_eur_sqm, 2)} €/m²`}</span></div>);
            }} />
            {found && <ReferenceLine x={found.market_active_vacancy_pct} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" ifOverflow="extendDomain" />}
            {found && <ReferenceLine y={found.population_growth_5y_pct} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" ifOverflow="extendDomain" />}
            {GROUPS.map((g) => (
              <Scatter key={g.key} name={g.label} data={data.filter((d) => d.market_balance === g.key)} fill={g.fill} fillOpacity={found ? 0.22 : 0.75}
                stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
            ))}
            <Scatter name="Labelled" data={data.filter((d) => d.ags in labels)} fill="none" stroke="var(--ink)" strokeWidth={2}
              isAnimationActive={false}
              label={{ dataKey: "ags", position: "top", fontSize: 12, fontWeight: 600, fill: "var(--ink)", formatter: (v: unknown) => labels[String(v)] }} />
            {found && (
              <Scatter name="Selected" data={[found]} isAnimationActive={false}
                shape={(props: unknown) => {
                  const { cx, cy } = props as { cx: number; cy: number };
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={16} fill="var(--accent)" fillOpacity={0.15} />
                      <circle cx={cx} cy={cy} r={8} fill="var(--accent)" stroke="var(--surface)" strokeWidth={3} />
                      <text x={cx + 14} y={cy - 12} fontSize={13} fontWeight={700} fill="var(--ink)" stroke="var(--bg)" strokeWidth={4} paintOrder="stroke">
                        {found.kreis_name.split(",")[0]}
                      </text>
                    </g>
                  );
                }} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
