import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { data } from "@/lib/data";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "ImmoDash · What renting in Germany really costs", template: "%s · ImmoDash" },
  openGraph: { title: "ImmoDash: what renting in Germany really costs", type: "website", locale: "en_GB" },
  description:
    "An interactive guide to German rents: how fast asking rents are rising in 37 cities, what a flat costs against local incomes, where the market is tightest, and a 12-month outlook. Rebuilt every week from open data.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f6f7" }, { media: "(prefers-color-scheme: dark)", color: "#0f1012" }],
};

// Apply a stored theme choice and the js flag before paint to avoid a flash.
const bootScript = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("immodash-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = data.meta();
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <Nav />
        <main id="content">{children}</main>
        <Footer latestMonth={meta.latest_month} generatedAt={meta.generated_at} />
      </body>
    </html>
  );
}
