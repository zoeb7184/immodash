import Link from "next/link";
import { CityTable } from "@/components/CityTable";
import { RentCheck } from "@/components/RentCheck";
import { OutlookChart, PremiumChart } from "@/components/StoryCharts";
import { Term } from "@/components/Term";
import { TrendStory, type CompactPoint } from "@/components/TrendStory";
import { Chapter, Figure, Stat, Takeaway } from "@/components/ui";
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
  const changeSince: { city: string; city_en: string; v: number }[] = cities.map((c) => {
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

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="read">
            <div className="kicker">The German rental market · updated every week</div>
            <h1>In five years, asking rents in Germany&apos;s big cities rose by {share(h.median5y)}. Here is what that means for you.</h1>
            <p className="dek">
              A new lease now costs about {num(h.medianPremium)}% more per square metre than the average existing tenant paid in 2022.
              This guide uses official and academic open data to show what a flat really costs, where the market is tightest,
              and where rents are likely to go next.
            </p>
            <div className="byline">
              <span>By Zoeb Ali Khan</span>
              <span>Data up to {monthLong(meta.latest_month)}</span>
              <span>Refreshed {meta.generated_at.slice(0, 10)}</span>
            </div>
          </div>
          <div className="stats reveal" style={{ marginTop: 32 }}>
            <Stat label="Typical asking rent" value={num(h.medianRent, 2)} unit="€/m²"
              say={<>A 60 m² flat in the median city is listed at about {num(Math.round(flat60 / 10) * 10)} € a month, cold.</>} />
            <Stat label="Rents rising" value={h.upYoy} unit={`of ${h.n} cities`}
              say={<>Asking rents are higher than a year ago in {h.upYoy === h.n ? "every city" : `${h.upYoy} cities`}; the typical rise is {pct(h.medianYoy, 1)}.</>} />
            <Stat label="Price of moving" value={`+${num(h.medianPremium)}`} unit="%"
              say={<>How much more a new lease costs per m² than an existing one (typical city).</>} />
            <Stat label="Mortgage rate" value={num(rate.rate_pct, 2)} unit="%"
              say={<>{jump ? <>Up from {num(jump.before, 2)}% at the start of 2022. Buying stays expensive, so more people keep renting.</> : "Bundesbank, new housing loans."}</>} />
          </div>
        </div>
      </header>

      <section className="section" id="rent-check">
        <div className="wrap">
          <div className="read reveal">
            <div className="chapter-num">Start here</div>
            <h2>What would a flat cost you?</h2>
            <div className="prose">
              <p>Pick a city, a flat size and your household&apos;s monthly net income. We use the current median <Term k="asking-rent" /> in
                that city, the <Term k="cold-rent">cold rent</Term> without running costs, and compare it with the common rule of thumb that
                rent should stay under 30% of income.</p>
            </div>
          </div>
          <div className="reveal" style={{ marginTop: 18 }}>
            <RentCheck cities={rentCheckCities()} initialCity={big[0]?.city ?? "Berlin"} />
          </div>
        </div>
      </section>

      <Chapter n="Chapter 1" id="trend" title="Rents have climbed almost everywhere, and the climb has not stopped"
        intro={<>
          <p>Since {monthLong(firstMonth)} the asking rent in the typical city has risen by <strong>{pct(medianSince, 0)}</strong>.
            {" "}{top.city_en} climbed fastest ({pct(top.v, 0, true)}); even the slowest, {bottom.city_en}, moved {pct(bottom.v, 0, true)}.
            The figures come from <Term k="greix">GREIX</Term>, which tracks listings in {h.n} large cities and adjusts for size and quality,
            so a rise means the same kind of flat got dearer, not that bigger flats came onto the market.</p>
          {jump && <p>The shaded year is 2022, when interest on new housing loans jumped from {num(jump.before, 2)}% to {num(jump.after, 2)}%.
            Buying a home suddenly cost far more each month, which kept many would-be buyers in the rental market.
            Rents kept rising through and after that shock.</p>}
        </>}>
        <div className="wrap" style={{ padding: 0 }}>
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
              rateBand={jump ? { from: jump.from, to: jump.to, label: `Loan rates ${num(jump.before, 1)}% → ${num(jump.after, 1)}%` } : null} />
          </Figure>
          <div className="read">
            <Takeaway>
              There is no city among the {h.n} where waiting has paid off: asking rents in {monthLong(lastMonth)} are higher than in{" "}
              {monthLong(firstMonth)} everywhere{changeSince.some((x) => x.v <= 0) ? " except " + changeSince.filter((x) => x.v <= 0).map((x) => x.city_en).join(", ") : ""}.
              If you are planning a move, budget for the price going up rather than down.
            </Takeaway>
          </div>
        </div>
      </Chapter>

      <Chapter n="Chapter 2" id="premium" title="The real cost of moving: newcomers pay far more than sitting tenants"
        intro={<>
          <p>The 2022 census recorded what people actually paid on their existing leases: the <Term k="contract-rent" />. Comparing it with
            today&apos;s asking rent shows the gap a newcomer faces. In the typical city that <Term k="premium">premium</Term> is{" "}
            <strong>{num(h.medianPremium)}%</strong>. In {prem[0].city_en} it reaches {num(prem[0].premium)}%: a lease that costs an existing
            tenant {eur(prem[0].existing)} per m² is advertised at {eur(prem[0].asking)} to someone new.</p>
          <p>That gap is why people stay in flats that no longer fit them, and why a move within the same city can raise your rent sharply
            even when nothing else changes.</p>
        </>}>
        <div className="wrap" style={{ padding: 0 }}>
          <Figure title="Existing leases (2022) versus new leases (today), € per m²"
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
          <div className="read">
            <Takeaway>
              If you already rent, your current lease is probably worth more than you think. Before moving, compare the new rent with your
              old one, not with what friends paid years ago.
            </Takeaway>
          </div>
        </div>
      </Chapter>

      <Chapter n="Chapter 3" id="outlook" title="What happens next: rents are expected to keep rising, but not everywhere at the same speed"
        intro={<>
          <p>A machine-learning model trained on each city&apos;s rent history estimates where asking rents will be in 12 months.
            The typical city is expected to move <strong>{pct(outMedian, 1, true)}</strong>{outFalling > 0 ? `, and ${outFalling} of ${out.length} cities are expected to get slightly cheaper` : ", and no city is expected to get cheaper"}.</p>
          <p>Forecasts are uncertain, so every city gets a <Term k="forecast">range</Term> rather than a single number.
            {mape("lightgbm") != null && mape("naive_no_change") != null && <> Tested on past data it had not seen, the model&apos;s 12-month
              forecasts missed by {pct(mape("lightgbm"), 1)} on average, against {pct(mape("naive_no_change"), 1)} for simply assuming rents
              stay flat{cov != null && <>, and {num(cov)}% of real outcomes landed inside the range</>}.</>}</p>
        </>}>
        <div className="wrap" style={{ padding: 0 }}>
          <Figure title="Expected change in asking rent over the next 12 months"
            sub="Dot: most likely change. Bar: the range the model considers 80% likely. The 14 largest cities are shown first."
            source="ImmoDash forecast (LightGBM quantile regression on the GREIX index, conformal-calibrated)."
            howto={<>
              <p>Read each row as “most likely about this much, but anywhere along the bar would not be a surprise”. A wide bar means the
                city&apos;s rents have been jumpy and the model is less sure. Cities are sorted from the biggest expected rise to the smallest.</p>
              <p>The forecast only knows past rents and their momentum. It cannot anticipate new laws, a sudden wave of new construction
                or a recession. <Link href="/methodology">How the model works and how it was tested →</Link></p>
            </>}
            numbers={<table><thead><tr><th>City</th><th className="num">Now</th><th className="num">Low</th><th className="num">Most likely</th><th className="num">High</th></tr></thead>
              <tbody>{out.map((r) => <tr key={r.city}><td>{r.city_en}</td><td className="num">{eur(r.now)}</td><td className="num">{eur(r.p10)}</td><td className="num">{eur(r.p50)}</td><td className="num">{eur(r.p90)}</td></tr>)}</tbody></table>}>
            <OutlookChart rows={outlookRows()} />
          </Figure>
          <div className="read">
            <Takeaway>
              Expect next year&apos;s rent to be a little higher than today&apos;s in almost every city. Where the bar is wide, keep a
              bigger buffer in your budget.
            </Takeaway>
          </div>
        </div>
      </Chapter>

      <Chapter n="Chapter 4" id="table" title="All 37 cities at a glance"
        intro={<p>Sort by what matters to you: price, how fast rents are rising, how much of local income they take, or how quickly flats are
          let. <Term k="rent-burden">Rent burden</Term> uses a 60 m² flat and two average residents&apos; net income, so it shows how
          rents compare with what people in that city earn.</p>}>
        <div className="reveal" style={{ marginTop: 20 }}>
          <CityTable rows={tableRows()} />
        </div>
      </Chapter>

      <section className="chapter">
        <div className="wrap">
          <div className="read reveal">
            <div className="chapter-num">Keep exploring</div>
            <h2>Go deeper</h2>
          </div>
          <div className="cards reveal" style={{ marginTop: 18 }}>
            <Link className="linkcard" href="/affordability">
              <span className="lc-k">Budget finder</span><h3>Where can I afford to live?</h3>
              <p>Set a budget and flat size and see which of Germany&apos;s 400 districts fit, on a map.</p><span className="go">Open the finder →</span>
            </Link>
            <Link className="linkcard" href="/cities">
              <span className="lc-k">City profiles</span><h3>Your city in detail</h3>
              <p>AI-written summary, neighbourhood rent map at 100 m resolution, and the 12-month outlook.</p><span className="go">Browse 37 cities →</span>
            </Link>
            <Link className="linkcard" href="/supply-demand">
              <span className="lc-k">Market balance</span><h3>Where demand outruns supply</h3>
              <p>Empty flats versus a growing population: why some districts are so hard to rent in.</p><span className="go">See the analysis →</span>
            </Link>
            <Link className="linkcard" href="/methodology">
              <span className="lc-k">Behind the data</span><h3>How ImmoDash works</h3>
              <p>The data pipeline, the forecasting model, how it was tested, and every source.</p><span className="go">Read the method →</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
