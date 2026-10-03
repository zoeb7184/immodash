import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BezirkeChart } from "@/components/BezirkeChart";
import { ForecastChart } from "@/components/ForecastChart";
import { GridHeatmap } from "@/components/GridHeatmap";
import { PressureChart } from "@/components/PressureChart";
import { data } from "@/lib/data";
import { eur, month, num, pct } from "@/lib/format";

type Props = { params: Promise<{ city: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return data.cities().map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).city;
  return { title: data.cities().find((c) => c.slug === slug)?.city_en ?? "City" };
}

export default async function CityPage({ params }: Props) {
  const slug = (await params).city;
  const cities = data.cities();
  const snap = cities.find((c) => c.slug === slug);
  if (!snap) notFound();
  const city = snap.city;
  const history = data.monthly().filter((r) => r.city === city);
  const forecasts = data.forecasts().filter((f) => f.city === city);
  const anomalies = data.anomalies().filter((a) => a.city === city);
  const pressure = data.pressure().filter((p) => p.city === city);
  const summary = data.summary(slug);
  const kreis = data.supplyDemand().find((k) => k.ags === snap.ags);
  const bez = data.bezirke().filter((b) => b.bezirk_code.startsWith(snap.ags));
  const rank = [...cities].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm).findIndex((c) => c.city === city) + 1;
  const f12 = forecasts.find((f) => f.horizon_months === 12);
  const llm = summary.generated_by.startsWith("groq");

  return (
    <>
      <div className="page-head">
        <div className="eyebrow"><Link href="/">Overview</Link> / {snap.land_name} · AGS {snap.ags} · {month(snap.latest_month)}</div>
        <h1>{snap.city_en}</h1>
        <p className="lede">
          #{rank} of {cities.length} cities by asking rent.
          {snap.mapping_type !== "exact" && " Income, Zensus and grid figures cover the surrounding Kreis."}
        </p>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="label">Median asking rent</span><span className="value">{num(snap.median_rent_sqm, 2)}<span className="unit">€/m²</span></span>
          <span className={`sub ${(snap.index_yoy_pct ?? 0) >= 0 ? "up" : "down"}`}>{(snap.index_yoy_pct ?? 0) >= 0 ? "▲" : "▼"} {pct(Math.abs(snap.index_yoy_pct ?? 0))} YoY · {pct(snap.index_5y_pct, 1, true)} in 5 years</span></div>
        <div className="kpi"><span className="label">60 m² flat, cold</span><span className="value">{num(snap.reference_monthly_rent_eur)}<span className="unit">€/month</span></span>
          <span className="sub">{pct(snap.asking_premium_vs_existing_pct, 0)} above 2022 contract rents ({eur(snap.existing_contract_rent_sqm_2022)})</span></div>
        <div className="kpi"><span className="label">Rent burden</span><span className="value">{num(snap.asking_rent_burden_pct, 1)}<span className="unit">%</span></span>
          <span className="sub">of 2 residents&apos; disposable income ({snap.income_year})</span></div>
        <div className="kpi"><span className="label">Market</span><span className="value" style={{ textTransform: "capitalize" }}>{kreis?.market_balance ?? "–"}</span>
          <span className="sub">{num(kreis?.market_active_vacancy_pct, 1)}% vacancy · {num(snap.time_on_market_days_4q)} days on market</span></div>
        <div className="kpi"><span className="label">12-month forecast</span><span className="value">{num(f12?.p50_rent_sqm, 2)}<span className="unit">€/m²</span></span>
          <span className="sub">{pct(f12?.change_p50_pct, 1, true)} · 80% range {num(f12?.p10_rent_sqm, 2)}–{num(f12?.p90_rent_sqm, 2)}</span></div>
      </div>

      <div className="grid">
        <section className="panel c8">
          <h2>Rent outlook</h2>
          <p className="sub">Median asking rent, last 4 years, with the 3/6/12-month LightGBM forecast and its calibrated 80% band · ringed dots are detected anomalies</p>
          <ForecastChart history={history} forecasts={forecasts} anomalies={anomalies} />
        </section>
        <section className="panel c4 summary">
          <h2>Market summary</h2>
          <p className="note">{llm ? `Written by ${summary.generated_by.split(":")[1]}; every number checked against the data.` : "Generated from the data (template). Numbers are checked against the warehouse."}</p>
          {summary.text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
          <details><summary>Facts this summary is grounded in</summary><pre>{JSON.stringify(summary.facts, null, 2)}</pre></details>
        </section>

        <section className="panel c7">
          <h2>Rent across the city, 100 m grid</h2>
          <p className="sub">Zensus 2022 average net cold rent per grid cell (existing contracts) · colour scale clipped to P2–P98 · hover for values</p>
          <GridHeatmap ags={snap.ags} />
        </section>
        <section className="panel c5">
          <h2>How fast flats are let</h2>
          <p className="sub">Days a listing stays online, rolling 4 quarters (GREIX) · lower means a tighter market</p>
          <PressureChart data={pressure} />
          {bez.length > 0 && (<>
            <h2 style={{ marginTop: 8 }}>Bezirke</h2>
            <p className="sub">Zensus 2022 rent per m², red = above the city average</p>
            <BezirkeChart data={bez} />
          </>)}
          <h2 style={{ marginTop: 8 }}>Detected anomalies</h2>
          <div className="list">
            {anomalies.length === 0 && <span>No unusual monthly moves detected.</span>}
            {anomalies.slice(0, 6).map((a) => (
              <span key={a.period_date}>
                <b className={a.direction === "spike" ? "up" : "down"}>{a.direction === "spike" ? "▲" : "▼"}</b> {month(a.period_date)}:{" "}
                {pct(a.mom_pct, 1, true)} month on month vs. {pct(a.market_mom_pct, 1, true)} for all cities (z = {a.robust_z.toFixed(1)})
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
