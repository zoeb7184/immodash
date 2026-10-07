// Site footer: structure follows the "open source project" footer pattern (brand + status, link columns,
// author, legal bar), built in the site's own design system rather than importing another UI kit.
import Link from "next/link";
import { ArrowUpRight, GithubLogo, Globe, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { monthLong } from "@/lib/format";

const REPO = "https://github.com/zoeb7184/immodash";

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  { title: "Explore", links: [
    { href: "/", label: "The story" }, { href: "/cities", label: "City profiles" }, { href: "/affordability", label: "Can I afford it?" },
    { href: "/map", label: "District map" }, { href: "/supply-demand", label: "Supply & demand" },
  ] },
  { title: "Project", links: [
    { href: "/about", label: "Why I built this" }, { href: "/methodology", label: "How it works" }, { href: "/methodology#references", label: "References" }, { href: "/methodology#sources", label: "Data sources" },
    { href: REPO, label: "Source code", external: true }, { href: `${REPO}/issues`, label: "Report an issue", external: true },
  ] },
  { title: "Author", links: [
    { href: "https://zoeb7184.github.io", label: "Portfolio", external: true }, { href: "https://linkedin.com/in/zoeb-ali-khan", label: "LinkedIn", external: true },
    { href: "https://github.com/zoeb7184", label: "GitHub", external: true },
  ] },
];

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function Footer({ latestMonth, generatedAt }: { latestMonth: string; generatedAt: string }) {
  const year = new Date(generatedAt).getUTCFullYear();
  return (
    <footer className="foot">
      <div className="foot-main">
        <div className="foot-brand">
          <Link href="/" className="brand" aria-label="ImmoDash home"><span className="brand-mark" aria-hidden><span /></span><b>ImmoDash</b></Link>
          <p className="foot-tag">German rents, explained with open data. An independent data project by Zoeb Ali Khan, M.Sc. Data Science student at Universität Bielefeld.</p>
          <p className="foot-status">
            <span className="live-dot" aria-hidden />
            <span>Data up to {monthLong(latestMonth)}. Last automatic refresh {fmtDay(generatedAt)}.</span>
          </p>
          <div className="foot-social">
            <a className="icon-btn" href={REPO} aria-label="ImmoDash source code on GitHub"><GithubLogo size={18} weight="bold" aria-hidden /></a>
            <a className="icon-btn" href="https://linkedin.com/in/zoeb-ali-khan" aria-label="Zoeb Ali Khan on LinkedIn"><LinkedinLogo size={18} weight="bold" aria-hidden /></a>
            <a className="icon-btn" href="https://zoeb7184.github.io" aria-label="Zoeb Ali Khan portfolio"><Globe size={18} weight="bold" aria-hidden /></a>
          </div>
        </div>
        <nav className="foot-cols" aria-label="Footer">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2 className="foot-h">{c.title}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    {l.external
                      ? <a href={l.href}>{l.label}<ArrowUpRight size={12} weight="bold" aria-hidden className="ext" /></a>
                      : <Link href={l.href}>{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="foot-legal">
        <p>&copy; {year} Zoeb Ali Khan. A student portfolio project, not affiliated with the data providers. Estimates, not financial advice.</p>
        <p>
          Data: Zensus 2022 and VGR der Länder (Statistische Ämter des Bundes und der Länder, dl-de/by-2-0); GREIX Mietpreisindex (Kiel Institut
          für Weltwirtschaft); Deutsche Bundesbank; &copy; GeoBasis-DE / BKG. Asking rents outside the 37 GREIX cities are model estimates.
        </p>
      </div>
    </footer>
  );
}
