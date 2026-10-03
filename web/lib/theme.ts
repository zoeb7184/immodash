"use client";

import { useEffect, useState } from "react";

/** Read CSS custom properties (for canvas/SVG fills) and re-read when the theme changes. */
export function useTokens(names: string[]): Record<string, string> {
  const key = names.join(",");
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setVals(Object.fromEntries(key.split(",").map((n) => [n, cs.getPropertyValue(n).trim()])));
    };
    read();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", read); mo.disconnect(); };
  }, [key]);
  return vals;
}
