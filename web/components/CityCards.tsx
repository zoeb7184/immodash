"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { eur, pct } from "@/lib/format";

export type CardCity = { slug: string; city: string; city_en: string; land: string | null; median: number; yoy: number | null;
  burden: number | null; spark: number[] };
type Sort = "rent" | "rise" | "afford" | "name";

function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return null;
  const W = 200, H = 36, lo = Math.min(...v), hi = Math.max(...v);
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * W},${H - 2 - ((y - lo) / (hi - lo || 1)) * (H - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", margin: "6px 0 2px" }}>
      <polyline points={pts} fill="none" stroke="var(--s1)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function CityCards({ cities }: { cities: CardCity[] }) {
  const [sort, setSort] = useState<Sort>("rent");
  const [q, setQ] = useState("");
  const view = useMemo(() => {
    const f = cities.filter((c) => `${c.city} ${c.city_en} ${c.land ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
    const by: Record<Sort, (a: CardCity, b: CardCity) => number> = {
      rent: (a, b) => b.median - a.median,
      rise: (a, b) => (b.yoy ?? -99) - (a.yoy ?? -99),
      afford: (a, b) => (a.burden ?? 99) - (b.burden ?? 99),
      name: (a, b) => a.city_en.localeCompare(b.city_en),
    };
    return f.sort(by[sort]);
  }, [cities, sort, q]);
  return (
    <div>
      <div className="controls" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div className="field" style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <label htmlFor="cc-q">Find a city</label>
          <input id="cc-q" type="search" placeholder="e.g. Köln or Sachsen" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg" role="group" aria-label="Sort cities">
          {([["rent", "Most expensive"], ["rise", "Rising fastest"], ["afford", "Most affordable"], ["name", "A–Z"]] as [Sort, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="citygrid">
        {view.map((c) => (
          <Link key={c.slug} href={`/cities/${c.slug}`} className="citycard">
            <div className="cc-top"><b>{c.city_en}</b><span className="cc-v">{eur(c.median)}</span></div>
            <span className="cc-s">{c.land} · per m² asking rent</span>
            <Spark v={c.spark} />
            <span className="cc-s">
              <span className={(c.yoy ?? 0) >= 0 ? "up" : "down"}>{pct(c.yoy, 1, true)}</span> in a year · burden {pct(c.burden)}
            </span>
          </Link>
        ))}
      </div>
      {view.length === 0 && <p className="note">No city matches “{q}”.</p>}
    </div>
  );
}
