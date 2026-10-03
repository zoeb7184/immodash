// Horizontal ranked bars in plain HTML (server-rendered, responsive, readable without JS).
export function RankBars({ rows, max, tone, fmt }: {
  rows: { label: string; sub?: string; v: number; note?: string }[]; max: number; tone: "good" | "bad" | "neutral"; fmt: "pct" | "eur" | "index";
}) {
  const fill = tone === "bad" ? "var(--d-neg2)" : tone === "good" ? "var(--d-pos2)" : "var(--s1)";
  const f = (v: number) => (fmt === "pct" ? `${v.toFixed(1)}%` : fmt === "index" ? v.toFixed(2) : `${v.toFixed(2)} €`);
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
      {rows.map((r, i) => (
        <li key={r.label + i} title={r.note} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "2px 12px", alignItems: "baseline" }}>
          <span style={{ font: "600 14px var(--sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span className="muted" style={{ fontWeight: 500, marginRight: 6 }}>{i + 1}</span>{r.label}
            {r.sub && <span className="muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{r.sub}</span>}
          </span>
          <span style={{ font: "600 14px var(--sans)", fontVariantNumeric: "tabular-nums" }}>{f(r.v)}</span>
          <span style={{ gridColumn: "1 / -1", height: 8, background: "var(--surface-2)", borderRadius: 4 }}>
            <span style={{ display: "block", height: "100%", width: `${(100 * r.v) / max}%`, background: fill, borderRadius: "0 4px 4px 0" }} />
          </span>
        </li>
      ))}
    </ol>
  );
}
