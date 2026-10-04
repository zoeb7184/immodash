import type { Metadata } from "next";
import { KreisMap } from "@/components/KreisMap";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";
import { eur, median, num } from "@/lib/format";
import { PageHero, Stat } from "@/components/ui";

const short = (n: string) => n.split(",")[0];

export const metadata: Metadata = { title: "Map", description: "Rents, affordability and market tightness for all 400 German districts on one map." };

export default function MapPage() {
  const citySlugs = Object.fromEntries(data.cities().map((c) => [c.ags, c.slug]));
  const rents = data.askingRents().filter((r) => r.rooms === "total");
  const sorted = [...rents].sort((a, b) => b.estimated_asking_rent_eur_sqm - a.estimated_asking_rent_eur_sqm);
  const measured = data.cities().length;
  const dear = sorted[0], cheap = sorted[sorted.length - 1];
  return (
    <>
      <PageHero title="Germany, district by district"
        lead={<>What a new lease costs, how that compares with local incomes, and how tight the market is, for all 400{" "}
          <Term k="kreis">districts</Term>. Click any of them to read about it in plain words.</>}
        facts={<>
          <Stat label="Typical district" value={eur(median(rents.map((r) => r.estimated_asking_rent_eur_sqm)))} unit="per m²" say="Estimated asking rent for a new lease today." />
          <Stat label={`Dearest: ${short(dear.kreis_name)}`} value={eur(dear.estimated_asking_rent_eur_sqm)} unit="per m²" say={<>About {num(Math.round(dear.estimated_asking_rent_eur_sqm * 6) * 10)} € a month for 60 m².</>} />
          <Stat label={`Cheapest: ${short(cheap.kreis_name)}`} value={eur(cheap.estimated_asking_rent_eur_sqm)} unit="per m²" say={<>About {num(Math.round(cheap.estimated_asking_rent_eur_sqm * 6) * 10)} € a month for 60 m².</>} />
          <Stat label="Measured directly" value={measured} unit={`of ${rents.length}`} say="Districts with listing data; the rest are estimated from census rents." />
        </>} />
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <KreisMap afford={data.affordability()} sd={data.supplyDemand()} citySlugs={citySlugs}
            asking={rents} />
        </div>
      </section>
    </>
  );
}
