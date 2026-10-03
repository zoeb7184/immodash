"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "The story" },
  { href: "/cities", label: "Cities" },
  { href: "/affordability", label: "Can I afford it?" },
  { href: "/map", label: "Map" },
  { href: "/supply-demand", label: "Supply & demand" },
  { href: "/methodology", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="topbar">
      <div className="topbar-inner" style={{ position: "relative" }}>
        <Link href="/" className="brand" aria-label="ImmoDash home">
          <b>ImmoDash</b> <small>German rents, explained</small>
        </Link>
        <button className="icon-btn menu-btn" aria-label="Menu" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen((o) => !o)}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <nav className="nav" id="mainnav" aria-label="Main" data-open={open}>
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
