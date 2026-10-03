"use client";

import { useEffect, useState } from "react";
import { loadJson } from "@/lib/api";
import { eur, num } from "@/lib/format";
import type { FinderResult, KreisAffordability, KreisAskingRent } from "@/lib/types";

type SizeRow = { ags: string; kreis_name: string; size_band_code: string; rent_eur_sqm: number;
  estimated_asking_rent_eur_sqm: number | null; estimate_method: string | null };

const SEGMENTS: { value: string; label: string; params: Record<string, string> }[] = [
  { value: "total", label: "Any flat", params: { rooms: "total" } },
  ...[1, 2, 3, 4].map((n) => ({ value: `r${n}`, label: `${n} room${n > 1 ? "s" : ""}`, params: { rooms: String(n) } })),
  { value: "s1", label: "Under 40 m²", params: { size_band: "WFL000B039" } },
  { value: "s2", label: "40–59 m²", params: { size_band: "WFL040B059" } },
  { value: "s3", label: "60–79 m²", params: { size_band: "WFL060B079" } },
  { value: "s4", label: "80–99 m²", params: { size_band: "WFL080B099" } },
  { value: "s5", label: "100–119 m²", params: { size_band: "WFL100B119" } },
];

export function Finder() {
  const [budget, setBudget] = useState(700);
  const [sqm, setSqm] = useState(55);
  const [seg, setSeg] = useState("s2");
  const [rows, setRows] = useState<FinderResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [src, setSrc] = useState<{ rooms: KreisAskingRent[]; sizes: SizeRow[]; aff: KreisAffordability[] } | null>(null);
  useEffect(() => {
    Promise.all([
      loadJson<KreisAskingRent[]>("kreise-asking-rents.json"),
      loadJson<SizeRow[]>("kreise-rents-by-size.json"),
      loadJson<KreisAffordability[]>("kreise-affordability.json"),
    ]).then(([rooms, sizes, aff]) => setSrc({ rooms, sizes, aff })).catch((e) => setErr(String(e)));
  }, []);

  // Same rule as the API's /affordability/finder: estimated asking rent x size <= budget, largest Kreise first.
  useEffect(() => {
    if (!src || !budget || !sqm) return;
    const p = SEGMENTS.find((s) => s.value === seg)!.params;
    const affBy = Object.fromEntries(src.aff.map((a) => [a.ags, a]));
    const seg_ = p.size_band
      ? src.sizes.filter((r) => r.size_band_code === p.size_band)
      : src.rooms.filter((r) => r.rooms === p.rooms);
    const out: FinderResult[] = [];
    for (const r of seg_) {
      const est = r.estimated_asking_rent_eur_sqm, a = affBy[r.ags];
      if (est == null || !a || est * sqm > budget) continue;
      out.push({ ags: r.ags, kreis_name: r.kreis_name, land_name: a.land_name, rent_eur_sqm: r.rent_eur_sqm,
        estimated_asking_rent_eur_sqm: est, estimate_method: r.estimate_method ?? "", estimated_monthly_rent_eur: Math.round(est * sqm),
        headroom_eur: Math.round(budget - est * sqm), affordability_index: a.affordability_index, population: a.population });
    }
    out.sort((x, y) => (y.population ?? 0) - (x.population ?? 0));
    setRows(out);
  }, [src, budget, sqm, seg]);

  return (
    <section className="panel c12">
      <h2>Where does my budget work?</h2>
      <p className="sub">Estimated asking rent today (Zensus 2022 by flat type, uplifted by the asking premium seen in GREIX cities). Estimates, not listings.</p>
      <form className="row" onSubmit={(e) => e.preventDefault()}>
        <div className="field"><label htmlFor="budget">Max cold rent, € / month</label>
          <input id="budget" type="number" min={100} step={25} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></div>
        <div className="field"><label htmlFor="sqm">Size, m²</label>
          <input id="sqm" type="number" min={15} max={200} step={5} value={sqm} onChange={(e) => setSqm(Number(e.target.value))} /></div>
        <div className="field"><label htmlFor="seg">Flat type</label>
          <select id="seg" value={seg} onChange={(e) => setSeg(e.target.value)}>
            {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></div>
      </form>
      {err && <p className="note">Could not load results: {err}</p>}
      {rows && (
        <>
          <p className="note">{rows.length} of 400 Kreise fit {eur(budget, 0)} for {sqm} m², largest first.</p>
          <div className="tablewrap" style={{ maxHeight: 520, overflowY: "auto" }}>
            <table>
              <thead><tr><th>Kreis</th><th>Land</th><th className="num">Est. €/m²</th><th className="num">Est. rent / month</th><th className="num">Headroom</th><th className="num">Affordability</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ags}>
                    <td>{r.kreis_name}</td><td>{r.land_name}</td>
                    <td className="num">{eur(r.estimated_asking_rent_eur_sqm)}</td>
                    <td className="num">{eur(r.estimated_monthly_rent_eur, 0)}</td>
                    <td className="num">{eur(r.headroom_eur, 0)}</td>
                    <td className="num">{num(r.affordability_index)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
