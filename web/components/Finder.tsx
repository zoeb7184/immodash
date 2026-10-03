"use client";

import { useEffect, useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { loadJson } from "@/lib/api";
import { eur, num } from "@/lib/format";
import { MAP_H, MAP_W, useKreisPaths } from "@/lib/geo";
import { useTokens } from "@/lib/theme";
import type { KreisAffordability, KreisAskingRent } from "@/lib/types";

type SizeRow = { ags: string; kreis_name: string; size_band_code: string; rent_eur_sqm: number;
  estimated_asking_rent_eur_sqm: number | null; estimate_method: string | null };
type Hit = { ags: string; name: string; land: string | null; urban: boolean; est: number; rent: number; headroom: number; pop: number | null; method: string };

const SEGMENTS: { value: string; label: string; rooms?: string; band?: string }[] = [
  { value: "total", label: "Any flat", rooms: "total" },
  ...[1, 2, 3, 4].map((n) => ({ value: `r${n}`, label: `${n} room${n > 1 ? "s" : ""}`, rooms: String(n) })),
  { value: "s1", label: "Under 40 m²", band: "WFL000B039" },
  { value: "s2", label: "40 to 59 m²", band: "WFL040B059" },
  { value: "s3", label: "60 to 79 m²", band: "WFL060B079" },
  { value: "s4", label: "80 to 99 m²", band: "WFL080B099" },
  { value: "s5", label: "100 to 119 m²", band: "WFL100B119" },
];
const sizeToSeg = (s: number) => (s < 40 ? "s1" : s < 60 ? "s2" : s < 80 ? "s3" : s < 100 ? "s4" : "s5");
const METHOD: Record<string, string> = {
  greix_city: "using this city's own observed gap between census and asking rents",
  greix_land_median: "using the typical gap seen in the tracked cities of its federal state",
  greix_national_median: "using the typical gap across all tracked cities",
};
const TOK = ["--q1", "--q2", "--q3", "--q4", "--q5", "--context", "--surface", "--ink", "--surface-2"];

export function Finder() {
  const [budget, setBudget] = useState(800);
  const [sqm, setSqm] = useState(55);
  const [seg, setSeg] = useState<string>("auto");
  const [land, setLand] = useState("");
  const [urban, setUrban] = useState<"all" | "city" | "rural">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  const [src, setSrc] = useState<{ rooms: KreisAskingRent[]; sizes: SizeRow[]; aff: KreisAffordability[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const paths = useKreisPaths();
  const t = useTokens(TOK);

  useEffect(() => {
    Promise.all([
      loadJson<KreisAskingRent[]>("kreise-asking-rents.json"),
      loadJson<SizeRow[]>("kreise-rents-by-size.json"),
      loadJson<KreisAffordability[]>("kreise-affordability.json"),
    ]).then(([rooms, sizes, aff]) => setSrc({ rooms, sizes, aff })).catch((e) => setErr(String(e)));
  }, []);

  const segment = SEGMENTS.find((s) => s.value === (seg === "auto" ? sizeToSeg(sqm) : seg))!;
  const lands = useMemo(() => [...new Set(src?.aff.map((a) => a.land_name).filter(Boolean) as string[])].sort(), [src]);

  // Same rule as the API's /affordability/finder: estimated asking rent × size ≤ budget.
  const { all, hits } = useMemo(() => {
    if (!src) return { all: new Map<string, Hit>(), hits: [] as Hit[] };
    const affBy = Object.fromEntries(src.aff.map((a) => [a.ags, a]));
    const rows = segment.band ? src.sizes.filter((r) => r.size_band_code === segment.band) : src.rooms.filter((r) => r.rooms === segment.rooms);
    const all = new Map<string, Hit>();
    for (const r of rows) {
      const a = affBy[r.ags], est = r.estimated_asking_rent_eur_sqm;
      if (!a || est == null) continue;
      all.set(r.ags, { ags: r.ags, name: r.kreis_name, land: a.land_name, urban: a.is_urban_district, est, rent: est * sqm,
        headroom: budget - est * sqm, pop: a.population, method: r.estimate_method ?? "" });
    }
    const hits = [...all.values()].filter((h) => h.headroom >= 0 && (!land || h.land === land)
      && (urban === "all" || (urban === "city") === h.urban)).sort((x, y) => (y.pop ?? 0) - (x.pop ?? 0));
    return { all, hits };
  }, [src, segment, sqm, budget, land, urban]);
  const hitSet = useMemo(() => new Set(hits.map((h) => h.ags)), [hits]);
  const color = useMemo(() => {
    if (!t["--q1"]) return () => "transparent";
    const s = scaleLinear<string>().domain([0, 100, 250, 450, 700]).range(["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => t[k])).clamp(true);
    return (ags: string) => (hitSet.has(ags) ? s(all.get(ags)!.headroom) : t["--context"]);
  }, [t, hitSet, all]);

  const selHit = sel ? all.get(sel) : null;
  const hv = hover ? all.get(hover.ags) : null;
  const totalPop = hits.reduce((s, h) => s + (h.pop ?? 0), 0);
  const cheapestBig = [...all.values()].filter((h) => (h.pop ?? 0) > 300000).sort((a, b) => a.rent - b.rent)[0];

  return (
    <div>
      <div className="rentcheck" style={{ marginBottom: 22 }}>
        <div className="rc-grid">
          <div className="field">
            <label htmlFor="f-budget">Maximum cold rent: <output>{num(budget)} € / month</output></label>
            <input id="f-budget" type="range" min={250} max={2500} step={25} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="f-sqm">Flat size: <output>{sqm} m²</output></label>
            <input id="f-sqm" type="range" min={20} max={130} step={5} value={sqm} onChange={(e) => setSqm(Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="f-seg">Price flats like</label>
            <select id="f-seg" value={seg} onChange={(e) => setSeg(e.target.value)}>
              <option value="auto">Flats of this size (automatic)</option>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="controls">
          <div className="field">
            <label htmlFor="f-land">Federal state</label>
            <select id="f-land" value={land} onChange={(e) => setLand(e.target.value)}>
              <option value="">All of Germany</option>
              {lands.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="flabel">Area type</span>
            <div className="seg" role="group" aria-label="Area type">
              {([["all", "Everywhere"], ["city", "Cities only"], ["rural", "Rural districts"]] as const).map(([k, l]) => (
                <button key={k} aria-pressed={urban === k} onClick={() => setUrban(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {src && (
          <p className="rc-say" style={{ margin: 0 }} aria-live="polite">
            <b style={{ fontFamily: "var(--sans)" }}>{hits.length} of {land || urban !== "all" ? "the matching" : "Germany's"} districts</b> fit{" "}
            {eur(budget, 0)} for {sqm} m², home to about {num(totalPop / 1e6, 1)} million people.
            {cheapestBig && hits.length < all.size && !hitSet.has(cheapestBig.ags) && <> The cheapest large city, {cheapestBig.name.split(",")[0]}, would need about {eur(Math.ceil(cheapestBig.rent / 10) * 10, 0)}.</>}
          </p>
        )}
      </div>
      {err && <p className="note">Could not load data: {err}</p>}

      <div className="split">
        <div>
          <p className="figure-title">Districts that fit your budget</p>
          <p className="figure-sub">Darker blue leaves more money to spare. Grey is over budget. Click a district for details.</p>
          <div className="legend" style={{ margin: "8px 0" }}>
            <span>Just fits</span>
            <span className="bar" style={{ background: `linear-gradient(90deg, ${["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => t[k]).join(",")})` }} />
            <span>700 €+ to spare</span>
            <span className="key"><span className="sw" style={{ background: t["--context"] }} />Over budget</span>
          </div>
          <div className="mapwrap" onMouseLeave={() => setHover(null)}>
            {paths ? (
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", maxHeight: 680, display: "block" }} role="img" aria-label="Map of German districts that fit the budget">
                {paths.map((p) => (
                  <path key={p.ags + p.d.length} className="k" d={p.d} fill={color(p.ags)} stroke={t["--surface"]} strokeWidth={0.5}
                    onClick={() => setSel(p.ags)}
                    onMouseMove={(e) => {
                      const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setHover({ ags: p.ags, x: e.clientX - r.left, y: e.clientY - r.top });
                    }} />
                ))}
                {sel && paths.filter((p) => p.ags === sel).map((p) => <path key="sel" d={p.d} fill="none" stroke={t["--ink"]} strokeWidth={2} pointerEvents="none" />)}
              </svg>
            ) : <p className="note">Loading map…</p>}
            {hover && hv && (
              <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 14, 260), top: hover.y + 14, pointerEvents: "none" }}>
                <b>{hv.name}</b><br />About {eur(Math.round(hv.rent / 10) * 10, 0)} for {sqm} m²<br />
                <span className="tt-k">{hv.headroom >= 0 ? `${eur(Math.round(hv.headroom / 10) * 10, 0)} under budget` : `${eur(Math.round(-hv.headroom / 10) * 10, 0)} over budget`}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          {selHit ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="meta">{selHit.land} · {selHit.urban ? "City district" : "Rural district"}</div>
              <h3 style={{ fontSize: 24, margin: "4px 0 8px" }}>{selHit.name}</h3>
              <p className="prose" style={{ fontSize: 17, margin: 0 }}>
                A {sqm} m² flat ({segment.label.toLowerCase()}) is estimated at <b>{eur(selHit.est)}</b> per m², about{" "}
                <b>{eur(Math.round(selHit.rent / 10) * 10, 0)}</b> a month cold. That is{" "}
                {selHit.headroom >= 0 ? <>{eur(Math.round(selHit.headroom / 10) * 10, 0)} <b>under</b></> : <>{eur(Math.round(-selHit.headroom / 10) * 10, 0)} <b>over</b></>} your budget.
              </p>
              <p className="note" style={{ marginTop: 8 }}>Estimate: census rent for this flat type, raised to today&apos;s level ({METHOD[selHit.method] ?? "model estimate"}). Real listings vary.</p>
              <button className="chip" style={{ marginTop: 10 }} onClick={() => setSel(null)}>Clear selection</button>
            </div>
          ) : (
            <p className="note" style={{ marginBottom: 12 }}>Tip: click any district on the map to see its estimate in words.</p>
          )}
          <p className="figure-title">Matches, largest population first</p>
          <div className="tablewrap" style={{ maxHeight: 560, overflowY: "auto", marginTop: 8 }}>
            <table>
              <thead><tr><th>District</th><th className="num">Est. rent</th><th className="num">To spare</th></tr></thead>
              <tbody>
                {hits.slice(0, 150).map((h) => (
                  <tr key={h.ags} onClick={() => setSel(h.ags)} style={{ cursor: "pointer", background: sel === h.ags ? "var(--surface-2)" : undefined }}>
                    <td className="wrap"><b style={{ fontWeight: 600 }}>{h.name.split(",")[0]}</b><br /><span className="muted" style={{ fontSize: 12 }}>{h.land}</span></td>
                    <td className="num">{eur(Math.round(h.rent / 10) * 10, 0)}</td>
                    <td className="num">{eur(Math.round(h.headroom / 10) * 10, 0)}</td>
                  </tr>
                ))}
                {src && hits.length === 0 && <tr><td colSpan={3} className="wrap muted">Nothing fits yet. Try a smaller flat, a higher budget or another state.</td></tr>}
              </tbody>
            </table>
          </div>
          {hits.length > 150 && <p className="note" style={{ marginTop: 6 }}>Showing the 150 largest of {hits.length} matches.</p>}
        </div>
      </div>
    </div>
  );
}
