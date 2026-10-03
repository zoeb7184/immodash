"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { eur, num } from "@/lib/format";
import { useWidth } from "@/lib/useWidth";

export type RCCity = {
  city: string; city_en: string; slug: string; median: number; p25: number | null; p75: number | null;
  income: number | null; f12: number | null; f12lo: number | null; f12hi: number | null;
};

const round10 = (v: number) => Math.round(v / 10) * 10;
const euro0 = (v: number) => `${num(round10(v))} €`;

function verdict(share: number) {
  if (share <= 0.3) return { cls: "ok", label: "Comfortable", say: "within the common rule of thumb that rent should take no more than 30% of net income" };
  if (share <= 0.4) return { cls: "stretch", label: "A stretch", say: "above the 30% rule of thumb; doable, but it leaves less room for everything else" };
  return { cls: "tough", label: "Tough", say: "well above the 30% rule of thumb, and many German landlords look for a net income of about three times the cold rent" };
}

/** Typical household: two residents' disposable income, per month. */
const typicalIncome = (c: RCCity) => (c.income ? Math.round((2 * c.income) / 12 / 50) * 50 : 3000);

export function RentCheck({ cities, initialCity = "Berlin", compact = false }: { cities: RCCity[]; initialCity?: string; compact?: boolean }) {
  const byName = useMemo(() => Object.fromEntries(cities.map((c) => [c.city, c])), [cities]);
  const [cityName, setCityName] = useState(initialCity in byName ? initialCity : cities[0].city);
  const c = byName[cityName];
  const [size, setSize] = useState(60);
  const [income, setIncome] = useState(() => typicalIncome(c));
  const [touched, setTouched] = useState(false);

  function pickCity(name: string) {
    setCityName(name);
    if (!touched) setIncome(typicalIncome(byName[name]));
  }

  const rent = c.median * size;
  const share = income > 0 ? rent / income : 1;
  const v = verdict(share);
  const budget = income * 0.3;
  const all = cities.map((x) => ({ ...x, cost: x.median * size })).sort((a, b) => a.cost - b.cost);
  const fits = all.filter((x) => x.cost <= budget);
  const cheaper = all.filter((x) => x.cost < rent * 0.8).slice(0, 3);
  const sorted = [...cities].sort((a, b) => a.city_en.localeCompare(b.city_en));

  return (
    <div className="rentcheck" aria-live="polite">
      <div className="rc-grid">
        <div className="field">
          <label htmlFor="rc-city">I want to rent in</label>
          <select id="rc-city" value={cityName} onChange={(e) => pickCity(e.target.value)}>
            {sorted.map((x) => <option key={x.city} value={x.city}>{x.city_en}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rc-size">Flat size: <output>{size} m²</output></label>
          <input id="rc-size" type="range" min={20} max={130} step={5} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="rc-inc">Household net income per month: <output>{num(income)} €</output></label>
          <input id="rc-inc" type="range" min={800} max={9000} step={50} value={income}
            onChange={(e) => { setIncome(Number(e.target.value)); setTouched(true); }} />
          <span className="note">
            {touched ? <button className="chip" style={{ padding: "2px 8px" }} onClick={() => { setTouched(false); setIncome(typicalIncome(c)); }}>Reset to typical for {c.city_en}</button>
              : <>Starts at a typical two-person household in {c.city_en}. Drag to use your own.</>}
          </span>
        </div>
      </div>

      <div className="rc-result">
        <div>
          <div className="note" style={{ marginBottom: 6 }}>A {size} m² flat in {c.city_en} is advertised at about</div>
          <div className="rc-big">{euro0(rent)}<small>per month, cold</small></div>
          {c.p25 != null && c.p75 != null && (
            <p className="note" style={{ marginTop: 6 }}>Half of all listings: {euro0(c.p25 * size)} to {euro0(c.p75 * size)}. Heating and running costs come on top.</p>
          )}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className={`verdict ${v.cls}`}>{v.label}</span>
            <b style={{ fontSize: 15 }}>{Math.round(share * 100)}% of your income</b>
          </div>
          <div className="meter" role="img" aria-label={`Rent would take ${Math.round(share * 100)} percent of income`}>
            <span className="pin" style={{ left: `${Math.min(100, share * 100)}%` }} />
          </div>
          <div className="meter-scale"><span>0%</span><span>30%</span><span>40%</span><span>100%</span></div>
          <p className="rc-say">
            That is {v.say}.
            {c.f12 != null && <> If the trend holds, the same flat would be listed at about <b>{euro0(c.f12 * size)}</b> a year from now
              {c.f12lo != null && c.f12hi != null && <> (likely between {euro0(c.f12lo * size)} and {euro0(c.f12hi * size)})</>}.</>}
          </p>
        </div>
        <div>
          <div className="note" style={{ marginBottom: 4 }}>
            The same {size} m² flat in all 37 cities. The dashed line is 30% of your income ({euro0(budget)}).
          </div>
          <CostStrip rows={all} selected={cityName} budget={budget} onPick={pickCity} />
          <p className="rc-say" style={{ fontSize: 16 }}>
            {fits.length === 0 ? <>On this income, a flat this size goes over 30% in every one of the 37 cities. A smaller flat or a second earner changes that quickly.</>
              : fits.length === all.length ? <>On this income, a flat this size stays within 30% in all 37 cities.</>
              : <>It stays within 30% of your income in <b>{fits.length} of 37</b> cities.</>}
            {cheaper.length > 0 && <> Noticeably cheaper options: {cheaper.map((x, i) => (
              <span key={x.city}>{i > 0 && (i === cheaper.length - 1 ? " and " : ", ")}<button className="term-link" onClick={() => pickCity(x.city)}
                style={{ all: "unset", cursor: "pointer", borderBottom: "1px solid currentColor" }}>{x.city_en}</button> ({euro0(x.cost)})</span>))}.</>}
          </p>
          {!compact && <p className="note" style={{ marginTop: 10 }}><Link href={`/cities/${c.slug}`}>Read the full {c.city_en} profile <ArrowRight size={13} weight="bold" aria-hidden /></Link> <span aria-hidden style={{ margin: "0 6px" }}>/</span> <Link href="/affordability">Search all 400 districts by budget <ArrowRight size={13} weight="bold" aria-hidden /></Link></p>}
        </div>
      </div>
    </div>
  );
}

/** One-row dot strip: each city's cost for the chosen flat, dodged vertically where dots would overlap. */
function CostStrip({ rows, selected, budget, onPick }: {
  rows: (RCCity & { cost: number })[]; selected: string; budget: number; onPick: (c: string) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(480);
  const [hover, setHover] = useState<string | null>(null);
  const pad = { l: 8, r: 16 }, R = 6;
  const lo = Math.min(rows[0].cost, budget) * 0.92, hi = Math.max(rows[rows.length - 1].cost, budget) * 1.04;
  const x = (v: number) => pad.l + ((v - lo) / (hi - lo)) * (w - pad.l - pad.r);
  // dodge
  const placed: { r: (typeof rows)[number]; cx: number; level: number }[] = [];
  for (const r of rows) {
    const cx = x(r.cost);
    let level = 0;
    while (placed.some((p) => p.level === level && Math.abs(p.cx - cx) < 2 * R + 1)) level++;
    placed.push({ r, cx, level });
  }
  const maxLevel = Math.max(...placed.map((p) => p.level));
  const base = 20 + (maxLevel + 1) * (2 * R + 1);
  const H = base + 34;
  const ticks = niceTicks(lo, hi, w < 420 ? 3 : 5);
  const sel = placed.find((p) => p.r.city === selected)!;
  const hv = placed.find((p) => p.r.city === hover);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg className="svgchart" width={w} height={H} role="img" aria-label="Cost of the same flat in each of the 37 cities">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={10} y2={base} stroke="var(--grid)" />
            <text x={x(t)} y={base + 16} textAnchor="middle" fontSize={11.5} fill="var(--muted)">{num(t)} €</text>
          </g>
        ))}
        <line x1={x(budget)} x2={x(budget)} y1={4} y2={base} stroke="var(--ink)" strokeDasharray="4 3" strokeWidth={1.5} />
        <text x={x(budget) > w - 90 ? x(budget) - 5 : x(budget) + 5} y={12} textAnchor={x(budget) > w - 90 ? "end" : "start"} fontSize={11.5} fill="var(--ink-2)">30% budget</text>
        {placed.map((p) => {
          const isSel = p.r.city === selected;
          return (
            <circle key={p.r.city} cx={p.cx} cy={base - R - 2 - p.level * (2 * R + 1)} r={isSel ? R + 1.5 : R}
              fill={isSel ? "var(--s2)" : p.r.cost <= budget ? "var(--s1)" : "var(--context)"} stroke="var(--surface)" strokeWidth={2}
              style={{ cursor: "pointer" }} onMouseEnter={() => setHover(p.r.city)} onMouseLeave={() => setHover(null)}
              onClick={() => onPick(p.r.city)}>
              <title>{`${p.r.city_en}: ${euro0(p.r.cost)}`}</title>
            </circle>
          );
        })}
        <text x={Math.max(40, Math.min(sel.cx, w - 60))} y={H - 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
          {sel.r.city_en}
        </text>
      </svg>
      {hv && (
        <div className="tooltip" style={{ position: "absolute", left: Math.min(hv.cx + 10, w - 170), top: 0, pointerEvents: "none" }}>
          <b>{hv.r.city_en}</b>: {euro0(hv.r.cost)} / month<br /><span className="tt-k">{eur(hv.r.median)} per m² · click to select</span>
        </div>
      )}
      <div className="legend" style={{ marginTop: 4 }}>
        <span className="key"><span className="sw" style={{ background: "var(--s2)", borderRadius: 6 }} /> Your pick</span>
        <span className="key"><span className="sw" style={{ background: "var(--s1)", borderRadius: 6 }} /> Within 30%</span>
        <span className="key"><span className="sw" style={{ background: "var(--context)", borderRadius: 6 }} /> Over 30%</span>
      </div>
    </div>
  );
}

export function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? 10 * mag;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}
