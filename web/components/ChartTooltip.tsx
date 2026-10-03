"use client";

type Item = { name?: string | number; value?: number | string | (number | string)[]; color?: string; dataKey?: unknown };

export function ChartTooltip({ active, payload, label, unit = " €/m²", labelFmt }: {
  active?: boolean; payload?: Item[]; label?: string | number; unit?: string; labelFmt?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && !Array.isArray(p.value)).sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="tooltip">
      {label != null && <div style={{ marginBottom: 4, color: "var(--muted)" }}>{labelFmt ? labelFmt(label) : label}</div>}
      {rows.map((p) => (
        <div key={String(p.name)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color }} />
          <span>{p.name}</span>
          <b style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
            {unit}
          </b>
        </div>
      ))}
    </div>
  );
}
