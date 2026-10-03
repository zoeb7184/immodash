"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "dark", dark: "light", light: "system" };
const LABEL: Record<Mode, string> = { system: "Theme follows your system", dark: "Dark theme", light: "Light theme" };

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    const a = document.documentElement.getAttribute("data-theme");
    if (a === "light" || a === "dark") setMode(a);
  }, []);
  function cycle() {
    const m = NEXT[mode];
    setMode(m);
    try {
      if (m === "system") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("immodash-theme");
      } else {
        document.documentElement.setAttribute("data-theme", m);
        localStorage.setItem("immodash-theme", m);
      }
    } catch {}
  }
  return (
    <button className="icon-btn" onClick={cycle} aria-label={`${LABEL[mode]}. Change theme`} title={LABEL[mode]}>
      {mode === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" fill="currentColor" /></svg>
      ) : mode === "light" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" /></svg>
      )}
    </button>
  );
}
