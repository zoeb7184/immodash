import type { Metadata } from "next";
import { CityCards, type CardCity } from "@/components/CityCards";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";
import { eur, median, monthLong, pct } from "@/lib/format";
import { PageHero, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Cities", description: "Rent profiles for 37 German cities: asking rents, trends, affordability and forecasts." };

export default function Cities() {
  const cities = data.cities();
  const monthly = data.monthly();
  const meta = data.meta();
  const byRent = [...cities].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm);
  const dear = byRent[0], cheap = byRent[byRent.length - 1];
  const fast = [...cities].sort((a, b) => (b.index_yoy_pct ?? -99) - (a.index_yoy_pct ?? -99))[0];
  const cards: CardCity[] = cities.map((c) => ({
    slug: c.slug, city: c.city, city_en: c.city_en, land: c.land_name, median: c.median_rent_sqm, yoy: c.index_yoy_pct,
    burden: c.asking_rent_burden_pct,
    spark: monthly.filter((r) => r.city === c.city && r.median_rent_sqm != null).map((r) => r.median_rent_sqm as number),
  }));
  return (
    <>
      <PageHero title="37 cities, one page each"
        lead={<>An AI-written summary, a street-level rent map and a 12-month outlook for every city. Lines show the median{" "}
          <Term k="asking-rent" /> since 2020, up to {monthLong(meta.latest_month)}.</>}
        facts={<>
          <Stat label="Typical city" value={eur(median(cities.map((c) => c.median_rent_sqm)))} unit="per m²" say="The middle of the 37 median asking rents." />
          <Stat label={`Most expensive: ${dear.city_en}`} value={eur(dear.median_rent_sqm)} unit="per m²" say={<>{pct(dear.index_yoy_pct, 1, true)} in the last 12 months.</>} />
          <Stat label={`Cheapest: ${cheap.city_en}`} value={eur(cheap.median_rent_sqm)} unit="per m²" say={<>{pct(cheap.index_yoy_pct, 1, true)} in the last 12 months.</>} />
          <Stat label={`Fastest rise: ${fast.city_en}`} value={pct(fast.index_yoy_pct, 1, true)} say="Change in asking rent in the last 12 months." />
        </>} />
      <section className="section tight">
        <div className="wrap"><CityCards cities={cards} /></div>
      </section>
    </>
  );
}
