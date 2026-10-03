"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "dark", dark: "light", light: "system" };

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
    <button className="theme-btn" onClick={cycle} aria-label="Change colour theme">
      Theme: {mode}
    </button>
  );
}
