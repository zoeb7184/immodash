import { OverviewExplorer, type CompactPoint } from "@/components/OverviewExplorer";
import { data } from "@/lib/data";
import { eur, month, num, pct } from "@/lib/format";

export default function Overview() {
  const cities = data.cities();
  const monthly: CompactPoint[] = data.monthly()
    .filter((r) => r.median_rent_sqm != null)
    .map((r) => ({ c: r.city, d: r.period_date, m: r.median_rent_sqm as number }));
  const forecasts = data.forecasts().filter((f) => f.horizon_months === 12);
  const rates = data.rates();
  const sd = data.supplyDemand();
  const meta = data.meta();
  const medians = cities.map((c) => c.median_rent_sqm).sort((a, b) => a - b);
  const rising = cities.filter((c) => (c.index_yoy_pct ?? 0) > 0).length;
  const rate = rates[rates.length - 1];
  const tight = sd.filter((k) => k.market_balance === "tight").length;

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Asking rents to {month(meta.latest_month)} · data refreshed {meta.generated_at.slice(0, 10)}</div>
        <h1>Where renting in Germany is getting harder</h1>
        <p className="lede">
          Asking rents for 37 cities, Zensus 2022 rents and vacancy for all 400 Kreise, income-based affordability and
          12-month forecasts, rebuilt every week from official and academic open data.
        </p>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="label">Median city asking rent</span><span className="value">{eur(medians[Math.floor(medians.length / 2)])}<span className="unit">/m²</span></span><span className="sub">across 37 cities</span></div>
        <div className="kpi"><span className="label">Cities with rising rents</span><span className="value">{rising}<span className="unit">of {cities.length}</span></span><span className="sub">year on year</span></div>
        <div className="kpi"><span className="label">Tight housing markets</span><span className="value">{tight}<span className="unit">Kreise</span></span><span className="sub">low vacancy, growing population</span></div>
        <div className="kpi"><span className="label">Housing-loan rate</span><span className="value">{num(rate.rate_pct, 2)}<span className="unit">%</span></span><span className="sub">{month(rate.period_date)} · {pct(rate.change_12m_pp, 2, true).replace("%", " pp")} YoY</span></div>
      </div>
      <OverviewExplorer cities={cities} monthly={monthly} forecasts={forecasts} />
    </>
  );
}
