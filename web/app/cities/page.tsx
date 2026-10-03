import type { Metadata } from "next";
import { CityCards, type CardCity } from "@/components/CityCards";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";
import { monthLong } from "@/lib/format";

export const metadata: Metadata = { title: "Cities", description: "Rent profiles for 37 German cities: asking rents, trends, affordability and forecasts." };

export default function Cities() {
  const cities = data.cities();
  const monthly = data.monthly();
  const meta = data.meta();
  const cards: CardCity[] = cities.map((c) => ({
    slug: c.slug, city: c.city, city_en: c.city_en, land: c.land_name, median: c.median_rent_sqm, yoy: c.index_yoy_pct,
    burden: c.asking_rent_burden_pct,
    spark: monthly.filter((r) => r.city === c.city && r.median_rent_sqm != null).map((r) => r.median_rent_sqm as number),
  }));
  return (
    <>
      <header className="hero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <h1 className="enter">37 cities, one page each</h1>
          <p className="lead enter">An AI-written summary, a street-level rent map and a 12-month outlook for every city. Lines show the median{" "}
            <Term k="asking-rent" /> since 2020, up to {monthLong(meta.latest_month)}.</p>
        </div>
      </header>
      <section className="section tight">
        <div className="wrap"><CityCards cities={cards} /></div>
      </section>
    </>
  );
}
