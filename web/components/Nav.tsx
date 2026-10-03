"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/map", label: "Map" },
  { href: "/supply-demand", label: "Supply & demand" },
  { href: "/affordability", label: "Affordability" },
  { href: "/methodology", label: "Methodology" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          ImmoDash <small>German rental market</small>
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
