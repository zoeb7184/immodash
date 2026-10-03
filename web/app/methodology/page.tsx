import type { Metadata } from "next";
import { BacktestChart } from "@/components/BacktestChart";
import { Figure, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { num, pct } from "@/lib/format";

export const metadata: Metadata = { title: "How it works", description: "The data pipeline, models and checks behind ImmoDash, explained." };

const STEPS = [
  { n: "1", t: "Collect", d: "Ten open datasets: Zensus 2022, GREIX listings, Bundesbank loan rates, regional incomes, district boundaries.", tech: "Python ingestion, raw files kept as-is (bronze)" },
  { n: "2", t: "Clean and test", d: "Tables are joined to Germany's 400 districts and checked automatically: no gaps, no impossible values.", tech: "dbt on DuckDB / PostgreSQL, 63 data tests" },
  { n: "3", t: "Model", d: "A forecasting model predicts each city's rent 3, 6 and 12 months ahead, and unusual months are flagged.", tech: "LightGBM quantile regression, conformal intervals, robust z-scores" },
  { n: "4", t: "Serve", d: "Every number on this site comes from one typed interface, so the website and analyst tools never disagree.", tech: "FastAPI, 25 endpoints, Pydantic contracts" },
  { n: "5", t: "Explain", d: "An AI model writes each city summary from a fixed list of facts. If it uses a number that is not in the list, the text is thrown away.", tech: "Groq LLM + numeric grounding check" },
  { n: "6", t: "Publish", d: "Every Monday the whole chain reruns and this site is rebuilt from the fresh data.", tech: "GitHub Actions, Next.js static export on Vercel" },
];

const METRICS: { k: string; plain: string; formula: string }[] = [
  { k: "Asking rent", plain: "The middle price per m² of flats advertised for rent in a month. Half of the listings cost more, half cost less.", formula: "Median of listing prices, GREIX hedonic index (adjusts for flat size and quality)" },
  { k: "New-lease premium", plain: "How much more someone signing a lease today pays than the average existing tenant paid in 2022.", formula: "Asking rent ÷ Zensus 2022 average contract rent − 1" },
  { k: "Rent burden", plain: "How much of a typical household's income the rent for a 60 m² flat would take.", formula: "Rent × 60 m² × 12 ÷ (2 × disposable income per resident)" },
  { k: "Affordability index", plain: "The rent burden compared with the typical German district: 100 is average, higher is more affordable.", formula: "Median district burden ÷ district burden × 100" },
  { k: "Estimated asking rent (districts)", plain: "For districts without listing data: the census rent raised by the gap between census and asking rents seen in nearby tracked cities.", formula: "Zensus rent × (1 + premium of the city, else state median, else national median)" },
  { k: "Supply-demand index", plain: "High when few flats are empty and the population is growing.", formula: "z(population growth 2018 to 2023) − z(empty and available flats, 2022); ≥ 1 tight, ≤ −1 slack" },
  { k: "Live market pressure", plain: "How quickly flats are let in practice: days online and the share gone within a week.", formula: "Mean z-score of (inverted) days on market and share let within a week, per quarter" },
  { k: "Unusual month", plain: "A month where one city moved far more than the others, compared with its own last two years.", formula: "City change minus all-city median change; robust z vs. previous 24 months; |z| ≥ 3.5" },
];

const MODEL_NAMES: Record<string, string> = { lightgbm: "ImmoDash model", drift_last_12m: "Trend continues", naive_no_change: "No change" };

export default function Methodology() {
  const sources = data.sources(), bt = data.backtest(), meta = data.meta();
  const get = (h: number, m: string) => bt.find((b) => b.horizon_months === h && b.model === m);
  const lg12 = get(12, "lightgbm"), nv12 = get(12, "naive_no_change"), tr12 = get(12, "drift_last_12m");
  const better = lg12 && nv12 ? Math.round((1 - lg12.mape_pct / nv12.mape_pct) * 100) : null;
  return (
    <>
      <header className="hero" style={{ paddingBottom: 12 }}>
        <div className="wrap">
          <div className="read">
            <div className="kicker">Behind the data</div>
            <h1>How ImmoDash works</h1>
            <p className="dek">ImmoDash turns ten public datasets into one consistent picture of the German rental market, tests every number, and
              rebuilds itself every week. Here is the whole chain, in plain words first and technical detail second.</p>
            <div className="byline"><span>Last run {meta.generated_at.slice(0, 10)}</span><span>{meta.files} data files</span>
              {meta.summaries_by_llm > 0 && <span>{meta.summaries_by_llm} AI-written city summaries</span>}</div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <ol className="reveal" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, counterReset: "s" }}>
            {STEPS.map((s, i) => (
              <li key={s.n} className="card" style={{ position: "relative", display: "grid", gap: 6, alignContent: "start" }}>
                <span style={{ width: 30, height: 30, borderRadius: 15, background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", font: "700 14px var(--sans)" }}>{s.n}</span>
                <h3 style={{ margin: 0, fontSize: 19 }}>{s.t}</h3>
                <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)" }}>{s.d}</p>
                <p className="note" style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{s.tech}</p>
                {i < STEPS.length - 1 && <span aria-hidden style={{ position: "absolute", right: -11, top: 18, color: "var(--muted)", fontSize: 16 }}>→</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="chapter">
        <div className="wrap">
          <div className="read reveal">
            <div className="chapter-num">Can you trust the forecast?</div>
            <h2>We tested the model on data it had never seen</h2>
            <div className="prose">
              <p>To judge a forecast fairly you have to pretend it is the past. We repeatedly cut the data at an earlier month, trained the model only
                on what was known then, forecast ahead, and compared the forecast with what actually happened. We did this for 12 starting points across
                all 37 cities.</p>
              {lg12 && nv12 && tr12 && <p>Over 12 months the model was off by <strong>{pct(lg12.mape_pct, 2)}</strong> on average. Simply assuming
                rents stay the same was off by {pct(nv12.mape_pct, 2)}, and extending last year&apos;s trend by {pct(tr12.mape_pct, 2)}.
                {better != null && <> That is about {better}% smaller errors than the no-change guess.</>} And {num(lg12.coverage_80_pct)}% of real outcomes
                fell inside the model&apos;s 80% range, close to the 80% it promises.</p>}
            </div>
          </div>
          <Figure title="Average forecast error, lower is better" sub="Mean absolute percentage error, out-of-sample, 12 rolling origins × 37 cities."
            source="ImmoDash back-test." numbers={<table><thead><tr><th>Horizon</th><th>Model</th><th className="num">Error</th><th className="num">80% range hit rate</th></tr></thead>
              <tbody>{bt.map((b) => <tr key={b.horizon_months + b.model}><td>{b.horizon_months} months</td><td>{MODEL_NAMES[b.model] ?? b.model}</td><td className="num">{pct(b.mape_pct, 2)}</td><td className="num">{b.coverage_80_pct != null ? pct(b.coverage_80_pct, 0) : "–"}</td></tr>)}</tbody></table>}>
            <BacktestChart data={bt} />
          </Figure>
          <div className="read">
            <Takeaway label="In short">
              The model beats the obvious shortcuts at every horizon, and its ranges are honest. It still only knows past rents, so it cannot foresee
              new laws or a sudden building boom.
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="chapter">
        <div className="wrap">
          <div className="read reveal">
            <div className="chapter-num">Definitions</div>
            <h2>What each number means</h2>
          </div>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 18 }}>
            {METRICS.map((m) => (
              <div key={m.k} className="card" style={{ display: "grid", gap: 6, alignContent: "start" }}>
                <h3 style={{ margin: 0, fontSize: 19 }}>{m.k}</h3>
                <p style={{ margin: 0, font: "400 16px/1.5 var(--serif)" }}>{m.plain}</p>
                <p className="note" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{m.formula}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="chapter">
        <div className="wrap split">
          <div className="reveal">
            <div className="chapter-num">Sources</div>
            <h2>Where the data comes from</h2>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Dataset</th><th>Licence</th></tr></thead>
                <tbody>{sources.map((s) => <tr key={s.key}><td className="wrap">{s.url ? <a href={s.url}>{s.publisher}</a> : s.publisher}</td><td className="wrap">{s.licence}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div className="card reveal" id="about">
            <div className="chapter-num">About</div>
            <h3 style={{ fontSize: 24 }}>Built by Zoeb Ali Khan</h3>
            <p style={{ font: "400 17px/1.55 var(--serif)", margin: "0 0 12px" }}>
              ImmoDash is an independent portfolio project: a full data platform, from raw government files to tested models, an API and this
              website, maintained automatically. It is not affiliated with any of the data providers.
            </p>
            <ul className="list" style={{ marginBottom: 14 }}>
              <li>Data engineering: medallion warehouse with dbt, DuckDB and PostgreSQL, Prefect orchestration</li>
              <li>Geo analytics: 380,000+ census grid cells mapped to all 400 districts</li>
              <li>Machine learning: LightGBM quantile forecasts, conformal calibration, anomaly detection</li>
              <li>Applied AI: grounded LLM summaries with automatic fact checking</li>
              <li>Product: FastAPI, Next.js, Plotly Dash, CI/CD with GitHub Actions</li>
            </ul>
            <p style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: 0 }}>
              <a className="btn" href="https://github.com/zoeb7184/immodash">Source code on GitHub</a>
              <a className="btn ghost" href="https://zoeb7184.github.io">Portfolio</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
