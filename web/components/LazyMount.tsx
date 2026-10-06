"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mounts heavy client charts only when they come near the viewport, so the first paint and hydration
 *  stay light. The placeholder keeps the final height, so nothing jumps when the chart appears. */
export function LazyMount({ children, minHeight, margin = "600px" }: { children: ReactNode; minHeight: number; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShow(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} style={show ? undefined : { minHeight }}>{show ? children : <div className="map-skeleton" style={{ height: minHeight, aspectRatio: "auto" }} aria-hidden />}</div>;
}
