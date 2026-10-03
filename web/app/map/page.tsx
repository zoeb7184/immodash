import type { Metadata } from "next";
import { KreisMap } from "@/components/KreisMap";
import { Term } from "@/components/Term";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Map", description: "Rents, affordability and market tightness for all 400 German districts on one map." };

export default function MapPage() {
  const citySlugs = Object.fromEntries(data.cities().map((c) => [c.ags, c.slug]));
  return (
    <>
      <header className="hero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <h1 className="enter">Germany, district by district</h1>
          <p className="lead enter">What a new lease costs, how that compares with local incomes, and how tight the market is, for all 400{" "}
            <Term k="kreis">districts</Term>. Click any of them to read about it in plain words.</p>
        </div>
      </header>
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <KreisMap afford={data.affordability()} sd={data.supplyDemand()} citySlugs={citySlugs}
            asking={data.askingRents().filter((r) => r.rooms === "total")} />
        </div>
      </section>
    </>
  );
}
