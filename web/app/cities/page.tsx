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
      <header className="hero" style={{ paddingBottom: 8 }}>
        <div className="wrap">
          <div className="read">
            <div className="kicker">City profiles</div>
            <h1>37 cities, one page each</h1>
            <p className="dek">Every profile has an AI-written market summary, a street-level rent map, how fast flats are let and a 12-month
              outlook. Lines show the median <Term k="asking-rent" /> since 2020, up to {monthLong(meta.latest_month)}.</p>
          </div>
        </div>
      </header>
      <section className="section">
        <div className="wrap"><CityCards cities={cards} /></div>
      </section>
    </>
  );
}
