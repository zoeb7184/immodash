import type { Metadata } from "next";
import { BacktestChart } from "@/components/BacktestChart";
import { Figure, Head, Takeaway } from "@/components/ui";
import { Cite } from "@/components/Cite";
import { data } from "@/lib/data";
import { REFERENCES } from "@/lib/references";
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

const METRICS: { k: string; plain: string; formula: string; refs?: string[] }[] = [
  { k: "Asking rent", plain: "The middle price per m² of flats advertised for rent in a month. Half of the listings cost more, half cost less.", formula: "Median of listing prices, GREIX hedonic index (adjusts for flat size and quality)", refs: ["greix-rent", "eurostat2013"] },
  { k: "New-lease premium", plain: "How much more someone signing a lease today pays than the average existing tenant paid in 2022.", formula: "Asking rent ÷ Zensus 2022 average contract rent − 1", refs: ["bbsr-rents"] },
  { k: "Rent burden", plain: "How much of a typical household's income the rent for a 60 m² flat would take.", formula: "Rent × 60 m² × 12 ÷ (2 × disposable income per resident)" },
  { k: "Affordability index", plain: "The rent burden compared with the typical German district: 100 is average, higher is more affordable.", formula: "Median district burden ÷ district burden × 100" },
  { k: "Estimated asking rent (districts)", plain: "For districts without listing data: the census rent raised by the gap between census and asking rents seen in nearby tracked cities.", formula: "Zensus rent × (1 + premium of the city, else state median, else national median)" },
  { k: "Supply-demand index", plain: "High when few flats are empty and the population is growing.", formula: "z(population growth 2018 to 2023) − z(empty and available flats, 2022); ≥ 1 tight, ≤ −1 slack", refs: ["bgb556d", "saxony2022"] },
  { k: "Live market pressure", plain: "How quickly flats are let in practice: days online and the share gone within a week.", formula: "Mean z-score of (inverted) days on market and share let within a week, per quarter" },
  { k: "Unusual month", plain: "A month where one city moved far more than the others, compared with its own last two years.", formula: "City change minus all-city median change; robust z vs. previous 24 months; |z| ≥ 3.5", refs: ["iglewicz1993"] },
];

const MODEL_NAMES: Record<string, string> = { lightgbm: "ImmoDash model", drift_last_12m: "Trend continues", naive_no_change: "No change" };

export default function Methodology() {
  const sources = data.sources(), bt = data.backtest(), meta = data.meta();
  const get = (h: number, m: string) => bt.find((b) => b.horizon_months === h && b.model === m);
  const lg12 = get(12, "lightgbm"), nv12 = get(12, "naive_no_change"), tr12 = get(12, "drift_last_12m");
  const better = lg12 && nv12 ? Math.round((1 - lg12.mape_pct / nv12.mape_pct) * 100) : null;
  return (
    <>
      <header className="hero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <h1 className="enter">How ImmoDash works</h1>
          <p className="lead enter">Ten public datasets become one tested picture of the German rental market, rebuilt automatically every week.</p>
          <p className="meta enter" style={{ marginTop: 14 }}>
            Last run {meta.generated_at.slice(0, 10)}, {meta.files} data files{meta.summaries_by_llm > 0 && <>, {meta.summaries_by_llm} AI-written city summaries</>}.
          </p>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>From raw files to this page</h2>
            <p className="prose" style={{ marginTop: 14 }}>Each step is automated and tested. If any step fails, nothing is published and the site keeps the last good data.</p>
          </div>
          <ol className="steps reveal">
            {STEPS.map((st) => (
              <li key={st.n}>
                <span className="n">{st.n.padStart(2, "0")}</span>
                <div><h3>{st.t}</h3><p>{st.d}</p></div>
                <span className="tech">{st.tech}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title="We tested the model on data it had never seen">
            We repeatedly cut the data at an earlier month, trained only on what was known then, and compared the forecast with what happened.
            Twelve starting points, all 37 cities.<Cite id="hyndman2021" />
          </Head>
          <div className="split wl">
            <Figure title="Average forecast error, lower is better" sub="Mean absolute percentage error, out of sample."
              source="ImmoDash back-test." numbers={<table><thead><tr><th>Horizon</th><th>Model</th><th className="num">Error</th><th className="num">80% range hit rate</th></tr></thead>
                <tbody>{bt.map((b) => <tr key={b.horizon_months + b.model}><td>{b.horizon_months} months</td><td>{MODEL_NAMES[b.model] ?? b.model}</td><td className="num">{pct(b.mape_pct, 2)}</td><td className="num">{b.coverage_80_pct != null ? pct(b.coverage_80_pct, 0) : "n/a"}</td></tr>)}</tbody></table>}>
              <BacktestChart data={bt} />
            </Figure>
            <div className="reveal">
              {lg12 && nv12 && tr12 && <div className="prose"><p>Over 12 months the model was off by <strong>{pct(lg12.mape_pct, 2)}</strong> on average. Assuming
                rents stay the same was off by {pct(nv12.mape_pct, 2)}, and extending last year&apos;s trend by {pct(tr12.mape_pct, 2)}.
                {better != null && <> That is about {better}% smaller errors than the no-change guess.</>}</p>
                <p>{num(lg12.coverage_80_pct)}% of real outcomes fell inside the model&apos;s 80% range, close to the 80% it promises.</p></div>}
              <Takeaway label="In short">
                The model beats the obvious shortcuts at every horizon, and its ranges are honest. It only knows past rents, so it cannot foresee
                new laws or a sudden building boom.
              </Takeaway>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title="What each number means" />
          <div className="defs reveal">
            {METRICS.map((m) => (
              <div key={m.k}>
                <h3>{m.k}</h3>
                <p>{m.plain}</p>
                <code>{m.formula}</code>{m.refs && <p className="def-refs">Based on <Cite id={m.refs} /></p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section band" id="references" style={{ scrollMarginTop: 72 }}>
        <div className="wrap">
          <Head title="References">
            Every explanation on this site that goes beyond our own numbers links to one of these publications. The numbers in square
            brackets, such as <Cite id="lebuhn2017" />, point here. The datasets themselves are listed under Sources below.
          </Head>
          <ol className="refs reveal">
            {REFERENCES.map((r) => (
              <li key={r.id} id={`ref-${r.id}`}>
                <p className="ref-cite">
                  {r.authors} ({r.year}). <a href={r.url} target="_blank" rel="noopener noreferrer"><cite>{r.title}</cite></a>. {r.venue}.
                </p>
                <p className="ref-use"><b>Used for:</b> {r.supports}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="reveal" id="about">
            <h2>About</h2>
            <p className="prose" style={{ marginTop: 14 }}>
              ImmoDash is an independent portfolio project by Zoeb Ali Khan: a full data platform from raw government files to tested models,
              an API and this website, maintained automatically. It is not affiliated with any of the data providers.
            </p>
            <ul className="list" style={{ margin: "18px 0 24px" }}>
              <li><b style={{ color: "var(--ink)" }}>Data engineering:</b> medallion warehouse with dbt, DuckDB and PostgreSQL, Prefect orchestration</li>
              <li><b style={{ color: "var(--ink)" }}>Geo analytics:</b> 380,000+ census grid cells mapped to all 400 districts</li>
              <li><b style={{ color: "var(--ink)" }}>Machine learning:</b> LightGBM quantile forecasts, conformal calibration, anomaly detection</li>
              <li><b style={{ color: "var(--ink)" }}>Applied AI:</b> grounded LLM summaries with automatic fact checking</li>
              <li><b style={{ color: "var(--ink)" }}>Product:</b> FastAPI, Next.js, Plotly Dash, CI/CD with GitHub Actions</li>
            </ul>
            <div className="hero-cta" style={{ marginTop: 0 }}>
              <a className="btn" href="https://github.com/zoeb7184/immodash">View the source</a>
              <a className="textlink" href="https://zoeb7184.github.io">Portfolio</a>
            </div>
          </div>
          <div className="reveal" id="sources" style={{ scrollMarginTop: 96 }}>
            <h2>Sources</h2>
            <div className="tablewrap" style={{ marginTop: 18 }}>
              <table>
                <thead><tr><th>Dataset</th><th>Licence</th></tr></thead>
                <tbody>{sources.map((src) => <tr key={src.key}><td className="wrap">{src.url ? <a href={src.url}>{src.publisher}</a> : src.publisher}</td><td className="wrap">{src.licence}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
