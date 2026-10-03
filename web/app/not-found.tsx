import Link from "next/link";

export default function NotFound() {
  return (
    <header className="hero">
      <div className="wrap">
        <h1>We couldn&apos;t find that page</h1>
        <p className="lead">The city or page you asked for isn&apos;t in ImmoDash. City addresses use lower case without umlauts, for example{" "}
          <Link href="/cities/muenchen">/cities/muenchen</Link>.</p>
        <div className="hero-cta">
          <Link className="btn" href="/">Back to the story</Link>
          <Link className="textlink" href="/cities">All cities</Link>
        </div>
      </div>
    </header>
  );
}
