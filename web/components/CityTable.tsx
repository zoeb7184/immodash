"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { eur, num, pct } from "@/lib/format";

export type TableRow = {
  city: string; city_en: string; slug: string; land: string | null; median: number; yoy: number | null; y5: number | null;
  burden: number | null; dom: number | null; balance: string | null; f12: number | null;
};
type Key = "median" | "yoy" | "y5" | "burden" | "dom" | "f12" | "city_en";

const COLS: { key: Key; label: string; hint: string }[] = [
  { key: "median", label: "Asking rent", hint: "Median asking rent per m², latest month" },
  { key: "yoy", label: "1 year", hint: "Change over the last 12 months" },
  { key: "y5", label: "5 years", hint: "Change over five years" },
  { key: "burden", label: "Rent burden", hint: "60 m² flat as a share of two residents' net income" },
  { key: "dom", label: "Days online", hint: "How long listings stay online" },
  { key: "f12", label: "Next 12 m", hint: "Most likely change, model forecast" },
];

export function CityTable({ rows }: { rows: TableRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "median", desc: true });
  const maxMedian = Math.max(...rows.map((r) => r.median));
  const view = useMemo(() => {
    const f = rows.filter((r) => `${r.city} ${r.city_en} ${r.land ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
    return f.sort((a, b) => {
      if (sort.key === "city_en") return sort.desc ? b.city_en.localeCompare(a.city_en) : a.city_en.localeCompare(b.city_en);
      const va = a[sort.key] ?? -Infinity, vb = b[sort.key] ?? -Infinity;
      return sort.desc ? Number(vb) - Number(va) : Number(va) - Number(vb);
    });
  }, [rows, q, sort]);
  const th = (key: Key, label: string, hint?: string, cls = "num") => (
    <th className={cls} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"} title={hint}>
      <button onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "city_en" }))}>
        {label} {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
      </button>
    </th>
  );
  return (
    <div>
      <div className="controls" style={{ marginBottom: 10 }}>
        <div className="field" style={{ flex: "1 1 240px", maxWidth: 360 }}>
          <label htmlFor="ct-q">Find a city or state</label>
          <input id="ct-q" type="search" placeholder="e.g. Leipzig, Bayern" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="note" style={{ flex: "2 1 300px" }}>Click a column to sort. Click a city for its full profile, neighbourhood map and outlook.</p>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {th("city_en", "City", undefined, "")}
              {COLS.map((c) => th(c.key, c.label, c.hint))}
              <th>Market</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.city}>
                <td><Link href={`/cities/${r.slug}`} style={{ fontWeight: 600 }}>{r.city_en}</Link> <span className="muted" style={{ fontSize: 12 }}>{r.land}</span></td>
                <td className="num"><span className="bar-cell" style={{ width: Math.round((40 * r.median) / maxMedian) }} />{eur(r.median)}</td>
                <td className={`num ${(r.yoy ?? 0) >= 0 ? "up" : "down"}`}>{pct(r.yoy, 1, true)}</td>
                <td className="num">{pct(r.y5, 0, true)}</td>
                <td className="num">{pct(r.burden)}</td>
                <td className="num">{num(r.dom)}</td>
                <td className="num">{pct(r.f12, 1, true)}</td>
                <td>{r.balance ? <span className={`pill ${r.balance}`}>{r.balance}</span> : "n/a"}</td>
              </tr>
            ))}
            {view.length === 0 && <tr><td colSpan={8} className="muted">No city matches “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
