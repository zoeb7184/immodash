import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { HERO_H, HERO_W, type HeroPath } from "@/lib/heroMap";
import { HeroMapHover } from "./HeroMapHover";

/** Hero visual: every district coloured by estimated asking rent (real data, not decoration).
 *  Rendered on the server; only the hover tooltip runs in the browser. */
export function HeroMap({ paths, lo, hi, rents, names }: {
  paths: HeroPath[]; lo: number; hi: number; rents: Record<string, number>; names: Record<string, string>;
}) {
  return (
    <div className="hero-visual">
      <HeroMapHover rents={rents} names={names}>
        <svg className="hero-map" viewBox={`0 0 ${HERO_W} ${HERO_H}`} style={{ width: "100%", display: "block" }} role="img"
          aria-label="Map of Germany's 400 districts coloured by estimated asking rent">
          {paths.map((p) => (
            <path key={p.ags} className="k" data-ags={p.ags} d={p.d} style={{ fill: p.fill, ["--rank" as string]: p.rank }} />
          ))}
        </svg>
      </HeroMapHover>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <div className="legend">
          <span>{lo.toFixed(0)} €</span>
          <span className="bar" style={{ width: 120, background: "linear-gradient(90deg, var(--q1), var(--q2), var(--q3), var(--q4), var(--q5))" }} />
          <span>{hi.toFixed(0)} € per m²</span>
        </div>
        <Link href="/map" className="textlink" style={{ fontSize: 14 }}>Explore the map <ArrowRight size={14} weight="bold" aria-hidden /></Link>
      </div>
    </div>
  );
}
