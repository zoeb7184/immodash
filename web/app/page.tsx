import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CityTable } from "@/components/CityTable";
import { HeroMap } from "@/components/HeroMap";
import { RentCheck } from "@/components/RentCheck";
import { OutlookChart, PremiumChart } from "@/components/StoryCharts";
import { Term } from "@/components/Term";
import { TrendStory, type CompactPoint } from "@/components/TrendStory";
import { Figure, Head, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { eur, median, monthLong, num, pct } from "@/lib/format";
import { headline, outlookRows, premiumRows, rateJump, rentCheckCities, tableRows } from "@/lib/story";

/** "a quarter", "a third" … when the number is close to one, else a rounded percentage. */
function share(p: number): string {
  for (const [v, w] of [[25, "a quarter"], [33.3, "a third"], [50, "half"], [20, "a fifth"]] as const) if (Math.abs(p - v) <= 2.5) return w;
  return `${Math.round(p)}%`;
}

export default function Story() {
  const cities = data.cities();
  const meta = data.meta();
  const h = headline();
  const rates = data.rates();
  const rate = rates[rates.length - 1];
  const jump = rateJump();
  const bt = data.backtest();
  const mape = (model: string) => bt.find((b) => b.horizon_months === 12 && b.model === model)?.mape_pct ?? null;
  const cov = bt.find((b) => b.horizon_months === 12 && b.model === "lightgbm")?.coverage_80_pct ?? null;

  const monthly: CompactPoint[] = data.monthly().filter((r) => r.median_rent_sqm != null)
    .map((r) => ({ c: r.city, d: r.period_date, m: r.median_rent_sqm as number }));
  const firstMonth = monthly.reduce((m, r) => (r.d < m ? r.d : m), "9999");
  const lastMonth = monthly.reduce((m, r) => (r.d > m ? r.d : m), "");
  const changeSince = cities.map((c) => {
    const pts = monthly.filter((p) => p.c === c.city);
    return { city: c.city, city_en: c.city_en, v: pts.length > 1 ? (100 * pts[pts.length - 1].m) / pts[0].m - 100 : NaN };
  }).filter((x) => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
  const medianSince = median(changeSince.map((x) => x.v));
  const top = changeSince[0], bottom = changeSince[changeSince.length - 1];

  const prem = premiumRows().sort((a, b) => b.premium - a.premium);
  const out = outlookRows().map((r) => ({ ...r, mid: (100 * r.p50) / r.now - 100 })).sort((a, b) => b.mid - a.mid);
  const outMedian = median(out.map((r) => r.mid));
  const outFalling = out.filter((r) => r.mid < 0).length;
  const flat60 = h.medianRent * 60;
  const big = [...cities].sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  const asking = data.askingRents().filter((r) => r.rooms === "total");
  const heroRents = Object.fromEntries(asking.map((r) => [r.ags, r.estimated_asking_rent_eur_sqm]));
  const heroNames = Object.fromEntries(asking.map((r) => [r.ags, r.kreis_name]));

  return (
    <>
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker enter">German rental market, updated weekly</span>
            <h1 className="enter">German city rents rose by {share(h.median5y)} in five years.</h1>
            <p className="lead enter">
              A new lease costs {num(h.medianPremium)}% more per m² than tenants paid in 2022. See what that means for your budget.
            </p>
            <div className="hero-cta enter">
              <a className="btn" href="#rent-check">Check your rent</a>
              <Link className="textlink" href="/cities">Browse 37 cities <ArrowRight size={15} weight="bold" aria-hidden /></Link>
            </div>
          </div>
          <HeroMap rents={heroRents} names={heroNames} />
        </div>
      </header>

      <section className="band" aria-label="Key figures">
        <div className="wrap">
          <div className="stats">
            <Stat label="Typical asking rent" value={num(h.medianRent, 2)} unit="€/m²"
              say={<>A 60 m² flat in the median city: about {num(Math.round(flat60 / 10) * 10)} € a month, cold.</>} />
            <Stat label="Cities where rents rose" value={h.upYoy} unit={`of ${h.n}`}
              say={<>Over the last 12 months. The typical rise is {pct(h.medianYoy, 1)}.</>} />
            <Stat label="Extra for a new lease" value={`+${num(h.medianPremium)}`} unit="%"
              say={<>Per m², compared with existing leases in the typical city.</>} />
            <Stat label="Mortgage rate" value={num(rate.rate_pct, 2)} unit="%"
              say={jump ? <>Up from {num(jump.before, 2)}% at the start of 2022, so more people keep renting.</> : "Bundesbank, new housing loans."} />
          </div>
          <p className="meta" style={{ padding: "0 0 22px" }}>
            Data up to {monthLong(meta.latest_month)}. Rebuilt automatically every week, last on {meta.generated_at.slice(0, 10)}.
          </p>
        </div>
      </section>

      <section className="section" id="rent-check">
        <div className="wrap">
          <Head title="What would a flat cost you?">
            Pick a city, a size and your household&apos;s net income. We compare the median <Term k="asking-rent" /> with the
            30% rule of thumb.
          </Head>
          <div className="reveal"><RentCheck cities={rentCheckCities()} initialCity={big[0]?.city ?? "Berlin"} /></div>
        </div>
      </section>

      <section className="section" id="trend">
        <div className="wrap">
          <Head title="Rents have climbed almost everywhere">
            Since {monthLong(firstMonth)} the typical city&apos;s asking rent rose <b style={{ color: "var(--ink)" }}>{pct(medianSince, 0)}</b>.
            {" "}{top.city_en} climbed fastest ({pct(top.v, 0, true)}), {bottom.city_en} slowest ({pct(bottom.v, 0, true)}).
          </Head>
          <Figure title="Asking rents since 2020"
            sub="Median asking rent per city, monthly. Grey lines are the other cities; pick up to six to highlight."
            source="GREIX Mietpreisindex (Kiel Institut für Weltwirtschaft); Deutsche Bundesbank for loan rates."
            howto={<>
              <p><b>Change since 2020</b> puts every city on the same starting line, so you can compare the pace of rises regardless of how
                expensive a city was to begin with. <b>€ per m²</b> shows the actual price level.</p>
              <p>Hover over the chart to read exact values for the highlighted cities. Monthly figures can jump when unusually many new-build
                flats are listed at once; the long-run direction is more reliable than any single month.</p>
            </>}>
            <TrendStory monthly={monthly} initial={big.slice(0, 4).map((c) => c.city)}
              cities={cities.map((c) => ({ city: c.city, city_en: c.city_en, population: c.population, index_5y_pct: c.index_5y_pct, median: c.median_rent_sqm }))}
              rateBand={jump ? { from: jump.from, to: jump.to, label: `Loan rates ${num(jump.before, 1)}% to ${num(jump.after, 1)}%` } : null} />
          </Figure>
          <div className="split even" style={{ marginTop: 36 }}>
            <div className="prose reveal">
              <p>The figures come from <Term k="greix">GREIX</Term>, which tracks listings in {h.n} large cities and adjusts for size and quality,
                so a rise means the same kind of flat got dearer, not that bigger flats came onto the market.</p>
              {jump && <p>The shaded year is 2022, when interest on new housing loans jumped from {num(jump.before, 2)}% to {num(jump.after, 2)}%.
                Buying suddenly cost far more each month, which kept many would-be buyers renting. Rents kept rising through and after that shock.</p>}
            </div>
            <Takeaway>
              Asking rents in {monthLong(lastMonth)} are higher than in {monthLong(firstMonth)} in
              {changeSince.some((x) => x.v <= 0) ? " every city except " + changeSince.filter((x) => x.v <= 0).map((x) => x.city_en).join(", ") : ` all ${h.n} cities`}.
              If you are planning a move, budget for the price going up rather than down.
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section" id="premium">
        <div className="wrap split">
          <div className="sticky">
            <h2 className="reveal">Moving costs more than staying</h2>
            <div className="prose reveal" style={{ marginTop: 16 }}>
              <p>The 2022 census recorded what people actually paid on their existing leases: the <Term k="contract-rent" />. Compared with
                today&apos;s asking rent, a newcomer in the typical city pays a <Term k="premium">premium</Term> of <strong>{num(h.medianPremium)}%</strong>.</p>
              <p>In {prem[0].city_en} the gap reaches {num(prem[0].premium)}%: a flat an existing tenant rents for {eur(prem[0].existing)} per m² is
                advertised at {eur(prem[0].asking)} to someone new. That is why people stay in flats that no longer fit them.</p>
            </div>
            <Takeaway>
              If you already rent, your current lease is probably worth more than you think. Compare a new rent with your old one, not with what
              friends paid years ago.
            </Takeaway>
          </div>
          <Figure title="Existing leases (2022) versus new leases today, € per m²"
            sub="Sorted by the size of the gap. The 14 largest cities are shown first."
            source="Zensus 2022 (Statistische Ämter des Bundes und der Länder); GREIX asking rents."
            howto={<>
              <p>The green dot is the average rent on all existing contracts in May 2022, including many old, cheap leases. The orange dot is
                the median rent advertised for new leases in the latest month. The number on the right is how much more the new lease costs.</p>
              <p>Part of the gap is four years of rent growth since 2022, part is that new listings are often renovated or newly built. Both
                are real costs for someone looking for a flat today.</p>
            </>}
            numbers={<table><thead><tr><th>City</th><th className="num">Existing 2022</th><th className="num">Asking today</th><th className="num">Extra</th></tr></thead>
              <tbody>{prem.map((r) => <tr key={r.city}><td>{r.city_en}</td><td className="num">{eur(r.existing)}</td><td className="num">{eur(r.asking)}</td><td className="num">+{num(r.premium)}%</td></tr>)}</tbody></table>}>
            <PremiumChart rows={prem} />
          </Figure>
        </div>
      </section>

      <section className="section" id="outlook">
        <div className="wrap split flip">
          <Figure title="Expected change in asking rent over the next 12 months"
            sub="Dot: most likely change. Bar: the range the model considers 80% likely."
            source="ImmoDash forecast (LightGBM quantile regression on the GREIX index, conformal-calibrated)."
            howto={<>
              <p>Read each row as &ldquo;most likely about this much, but anywhere along the bar would not be a surprise&rdquo;. A wide bar means the
                city&apos;s rents have been jumpy and the model is less sure.</p>
              <p>The forecast only knows past rents and their momentum. It cannot anticipate new laws, a sudden wave of new construction
                or a recession. <Link href="/methodology">How the model works and how it was tested</Link>.</p>
            </>}
            numbers={<table><thead><tr><th>City</th><th className="num">Now</th><th className="num">Low</th><th className="num">Most likely</th><th className="num">High</th></tr></thead>
              <tbody>{out.map((r) => <tr key={r.city}><td>{r.city_en}</td><td className="num">{eur(r.now)}</td><td className="num">{eur(r.p10)}</td><td className="num">{eur(r.p50)}</td><td className="num">{eur(r.p90)}</td></tr>)}</tbody></table>}>
            <OutlookChart rows={outlookRows()} />
          </Figure>
          <div className="sticky">
            <h2 className="reveal">Rents are expected to keep rising</h2>
            <div className="prose reveal" style={{ marginTop: 16 }}>
              <p>A machine-learning model trained on each city&apos;s rent history estimates where asking rents will be in 12 months. The typical
                city is expected to move <strong>{pct(outMedian, 1, true)}</strong>{outFalling > 0 ? `, and ${outFalling} of ${out.length} cities to get slightly cheaper` : ", and no city is expected to get cheaper"}.</p>
              <p>Every city gets a <Term k="forecast">range</Term>, not a single number.
                {mape("lightgbm") != null && mape("naive_no_change") != null && <> On past data it had not seen, its 12-month forecasts missed by{" "}
                  {pct(mape("lightgbm"), 1)} on average, against {pct(mape("naive_no_change"), 1)} for assuming rents stay flat
                  {cov != null && <>, and {num(cov)}% of real outcomes landed inside the range</>}.</>}</p>
            </div>
            <Takeaway>
              Expect next year&apos;s rent to be a little higher than today&apos;s almost everywhere. Where the bar is wide, keep a bigger buffer.
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section band" id="table" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title="All 37 cities at a glance">
            Sort by price, momentum, how much of local income rent takes, or how fast flats are let. <Term k="rent-burden">Rent burden</Term> uses
            a 60 m² flat and two average residents&apos; net income.
          </Head>
          <div className="reveal"><CityTable rows={tableRows()} /></div>
        </div>
      </section>

      <section className="section" aria-labelledby="more">
        <div className="wrap">
          <h2 id="more" className="reveal" style={{ marginBottom: 24 }}>Keep exploring</h2>
          <ul className="linklist reveal">
            {[
              { href: "/affordability", t: "Where can I afford to live?", d: "Set a budget and a flat size and see which of Germany's 400 districts fit, on a map." },
              { href: "/cities", t: "Your city in detail", d: "An AI-written summary, a street-level rent map and the 12-month outlook for each of the 37 cities." },
              { href: "/supply-demand", t: "Where demand outruns supply", d: "Empty flats against a growing population: why some districts are so hard to rent in." },
              { href: "/methodology", t: "How ImmoDash works", d: "The data pipeline, the forecasting model, how it was tested, and every source." },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href}><h3>{l.t}</h3><p>{l.d}</p><span className="arrow" aria-hidden><ArrowRight size={20} /></span></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
