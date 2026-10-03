import type { Metadata } from "next";
import { Finder } from "@/components/Finder";
import { RankBars } from "@/components/RankBars";
import { Term } from "@/components/Term";
import { Figure, Takeaway } from "@/components/ui";
import { data } from "@/lib/data";
import { eur, median, pct } from "@/lib/format";

const words = (n: number) => ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "All twelve"][n] ?? String(n);

export const metadata: Metadata = { title: "Can I afford it?", description: "Find the German districts where your rent budget works, and see where rent takes the biggest share of local income." };

export default function Affordability() {
  const aff = data.affordability();
  const worst = [...aff].sort((a, b) => b.rent_burden_pct - a.rent_burden_pct).slice(0, 12);
  const best = [...aff].sort((a, b) => a.rent_burden_pct - b.rent_burden_pct).slice(0, 12);
  const med = median(aff.map((a) => a.rent_burden_pct));
  const bar = (rows: typeof aff) => rows.map((k) => ({ label: k.kreis_name.split(",")[0], sub: k.land_name ?? "", v: k.rent_burden_pct,
    note: `${eur(k.rent_eur_sqm)}/m² rent, ${eur(k.disposable_income_per_resident_eur, 0)} income per resident` }));
  return (
    <>
      <header className="hero" style={{ paddingBottom: 8 }}>
        <div className="wrap">
          <div className="read">
            <div className="kicker">Budget finder · all 400 districts</div>
            <h1>Where can I afford to live?</h1>
            <p className="dek">Set your budget and flat size. The map shows every <Term k="kreis">district</Term> in Germany where a flat
              like that is likely to be advertised within your budget, with an estimate for today, not 2022.</p>
          </div>
        </div>
      </header>
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap">
          <Finder />
          <details className="howto" style={{ marginTop: 18 }}>
            <summary>Where these estimates come from</summary>
            <div className="body">
              <p>The 2022 census recorded rents for every district by flat size and number of rooms. Those are existing leases, which are
                cheaper than new ones. For the 37 cities with listing data we can measure how much more new leases cost; for every other district we
                apply the typical gap in its federal state. The result is an estimate of today&apos;s <Term k="asking-rent" /> for that kind
                of flat, not a list of real offers.</p>
              <p>Use it to narrow down where to look, then check real listings. Heating and running costs come on top of the <Term k="cold-rent" />.</p>
            </div>
          </details>
        </div>
      </section>

      <section className="chapter">
        <div className="wrap">
          <div className="read reveal">
            <div className="chapter-num">Rent against income</div>
            <h2>Where rent takes the biggest bite out of local pay</h2>
            <div className="prose">
              <p>A cheap rent is not affordable if local wages are low, and a high rent can be manageable where people earn more. The{" "}
                <Term k="rent-burden" /> combines both: the census rent for a 60 m² flat as a share of what two average residents of the
                district earn after tax. Across all 400 districts the middle value is <strong>{pct(med, 1)}</strong>.</p>
            </div>
          </div>
          <div className="split even">
            <Figure title="Highest rent burden" sub="Rent for 60 m² as a share of two residents' net income, 2022." source="Zensus 2022; VGR der Länder.">
              <RankBars rows={bar(worst)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="bad" fmt="pct" />
            </Figure>
            <Figure title="Lowest rent burden" sub="Same measure, the twelve most affordable districts." source="Zensus 2022; VGR der Länder.">
              <RankBars rows={bar(best)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="good" fmt="pct" />
            </Figure>
          </div>
          <div className="read">
            <Takeaway>
              {words(worst.filter((w) => w.is_urban_district).length)} of the twelve least affordable districts are cities, led by{" "}
              {worst.slice(0, 3).map((w) => w.kreis_name.split(",")[0]).join(", ")}: rents there are high and incomes, though above average,
              do not keep up. {best.every((b) => !b.is_urban_district) ? "All twelve" : words(best.filter((b) => !b.is_urban_district).length)} of
              the most affordable are rural districts, where the same flat takes about{" "}
              {pct((100 * best[0].rent_burden_pct) / worst[0].rent_burden_pct, 0)} of what it takes in {worst[0].kreis_name.split(",")[0]}.
            </Takeaway>
          </div>
        </div>
      </section>
    </>
  );
}
