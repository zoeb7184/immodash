import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BezirkeChart } from "@/components/BezirkeChart";
import { CitySwitcher } from "@/components/CitySwitcher";
import { ForecastChart, type HistPoint } from "@/components/ForecastChart";
import { GridHeatmap } from "@/components/GridHeatmap";
import { PressureChart } from "@/components/PressureChart";
import { RankStrips, type Strip } from "@/components/RankStrips";
import { RentCheck } from "@/components/RentCheck";
import { Term } from "@/components/Term";
import { Figure, Head, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { eur, inN, monthLong, num, ordinal, pct } from "@/lib/format";
import { rentCheckCities } from "@/lib/story";

type Props = { params: Promise<{ city: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return data.cities().map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).city;
  const c = data.cities().find((x) => x.slug === slug);
  return {
    title: c ? `Rents in ${c.city_en}` : "City",
    description: c ? `What renting in ${c.city_en} costs: ${c.median_rent_sqm.toFixed(2)} €/m² asking rent, affordability, neighbourhood map and a 12-month outlook.` : undefined,
  };
}

export default async function CityPage({ params }: Props) {
  const slug = (await params).city;
  const cities = data.cities();
  const snap = cities.find((c) => c.slug === slug);
  if (!snap) notFound();
  const city = snap.city;
  const monthly = data.monthly();
  const history: HistPoint[] = monthly.filter((r) => r.median_rent_sqm != null).map((r) => ({ c: r.city, d: r.period_date, m: r.median_rent_sqm as number }));
  const forecasts = data.forecasts();
  const own = forecasts.filter((f) => f.city === city);
  const anomalies = data.anomalies().filter((a) => a.city === city);
  const pressure = data.pressure().filter((p) => p.city === city);
  const summary = data.summary(slug);
  const kreis = data.supplyDemand().find((k) => k.ags === snap.ags);
  const sdCity = data.citySupplyDemand().find((c) => c.city === city);
  const bez = data.bezirke().filter((b) => b.bezirk_code.startsWith(snap.ags));
  const byRent = [...cities].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm);
  const rank = byRent.findIndex((c) => c.city === city) + 1;
  const idx = [...cities].sort((a, b) => a.city_en.localeCompare(b.city_en)).findIndex((c) => c.city === city);
  const alpha = [...cities].sort((a, b) => a.city_en.localeCompare(b.city_en));
  const prev = alpha[(idx - 1 + alpha.length) % alpha.length], next = alpha[(idx + 1) % alpha.length];
  const f12 = own.find((f) => f.horizon_months === 12);
  const llm = summary.generated_by.startsWith("groq");
  const flat = (snap.reference_monthly_rent_eur ?? snap.median_rent_sqm * 60);
  const lastP = pressure[pressure.length - 1];
  const yoy = snap.index_yoy_pct ?? 0;
  const tense = (kreis?.market_balance ?? sdCity?.market_balance) ?? null;
  const notExact = snap.mapping_type !== "exact";

  const strips: Strip[] = [
    { key: "rent", label: "Asking rent", fmt: { d: 2, suffix: " €/m²" }, higherIs: "most expensive", lowerIs: "cheapest",
      values: cities.map((c) => ({ city: c.city, city_en: c.city_en, v: c.median_rent_sqm })) },
    { key: "yoy", label: "Change in the last 12 months", fmt: { d: 1, suffix: "%", sign: true }, higherIs: "fastest rise", lowerIs: "weakest",
      values: cities.map((c) => ({ city: c.city, city_en: c.city_en, v: c.index_yoy_pct })) },
    { key: "burden", label: "Rent burden (60 m², two residents' income)", fmt: { d: 1, suffix: "%" }, higherIs: "least affordable", lowerIs: "most affordable",
      values: cities.map((c) => ({ city: c.city, city_en: c.city_en, v: c.asking_rent_burden_pct })) },
    { key: "premium", label: "Extra for a new lease vs. 2022 tenants", fmt: { d: 0, suffix: "%", sign: true }, higherIs: "largest gap", lowerIs: "smallest gap",
      values: cities.map((c) => ({ city: c.city, city_en: c.city_en, v: c.asking_premium_vs_existing_pct })) },
    { key: "dom", label: "Days a listing stays online", fmt: { d: 0, suffix: " days" }, higherIs: "slowest market", lowerIs: "fastest market",
      values: cities.map((c) => ({ city: c.city, city_en: c.city_en, v: c.time_on_market_days_4q })) },
  ];

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="crumbs enter" style={{ marginBottom: 28 }}>
            <Link href="/">ImmoDash</Link><span>/</span><Link href="/cities">Cities</Link><span>/</span><span>{snap.city_en}</span>
            <span style={{ marginLeft: "auto" }}><CitySwitcher cities={cities} current={slug} /></span>
          </div>
          <div className="hero-grid">
            <div>
              <h1 className="enter">Renting in {snap.city_en}</h1>
              <p className="lead enter">
                A new lease costs <b style={{ color: "var(--ink)" }}>{eur(snap.median_rent_sqm)}</b> per m², {rank === 1 ? "the highest" : rank === cities.length ? "the lowest" : `the ${ordinal(rank)} highest`} of
                {" "}{cities.length} cities, {yoy >= 0 ? "up" : "down"} {pct(Math.abs(yoy), 1)} on a year ago{tense && <> in a <b style={{ color: "var(--ink)" }}>{tense}</b> market</>}.
              </p>
              <p className="meta enter" style={{ marginTop: 14 }}>{snap.land_name && snap.land_name !== snap.city && snap.land_name !== snap.city_en ? `${snap.land_name}. ` : ""}Data up to {monthLong(snap.latest_month)}.</p>
            </div>
            <div className="panel enter" style={{ padding: "4px 24px" }}>
              <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Stat label="60 m² flat, cold" value={num(Math.round(flat / 10) * 10)} unit="€/mo"
                  say={<>Half of listings: {num(snap.p25_rent_sqm, 2)} to {num(snap.p75_rent_sqm, 2)} € per m².</>} />
                <Stat label="Five years" value={pct(snap.index_5y_pct, 0, true)} say={<>{pct(yoy, 1, true)} in the last 12 months.</>} />
                <Stat label="Rent burden" value={num(snap.asking_rent_burden_pct, 1)} unit="%"
                  say={<>of two average residents&apos; net income ({snap.income_year}).</>} />
                <Stat label="Next 12 months" value={pct(f12?.change_p50_pct, 1, true)}
                  say={f12 ? <>Likely {num(f12.p10_rent_sqm, 2)} to {num(f12.p90_rent_sqm, 2)} € per m².</> : "No forecast available."} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section tight">
        <div className="wrap split wl">
          <div className="reveal">
            <h2 style={{ marginBottom: 18 }}>The market in brief</h2>
            <div className="summary-lede">
              {summary.text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="ai-note">
              <span className="badge">{llm ? "AI-written" : "From the data"}</span>
              {llm ? <span>Written by an AI model ({summary.generated_by.split(":").slice(1).join(":")}). Every number was checked against the data before publishing.</span>
                : <span>Written from a template using the latest figures.</span>}
            </div>
            <details className="howto" style={{ marginTop: 6 }}>
              <summary>The facts this summary was allowed to use</summary>
              <div className="body"><pre>{JSON.stringify(summary.facts, null, 2)}</pre></div>
            </details>
          </div>
          <div className="panel reveal">
            <h3 style={{ marginBottom: 4 }}>How {snap.city_en} compares</h3>
            <p className="note" style={{ marginBottom: 18 }}>Each dot is one of the {cities.length} cities; blue is {snap.city_en}. Hover a grey dot to see which.</p>
            <RankStrips strips={strips} city={city} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={`Where rents in ${snap.city_en} are heading`}>
            The solid line is the median <Term k="asking-rent" /> each month; the dashed line and band are the model&apos;s forecast.
            {f12 && <> In a year, a 60 m² flat would most likely be listed at about <b style={{ color: "var(--ink)" }}>{num(Math.round((f12.p50_rent_sqm * 60) / 10) * 10)} €</b> a month,
              against {num(Math.round(flat / 10) * 10)} € today.</>}
          </Head>
          <Figure title={`Median asking rent in ${snap.city_en}, € per m²`}
            sub="Monthly, with the 3, 6 and 12-month forecast and its 80% range. Use the menu to compare another city."
            source="GREIX Mietpreisindex; ImmoDash forecast model."
            howto={<>
              <p>The band widens further into the future because uncertainty grows with time. In back-tests, about 8 out of 10 real outcomes fell
                inside bands like this one.</p>
              {anomalies.length > 0 && <p>Dashed circles mark <Term k="anomaly">unusual months</Term>: moves much larger than in the other cities that month.</p>}
            </>}>
            <ForecastChart city={city} cityEn={snap.city_en} history={history} forecasts={forecasts} anomalies={anomalies}
              others={alpha.filter((c) => c.city !== city).map((c) => ({ city: c.city, city_en: c.city_en }))} />
          </Figure>
          {anomalies.length > 0 && (
            <div className="split even reveal" style={{ marginTop: 36 }}>
              <div>
                <h3 style={{ marginBottom: 12 }}>Unusual months, in plain words</h3>
                <ul className="list">
                  {anomalies.slice(0, 4).map((a) => (
                    <li key={a.period_date}>
                      In {monthLong(a.period_date)} asking rents {a.direction === "spike" ? "jumped" : "fell"} {pct(Math.abs(a.mom_pct), 1)} in a single month,
                      while the typical city moved {pct(a.market_mom_pct, 1, true)}.
                    </li>
                  ))}
                </ul>
              </div>
              <p className="prose" style={{ margin: 0, alignSelf: "end" }}>Single-month jumps like these often reflect a batch of new-build or furnished
                listings rather than a real change in price. The longer trend is the better guide.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title="Not every street costs the same">
            The 2022 census recorded rents on existing leases for every 100 by 100 metre square. Darker blue is more expensive. These are
            existing contracts, cheaper than today&apos;s asking rents, but the pattern of dear and cheap areas is the same.
            {notExact && " For this city the map covers the whole surrounding district."}
          </Head>
          <div className={bez.length ? "split wl" : ""}>
            <Figure title={`Rent per 100 m square, ${snap.city_en}`} sub="Average net cold rent on existing contracts, May 2022. Hover for values."
              source="Zensus 2022 grid data (100 m); squares with too few flats are left out."
              howto={<p>The colour scale runs from the cheapest 2% to the most expensive 2% of squares, so a few extreme squares don&apos;t wash out the
                rest. A blank area means no or too few rented flats there (parks, industry, water) or the census suppressed the value.</p>}>
              <GridHeatmap ags={snap.ags} />
            </Figure>
            {bez.length > 0 && (
              <Figure title="By borough (Bezirk)" sub={`Average rent on existing leases, 2022. Red is above the ${snap.city_en} average, blue below.`}
                source="Zensus 2022.">
                <BezirkeChart data={bez} />
              </Figure>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>How fast flats are let</h2>
            <div className="prose" style={{ marginTop: 16 }}>
              {lastP?.time_on_market_days_4q != null && (
                <p>A listing in {snap.city_en} stays online for about <strong>{num(lastP.time_on_market_days_4q)} days</strong>
                  {lastP.share_closed_within_week_4q != null && <>, and {inN(lastP.share_closed_within_week_4q)} flats are gone within a week</>}.
                  {" "}Fewer <Term k="days-on-market" /> means more competition: have your documents (SCHUFA, payslips) ready before you view.</p>
              )}
              {kreis && <p>The census found <strong>{pct(kreis.market_active_vacancy_pct, 1)}</strong> of flats empty and available
                (<Term k="vacancy" />), while the population grew {pct(kreis.population_growth_5y_pct, 1, true)} in five years. That makes the
                market <strong>{kreis.market_balance}</strong> on our <Term k="supply-demand" />.</p>}
            </div>
          </div>
          <Figure title="Days a listing stays online" sub="Rolling average over four quarters. Lower means a faster, tighter market."
            source="GREIX market-pressure data.">
            <PressureChart data={pressure} />
          </Figure>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Head title={`What would a flat in ${snap.city_en} cost you?`} />
          <div className="reveal"><RentCheck cities={rentCheckCities()} initialCity={city} compact /></div>
          <div style={{ maxWidth: 720 }}>
            <Takeaway label="Before you sign">
              Asking rents here are {pct(snap.asking_premium_vs_existing_pct, 0)} above what existing tenants paid in 2022. Check the
              Mietspiegel for {snap.city_en} and whether the rent cap (Mietpreisbremse) applies to your flat: it can limit how far a new
              rent may exceed the local reference rent.
            </Takeaway>
          </div>
          <nav className="pager" aria-label="Other cities">
            <Link href={`/cities/${prev.slug}`}><span>Previous city</span><b>{prev.city_en}</b></Link>
            <Link href={`/cities/${next.slug}`} style={{ textAlign: "right" }}><span>Next city</span><b>{next.city_en}</b></Link>
          </nav>
        </div>
      </section>
    </>
  );
}
