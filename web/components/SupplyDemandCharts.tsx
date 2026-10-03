"use client";

import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import type { KreisSupplyDemand } from "@/lib/types";

const GROUPS = [
  { key: "tight", label: "Tight", fill: "var(--d-neg2)" },
  { key: "balanced", label: "Balanced", fill: "var(--context)" },
  { key: "slack", label: "Slack", fill: "var(--d-pos2)" },
] as const;

export function SupplyDemandScatter({ data, highlight }: { data: KreisSupplyDemand[]; highlight: Record<string, string> }) {
  const med = (k: "market_active_vacancy_pct" | "population_growth_5y_pct") => {
    const v = data.map((d) => d[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  return (
    <div style={{ height: 480 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid stroke="var(--grid)" />
          <XAxis type="number" dataKey="market_active_vacancy_pct" scale="log" domain={[0.6, 11]} ticks={[1, 2, 3, 5, 10]}
            tickFormatter={(v) => `${v}%`} stroke="var(--muted)" tick={{ fontSize: 12 }}
            label={{ value: "Market-active vacancy (Zensus 2022)", position: "insideBottom", offset: -14, fontSize: 12, fill: "var(--muted)" }} />
          <YAxis type="number" dataKey="population_growth_5y_pct" tickFormatter={(v) => `${v}%`} stroke="var(--muted)" tick={{ fontSize: 12 }}
            label={{ value: "Population growth 2018–2023", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--muted)", dy: 80 }} />
          <ZAxis type="number" dataKey="population" range={[16, 260]} />
          <ReferenceLine x={med("market_active_vacancy_pct")} stroke="var(--muted)" strokeDasharray="3 3" />
          <ReferenceLine y={med("population_growth_5y_pct")} stroke="var(--muted)" strokeDasharray="3 3" />
          <Tooltip cursor={false} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as KreisSupplyDemand;
            return (<div className="tooltip"><b>{d.kreis_name}</b><br />Vacancy {d.market_active_vacancy_pct}% · population {d.population_growth_5y_pct > 0 ? "+" : ""}{d.population_growth_5y_pct}%<br />
              Index {d.supply_demand_index.toFixed(2)} ({d.market_balance}) · rent {d.rent_eur_sqm?.toFixed(2)} €/m²</div>);
          }} />
          {GROUPS.map((g) => (
            <Scatter key={g.key} name={g.label} data={data.filter((d) => d.market_balance === g.key)} fill={g.fill} fillOpacity={0.8}
              isAnimationActive={false} />
          ))}
          <Scatter name="Selected cities" data={data.filter((d) => d.ags in highlight)} fill="none" stroke="var(--ink)" strokeWidth={2}
            isAnimationActive={false}
            label={{ dataKey: "ags", position: "top", fontSize: 11, fill: "var(--ink)", formatter: (v: unknown) => highlight[String(v)] }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
