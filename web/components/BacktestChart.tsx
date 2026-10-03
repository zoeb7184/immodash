"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Backtest } from "@/lib/types";

const MODELS = [
  { key: "lightgbm", label: "LightGBM (ImmoDash)", fill: "var(--s1)" },
  { key: "drift_last_12m", label: "Trend continuation", fill: "var(--s2)" },
  { key: "naive_no_change", label: "No change", fill: "var(--context)" },
];

export function BacktestChart({ data }: { data: Backtest[] }) {
  const rows = [3, 6, 12].map((h) => Object.fromEntries([["h", `${h} months`],
    ...MODELS.map((m) => [m.key, data.find((d) => d.horizon_months === h && d.model === m.key)?.mape_pct ?? null])]));
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barGap={3}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="h" stroke="var(--muted)" tick={{ fontSize: 12 }} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} width={40} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
            <div className="tooltip"><div style={{ color: "var(--muted)" }}>{label}</div>{payload.map((p) => (
              <div key={String(p.dataKey)}>{MODELS.find((m) => m.key === p.dataKey)?.label}: <b>{Number(p.value).toFixed(2)}%</b></div>))}</div>) : null} />
          <Legend formatter={(v) => <span style={{ color: "var(--ink-2)", fontSize: 12 }}>{MODELS.find((m) => m.key === v)?.label}</span>} />
          {MODELS.map((m) => <Bar key={m.key} dataKey={m.key} fill={m.fill} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
