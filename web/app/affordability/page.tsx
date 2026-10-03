import type { Metadata } from "next";
import { Finder } from "@/components/Finder";
import { data } from "@/lib/data";
import { eur, pct } from "@/lib/format";
import type { KreisAffordability } from "@/lib/types";

export const metadata: Metadata = { title: "Affordability" };

export default function Affordability() {
  const aff = data.affordability();
  const best = aff.slice(0, 10), worst = aff.slice(-10).reverse();
  const table = (rows: KreisAffordability[]) => (
    <div className="tablewrap"><table>
      <thead><tr><th>Kreis</th><th className="num">Rent 2022</th><th className="num">Income / resident</th><th className="num">Burden</th></tr></thead>
      <tbody>{rows.map((k) => (
        <tr key={k.ags}><td>{k.kreis_name.split(",")[0]}</td><td className="num">{eur(k.rent_eur_sqm)}</td>
          <td className="num">{eur(k.disposable_income_per_resident_eur, 0)}</td><td className="num">{pct(k.rent_burden_pct)}</td></tr>))}
      </tbody></table></div>
  );
  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Rent burden = cold rent for 60 m² ÷ disposable income of 2 residents</div>
        <h1>What renting costs against what people earn</h1>
      </div>
      <div className="grid">
        <Finder />
        <section className="panel c6"><h2>Least affordable Kreise</h2><p className="sub">Highest rent burden, 2022</p>{table(worst)}</section>
        <section className="panel c6"><h2>Most affordable Kreise</h2><p className="sub">Lowest rent burden, 2022</p>{table(best)}</section>
      </div>
    </>
  );
}
