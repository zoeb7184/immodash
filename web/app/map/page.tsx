import type { Metadata } from "next";
import { KreisMap } from "@/components/KreisMap";
import { data } from "@/lib/data";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <>
      <div className="page-head">
        <div className="eyebrow">400 Kreise and kreisfreie Städte</div>
        <h1>Rents, affordability and tightness by Kreis</h1>
      </div>
      <KreisMap geo={data.geo()} afford={data.affordability()} sd={data.supplyDemand()}
        asking={data.askingRents().filter((r) => r.rooms === "total")} />
    </>
  );
}
