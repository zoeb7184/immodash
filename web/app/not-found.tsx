import Link from "next/link";

export default function NotFound() {
  return (
    <header className="hero">
      <div className="wrap">
        <div className="read">
          <div className="kicker">404</div>
          <h1>We couldn&apos;t find that page</h1>
          <p className="dek">The city or page you asked for isn&apos;t in ImmoDash. City addresses use lower case without umlauts, for example{" "}
            <Link href="/cities/muenchen">/cities/muenchen</Link>.</p>
          <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
            <Link className="btn" href="/">Read the story</Link>
            <Link className="btn ghost" href="/cities">All cities</Link>
          </p>
        </div>
      </div>
    </header>
  );
}
