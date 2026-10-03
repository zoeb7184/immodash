import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { RevealObserver } from "@/components/Reveal";
import { data } from "@/lib/data";
import { monthLong } from "@/lib/format";

export const metadata: Metadata = {
  title: { default: "ImmoDash · What renting in Germany really costs", template: "%s · ImmoDash" },
  description:
    "An interactive guide to German rents: how fast asking rents are rising in 37 cities, what a flat costs against local incomes, where the market is tightest, and a 12-month outlook. Rebuilt every week from open data.",
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfaf7" }, { media: "(prefers-color-scheme: dark)", color: "#111317" }],
};

// Apply a stored theme choice and the js flag before paint to avoid a flash.
const bootScript = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("immodash-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = data.meta();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <Nav />
        <main id="content">{children}</main>
        <footer className="foot">
          <div className="foot-inner">
            <div>
              <b>ImmoDash</b>
              <p style={{ margin: "6px 0 0" }}>
                An independent data project by <a href="https://github.com/zoeb7184">Zoeb Ali Khan</a>. Data up to{" "}
                {monthLong(meta.latest_month)}, refreshed automatically every week (last run {meta.generated_at.slice(0, 10)}).
                Source code on <a href="https://github.com/zoeb7184/immodash">GitHub</a>.
              </p>
            </div>
            <p style={{ margin: 0 }}>
              Data: Zensus 2022 and VGR der Länder (© Statistische Ämter des Bundes und der Länder, dl-de/by-2-0), GREIX
              Mietpreisindex (Kiel Institut für Weltwirtschaft), Deutsche Bundesbank, © GeoBasis-DE / BKG. Asking-rent figures
              outside the 37 GREIX cities are model estimates, not listings. Not financial advice.
            </p>
          </div>
        </footer>
        <RevealObserver />
      </body>
    </html>
  );
}
