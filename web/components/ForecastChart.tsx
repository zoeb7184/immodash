"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { month } from "@/lib/format";
import type { Anomaly, Forecast, RentPoint } from "@/lib/types";

type Row = { date: number; hist?: number; p50?: number; band?: [number, number] };
const ts = (iso: string) => Date.parse(iso);

export function ForecastChart({ history, forecasts, anomalies }: { history: RentPoint[]; forecasts: Forecast[]; anomalies: Anomaly[] }) {
  const h = history.filter((r) => r.median_rent_sqm != null).slice(-48);
  const rows: Row[] = h.map((r) => ({ date: ts(r.period_date), hist: r.median_rent_sqm! }));
  if (h.length && forecasts.length) {
    const last = rows[rows.length - 1];
    last.p50 = last.hist;
    last.band = [last.hist!, last.hist!];
    for (const f of [...forecasts].sort((a, b) => a.horizon_months - b.horizon_months)) {
      rows.push({ date: ts(f.target_month), p50: f.p50_rent_sqm, band: [f.p10_rent_sqm, f.p90_rent_sqm] });
    }
  }
  const shown = anomalies.filter((a) => a.period_date >= (h[0]?.period_date ?? ""));
  return (
    <div style={{ height: 340 }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(d) => month(new Date(d).toISOString())} stroke="var(--muted)" tick={{ fontSize: 12 }} minTickGap={40} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v} €`} width={52} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return (
                <div className="tooltip">
                  <div style={{ color: "var(--muted)" }}>{month(new Date(Number(label)).toISOString())}</div>
                  {r.hist != null && <div>Median asking rent <b>{r.hist.toFixed(2)} €/m²</b></div>}
                  {r.hist == null && r.p50 != null && (
                    <div>Forecast <b>{r.p50.toFixed(2)} €/m²</b><br />80% range {r.band![0].toFixed(2)}–{r.band![1].toFixed(2)} €</div>
                  )}
                </div>
              );
            }}
          />
          <Area dataKey="band" stroke="none" fill="var(--s1)" fillOpacity={0.16} isAnimationActive={false} name="80% interval" />
          <Line dataKey="hist" stroke="var(--s1)" strokeWidth={2} dot={false} isAnimationActive={false} name="History" />
          <Line dataKey="p50" stroke="var(--s1)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false} name="Forecast" />
          {shown.map((a) => (
            <ReferenceDot key={a.period_date} x={ts(a.period_date)} y={a.median_rent_sqm} r={6} fill="var(--surface)"
              stroke={a.direction === "spike" ? "var(--d-neg2)" : "var(--d-pos2)"} strokeWidth={2.5} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
