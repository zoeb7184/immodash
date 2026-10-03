import type { Metadata } from "next";
import Link from "next/link";
import { SupplyDemandScatter } from "@/components/SupplyDemandCharts";
import { data } from "@/lib/data";
import { num, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Supply & demand" };


function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num_ = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num_ += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num_ / Math.sqrt(da * db);
}

export default function SupplyDemand() {
  const kreise = data.supplyDemand(), cities = data.citySupplyDemand(), snaps = data.cities();
  const slugOf = Object.fromEntries(snaps.map((s) => [s.city, s.slug]));
  const big = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Bielefeld", "Leipzig", "Chemnitz"];
  const highlight = Object.fromEntries(snaps.filter((s) => big.includes(s.city)).map((s) => [s.ags, s.city_en]));
  const ok = cities.filter((c) => c.supply_demand_index != null && c.demand_pressure_score != null);
  const r = pearson(ok.map((c) => c.supply_demand_index!), ok.map((c) => c.demand_pressure_score!));
  const counts = { tight: 0, balanced: 0, slack: 0 } as Record<string, number>;
  kreise.forEach((k) => counts[k.market_balance]++);
  const sorted = [...kreise].sort((a, b) => b.supply_demand_index - a.supply_demand_index);

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Vacancy vs. population growth</div>
        <h1>Where demand outruns the housing stock</h1>
        <p className="lede">
          Supply slack is the share of flats in multi-dwelling buildings that were empty and on the market in the 2022
          census. Demand is population growth over five years. The composite index is z(growth) − z(vacancy).
          Across the 37 GREIX cities it agrees with live listing pressure: Pearson r = {r.toFixed(2)}.
        </p>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="label">Tight</span><span className="value">{counts.tight}<span className="unit">Kreise</span></span><span className="sub">index ≥ 1</span></div>
        <div className="kpi"><span className="label">Balanced</span><span className="value">{counts.balanced}<span className="unit">Kreise</span></span><span className="sub">between −1 and 1</span></div>
        <div className="kpi"><span className="label">Slack</span><span className="value">{counts.slack}<span className="unit">Kreise</span></span><span className="sub">index ≤ −1</span></div>
        <div className="kpi"><span className="label">Agreement with live market</span><span className="value">r = {r.toFixed(2)}</span><span className="sub">vs. GREIX days on market and quick lets</span></div>
      </div>
      <div className="grid">
        <section className="panel c8">
          <h2>400 Kreise</h2>
          <p className="sub">Bubble size = population · dashed lines = medians · outlined = major cities</p>
          <SupplyDemandScatter data={kreise} highlight={highlight} />
        </section>
        <section className="panel c4">
          <h2>Tightest and slackest</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Kreis</th><th className="num">Vacancy</th><th className="num">Pop. 5y</th><th className="num">Index</th></tr></thead>
              <tbody>
                {[...sorted.slice(0, 8), ...sorted.slice(-8)].map((k, i) => (
                  <tr key={k.ags} style={i === 8 ? { borderTop: "2px solid var(--line)" } : undefined}>
                    <td>{k.kreis_name.split(",")[0]}</td>
                    <td className="num">{pct(k.market_active_vacancy_pct)}</td>
                    <td className="num">{pct(k.population_growth_5y_pct, 1, true)}</td>
                    <td className="num"><span className={`pill ${k.market_balance}`}>{k.supply_demand_index.toFixed(2)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel c12">
          <h2>Cities: structure vs. live market</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>City</th><th>Market</th><th className="num">Vacancy</th><th className="num">Population 5y</th><th className="num">Days on market</th><th className="num">Live pressure</th></tr></thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.city}>
                    <td><Link href={`/cities/${slugOf[c.city]}`}>{c.city_en}</Link></td>
                    <td><span className={`pill ${c.market_balance}`}>{c.market_balance}</span></td>
                    <td className="num">{pct(c.market_active_vacancy_pct)}</td>
                    <td className="num">{pct(c.population_growth_5y_pct, 1, true)}</td>
                    <td className="num">{num(c.time_on_market_days_4q)}</td>
                    <td className="num">{c.demand_pressure_score?.toFixed(2) ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
