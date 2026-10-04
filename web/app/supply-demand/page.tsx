import { Cite } from "@/components/Cite";
import type { Metadata } from "next";
import Link from "next/link";
import { RankBars } from "@/components/RankBars";
import { SupplyDemandScatter } from "@/components/SupplyDemandCharts";
import { Term } from "@/components/Term";
import { Figure, Head, PageHero, Stat, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { num, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Supply & demand", description: "Where population growth meets a lack of empty flats: the tightest and slackest housing markets in Germany." };

function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num_ = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num_ += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num_ / Math.sqrt(da * db);
}

export default function SupplyDemand() {
  const kreise = data.supplyDemand(), cities = data.citySupplyDemand(), snaps = data.cities();
  const slugOf = Object.fromEntries(snaps.map((s) => [s.city, s.slug]));
  const big = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Leipzig", "Chemnitz"];
  const highlight = Object.fromEntries(snaps.filter((s) => big.includes(s.city)).map((s) => [s.ags, s.city_en]));
  const ok = cities.filter((c) => c.supply_demand_index != null && c.demand_pressure_score != null);
  const r = pearson(ok.map((c) => c.supply_demand_index!), ok.map((c) => c.demand_pressure_score!));
  const counts = { tight: 0, balanced: 0, slack: 0 } as Record<string, number>;
  kreise.forEach((k) => counts[k.market_balance]++);
  const popTight = kreise.filter((k) => k.market_balance === "tight").reduce((s, k) => s + (k.population ?? 0), 0);
  const popAll = kreise.reduce((s, k) => s + (k.population ?? 0), 0);
  const sorted = [...kreise].sort((a, b) => b.supply_demand_index - a.supply_demand_index);
  const tightest = sorted.slice(0, 10), slackest = sorted.slice(-10).reverse();
  const strength = Math.abs(r) >= 0.7 ? "strongly" : Math.abs(r) >= 0.4 ? "clearly" : "only loosely";
  const tightRural = kreise.filter((k) => k.market_balance === "tight" && !k.is_urban_district).length;
  const topLands = (bal: string, n = 2) => {
    const c: Record<string, number> = {};
    kreise.filter((k) => k.market_balance === bal && k.land_name).forEach((k) => (c[k.land_name!] = (c[k.land_name!] ?? 0) + 1));
    return Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, n).map(([l]) => l);
  };
  const cityRows = [...cities].sort((a, b) => (b.supply_demand_index ?? -9) - (a.supply_demand_index ?? -9));

  return (
    <>
      <PageHero title="Where demand outruns the housing stock"
        lead="Where more people want to live than there are flats, rents come under pressure. We measure both sides in every district."
        facts={<>
          <Stat label="Tight markets" value={counts.tight} unit="districts" say={<>Home to {pct((100 * popTight) / popAll, 0)} of Germany&apos;s population.</>} />
          <Stat label="Balanced" value={counts.balanced} unit="districts" say="Supply and demand roughly match." />
          <Stat label="Slack markets" value={counts.slack} unit="districts" say="Many empty flats, shrinking or flat population." />
          <Stat label="Check against live listings" value={`r = ${r.toFixed(2)}`} say={<>The index {strength} agrees with how fast flats are actually let in 37 cities.</>} />
        </>} />

      <section className="section">
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 36 }}>
            <h2>Empty flats against population growth</h2>
            <div className="prose" style={{ marginTop: 14 }}>
              <p><strong>Supply</strong> is the <Term k="vacancy">share of flats that stood empty and available</Term> in the 2022 census.<Cite id="destatis2024" /> Housing
                research usually puts the vacancy a market needs for normal moving at 2 to 3%.<Cite id="saxony2022" /> <strong>Demand</strong> is population change over the last five
                years. The <Term k="supply-demand" /> combines the two, so a district with few empty flats and a growing population scores high. German rent law uses the same two signals, low vacancy
                and population growth without enough new building, to define a tight housing market.<Cite id="bgb556d" /></p>
            </div>
          </div>
          <Figure title="400 districts: empty flats versus population growth"
            sub="Each bubble is a district, sized by population. Dashed lines mark the German middle on each axis."
            source="Zensus 2022 (vacancy); Statistische Ämter, population 2018 to 2023."
            howto={<>
              <p>Top left: few empty flats and a growing population. That is where competition for flats is fiercest. Bottom right: many empty flats
                and a shrinking population, which keeps rents low. The horizontal axis is stretched at the low end because the difference between 1%
                and 2% empty matters far more than between 8% and 9%.</p>
              <p>Use the search box to find your district on the chart.</p>
            </>}>
            <SupplyDemandScatter data={kreise} highlight={highlight} />
          </Figure>
          <div style={{ maxWidth: 760 }}>
            <Takeaway>
              Tight markets are not just a big-city problem: {tightRural} of the {counts.tight} tight districts are rural, most of them in{" "}
              {topLands("tight").join(" and ")}. Slack markets cluster in{" "}
              {topLands("slack", 3).join(", ").replace(/, ([^,]*)$/, " and $1")}, where so many flats stand empty that tenants have a real choice.
            </Takeaway>
          </div>
        </div>
      </section>

      <section className="section band" style={{ paddingBottom: 72 }}>
        <div className="wrap">
          <Head title="The ten tightest and ten slackest districts" />
          <div className="split even">
            <Figure title="Tightest" sub="Highest supply-demand index" source="ImmoDash, from Zensus 2022 and population statistics.">
              <RankBars rows={tightest.map((k) => ({ label: k.kreis_name.split(",")[0], sub: `${pct(k.market_active_vacancy_pct)} empty, ${pct(k.population_growth_5y_pct, 1, true)} pop.`, v: k.supply_demand_index }))}
                max={Math.max(...tightest.map((k) => k.supply_demand_index))} tone="bad" fmt="index" />
            </Figure>
            <Figure title="Slackest" sub="Lowest supply-demand index (shown as distance below zero)" source="ImmoDash, from Zensus 2022 and population statistics.">
              <RankBars rows={slackest.map((k) => ({ label: k.kreis_name.split(",")[0], sub: `${pct(k.market_active_vacancy_pct)} empty, ${pct(k.population_growth_5y_pct, 1, true)} pop.`, v: -k.supply_demand_index }))}
                max={Math.max(...slackest.map((k) => -k.supply_demand_index))} tone="good" fmt="index" />
            </Figure>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div className="sticky reveal">
            <h2>Does the index match what renters experience?</h2>
            <div className="prose" style={{ marginTop: 14 }}>
              <p>The index uses census data, which is a snapshot. To check it, we compare it with live listing data for the 37 cities: how many{" "}
                <Term k="days-on-market" /> a flat stays online and how many are gone within a week. The correlation is{" "}
                <strong>{r.toFixed(2)}</strong>{Math.abs(r) >= 0.4 ? ", so where the census says a market is tight, flats really do go faster." : "."}</p>
            </div>
          </div>
          <div className="tablewrap reveal">
            <table>
              <thead><tr><th>City</th><th>Market</th><th className="num">Empty flats</th><th className="num">Population, 5 y</th><th className="num">Days online</th><th className="num">Index</th></tr></thead>
              <tbody>
                {cityRows.map((c) => (
                  <tr key={c.city}>
                    <td><Link href={`/cities/${slugOf[c.city]}`} style={{ fontWeight: 600 }}>{c.city_en}</Link></td>
                    <td>{c.market_balance && <span className={`pill ${c.market_balance}`}>{c.market_balance}</span>}</td>
                    <td className="num">{pct(c.market_active_vacancy_pct)}</td>
                    <td className="num">{pct(c.population_growth_5y_pct, 1, true)}</td>
                    <td className="num">{num(c.time_on_market_days_4q)}</td>
                    <td className="num">{c.supply_demand_index?.toFixed(2) ?? "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
