import type { Metadata } from "next";
import { Finder } from "@/components/Finder";
import { RankBars } from "@/components/RankBars";
import { Term } from "@/components/Term";
import { Figure, Head, PageHero, Stat, Takeaway } from "@/components/ui";
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
      <PageHero title="Where can I afford to live?"
        lead={<>Set a budget and a flat size. The map shows every <Term k="kreis">district</Term> where a flat like that is
          likely to be advertised within it today.</>}
        facts={<>
          <Stat label="Typical district" value={pct(med, 1)} say={<>Share of two residents&apos; net income that rent for 60 m² takes, at 2022 census rents.</>} />
          <Stat label={`Least affordable: ${worst[0].kreis_name.split(",")[0]}`} value={pct(worst[0].rent_burden_pct, 1)} say="Rent takes the largest share of local income here." />
          <Stat label={`Most affordable: ${best[0].kreis_name.split(",")[0]}`} value={pct(best[0].rent_burden_pct, 1)} say="Rent takes the smallest share of local income here." />
          <Stat label="Typical income" value={eur(median(aff.map((a) => a.disposable_income_per_resident_eur)), 0)} unit="a year" say="Net income per resident across the 400 districts." />
        </>} />
      <section className="section tight" style={{ paddingTop: 0 }}>
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

      <section className="section band" style={{ paddingBottom: 72, marginTop: 64 }}>
        <div className="wrap">
          <Head title="Where rent takes the biggest bite out of local pay">
            A cheap rent is not affordable if wages are low. The <Term k="rent-burden" /> combines both: census rent for 60 m² as a share of
            two average residents&apos; net income. Across all 400 districts the middle value is <b style={{ color: "var(--ink)" }}>{pct(med, 1)}</b>.
          </Head>
          <div className="split even">
            <Figure title="Highest rent burden" sub="Rent for 60 m² as a share of two residents' net income, 2022." source="Zensus 2022; VGR der Länder.">
              <RankBars rows={bar(worst)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="bad" fmt="pct" />
            </Figure>
            <Figure title="Lowest rent burden" sub="Same measure, the twelve most affordable districts." source="Zensus 2022; VGR der Länder.">
              <RankBars rows={bar(best)} max={Math.max(...worst.map((w) => w.rent_burden_pct))} tone="good" fmt="pct" />
            </Figure>
          </div>
          <div style={{ maxWidth: 760 }}>
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
