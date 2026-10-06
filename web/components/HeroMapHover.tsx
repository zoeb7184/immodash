"use client";

import { useState, type ReactNode } from "react";

/** Tooltip for the server-rendered hero map: one delegated mouse handler for all 400 districts. */
export function HeroMapHover({ children, rents, names }: { children: ReactNode; rents: Record<string, number>; names: Record<string, string> }) {
  const [hover, setHover] = useState<{ ags: string; x: number; y: number } | null>(null);
  return (
    <div className="mapwrap" onMouseLeave={() => setHover(null)}
      style={{ maxWidth: "min(100%, 680px, calc((100svh - 230px) * 0.737))", minWidth: "min(100%, 300px)", marginInline: "auto" }}
      onMouseMove={(e) => {
        const ags = (e.target as Element).getAttribute?.("data-ags");
        if (!ags) { setHover(null); return; }
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ ags, x: e.clientX - r.left, y: e.clientY - r.top });
      }}>
      {children}
      {hover && rents[hover.ags] != null && (
        <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 12, 260), top: hover.y + 12, pointerEvents: "none" }}>
          <b>{names[hover.ags]?.split(",")[0]}</b><br />about {rents[hover.ags].toFixed(2)} € per m²
        </div>
      )}
    </div>
  );
}
