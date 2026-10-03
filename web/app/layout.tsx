import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "ImmoDash", template: "%s · ImmoDash" },
  description: "German rental market intelligence: asking rents, affordability, supply and demand, and forecasts.",
};

// Apply a stored theme choice before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("immodash-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="foot">
          Data: Zensus 2022 and VGR der Länder (© Statistische Ämter des Bundes und der Länder, dl-de/by-2-0), GREIX
          Mietpreisindex (Kiel Institut), Deutsche Bundesbank, © GeoBasis-DE / BKG. Asking-rent estimates outside the 37
          GREIX cities are modelled. Built by Zoeb Ali Khan.
        </footer>
      </body>
    </html>
  );
}
