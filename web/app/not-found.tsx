import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-head">
      <h1>Page not found</h1>
      <p className="lede">That city or page isn&apos;t in ImmoDash. <Link href="/">Back to the overview</Link>.</p>
    </div>
  );
}
