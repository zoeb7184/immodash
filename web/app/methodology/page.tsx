import type { Metadata } from "next";
import { BacktestChart } from "@/components/BacktestChart";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Methodology" };

const METRICS = [
  ["Rent burden (Kreis)", "Zensus 2022 rent × 60 m² × 12 ÷ (2 × disposable income per resident, 2022)"],
  ["Affordability index", "Median Kreis burden ÷ Kreis burden × 100; above 100 is more affordable"],
  ["Estimated asking rent", "Zensus rent × (1 + asking premium): the city's own GREIX premium, else the Land median, else the national median"],
  ["Supply-demand index", "z(population growth 2018–2023) − z(market-active vacancy 2022); ≥ 1 tight, ≤ −1 slack"],
  ["Demand pressure", "Mean z-score of (inverted) days on market and share of listings gone within a week, per quarter"],
  ["Forecast", "LightGBM quantile models per horizon on the hedonic rent index; 80% band widened by sequential split-conformal calibration"],
  ["Anomaly", "City month-on-month change minus the all-city median, robust z vs. the previous 24 months; |z| ≥ 3.5"],
  ["Market summary", "LLM (Groq) or template text from a facts object; any number not in the facts rejects the LLM draft"],
];

export default function Methodology() {
  const sources = data.sources(), bt = data.backtest(), meta = data.meta();
  const lg = (h: number) => bt.find((b) => b.horizon_months === h && b.model === "lightgbm");
  return (
    <>
      <div className="page-head">
        <div className="eyebrow">How the numbers are made</div>
        <h1>Methodology</h1>
        <p className="lede">Raw public files land in a bronze layer, dbt builds tested silver and gold tables (63 data tests), a
          Python step adds forecasts and anomaly flags, and a typed FastAPI service feeds this site and the analyst dashboard.
          A weekly GitHub Actions job reruns the whole chain and publishes a fresh snapshot of the API as static files
          (last run {meta.generated_at.slice(0, 10)}, {meta.files} files).</p>
      </div>
      <div className="grid">
        <section className="panel c7">
          <h2>Forecast accuracy, out of sample</h2>
          <p className="sub">Mean absolute % error over 12 rolling origins × 37 cities, lower is better · 80% interval coverage:
            {" "}{[3, 6, 12].map((h) => `${h} m ${lg(h)?.coverage_80_pct?.toFixed(0)}%`).join(" · ")}</p>
          <BacktestChart data={bt} />
        </section>
        <section className="panel c5">
          <h2>Definitions</h2>
          <div className="tablewrap"><table><tbody>
            {METRICS.map(([k, v]) => <tr key={k}><td style={{ whiteSpace: "normal", fontWeight: 600, verticalAlign: "top" }}>{k}</td><td style={{ whiteSpace: "normal" }}>{v}</td></tr>)}
          </tbody></table></div>
        </section>
        <section className="panel c12">
          <h2>Sources and licences</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Dataset</th><th>Licence</th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.key}><td style={{ whiteSpace: "normal" }}>{s.url ? <a href={s.url}>{s.publisher}</a> : s.publisher}</td><td style={{ whiteSpace: "normal" }}>{s.licence}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>
    </>
  );
}
