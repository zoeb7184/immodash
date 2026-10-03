"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { loadJson } from "@/lib/api";
import { useTokens } from "@/lib/theme";
import type { Grid } from "@/lib/types";

const RAMP = ["--q1", "--q2", "--q3", "--q4", "--q5", "--ink-2", "--surface"];

function quantile(sorted: number[], q: number) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
}

/** Zensus 2022 rent per 100 m grid cell, drawn on a canvas (EPSG:3035 metres, north up). */
export function GridHeatmap({ ags }: { ags: string }) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; v: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const t = useTokens(RAMP);

  useEffect(() => {
    setGrid(null);
    loadJson<Grid>(`grid/${ags}.json`)
      .then(setGrid)
      .catch((e) => setError(String(e)));
  }, [ags]);

  const geom = useMemo(() => {
    if (!grid) return null;
    const idx = grid.x.map((_, i) => i).filter((i) => !grid.low_reliability[i]);
    const xs = idx.map((i) => grid.x[i]), ys = idx.map((i) => grid.y[i]), vs = idx.map((i) => grid.rent_eur_sqm[i]);
    const sorted = [...vs].sort((a, b) => a - b);
    return { xs, ys, vs, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys),
      lo: quantile(sorted, 0.02), hi: quantile(sorted, 0.98), med: quantile(sorted, 0.5), n: vs.length };
  }, [grid]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !geom || !t["--q1"]) return;
    const res = 100, W = c.clientWidth, cols = (geom.x1 - geom.x0) / res + 1, rows = (geom.y1 - geom.y0) / res + 1;
    const cell = Math.max(1, W / cols), H = Math.ceil(rows * cell), dpr = window.devicePixelRatio || 1;
    c.height = H * dpr; c.width = W * dpr; c.style.height = `${H}px`;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = t["--surface"]; ctx.fillRect(0, 0, W, H);
    const steps = [0, 0.25, 0.5, 0.75, 1].map((p) => geom.lo + p * (geom.hi - geom.lo));
    const color = scaleLinear<string>().domain(steps).range(["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => t[k])).clamp(true);
    for (let i = 0; i < geom.n; i++) {
      ctx.fillStyle = color(geom.vs[i]);
      ctx.fillRect(((geom.xs[i] - geom.x0) / res) * cell, ((geom.y1 - geom.ys[i]) / res) * cell, Math.ceil(cell), Math.ceil(cell));
    }
    if (grid?.outline_3035) {
      ctx.strokeStyle = t["--ink-2"]; ctx.lineWidth = 1;
      const polys = (grid.outline_3035.type === "MultiPolygon" ? grid.outline_3035.coordinates : [grid.outline_3035.coordinates]) as number[][][][];
      for (const poly of polys) {
        ctx.beginPath();
        poly[0].forEach(([x, y], j) => {
          const px = ((x - geom.x0) / res) * cell + cell / 2, py = ((geom.y1 - y) / res) * cell + cell / 2;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
    }
    // store the mapping for hover lookups
    (c as HTMLCanvasElement & { _map?: unknown })._map = { cell, res };
  }, [geom, grid, t]);

  const lookup = useMemo(() => {
    if (!geom) return null;
    const m = new Map<string, number>();
    for (let i = 0; i < geom.n; i++) m.set(`${geom.xs[i]},${geom.ys[i]}`, geom.vs[i]);
    return m;
  }, [geom]);

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvas.current;
    if (!c || !geom || !lookup) return;
    const r = c.getBoundingClientRect(), cols = (geom.x1 - geom.x0) / 100 + 1, cell = Math.max(1, r.width / cols);
    const gx = geom.x0 + Math.floor((e.clientX - r.left) / cell) * 100, gy = geom.y1 - Math.floor((e.clientY - r.top) / cell) * 100;
    const v = lookup.get(`${gx},${gy}`);
    setHover(v == null ? null : { x: e.clientX - r.left, y: e.clientY - r.top, v });
  }

  if (error) return <p className="note">Neighbourhood grid unavailable ({error}).</p>;
  if (!geom) return <p className="note">Loading 100 m grid…</p>;
  return (
    <div className="mapwrap">
      <canvas ref={canvas} style={{ width: "100%", display: "block" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        role="img" aria-label={`Rent per 100 m grid cell, median ${geom.med.toFixed(2)} euro per square metre`} />
      {hover && (
        <div className="tooltip" style={{ position: "absolute", left: hover.x + 12, top: hover.y + 12, pointerEvents: "none" }}>
          <b>{hover.v.toFixed(2)} €/m²</b> · {((100 * hover.v) / geom.med - 100).toFixed(0)}% vs. city median
        </div>
      )}
      <div className="legend" style={{ marginTop: 8 }}>
        <span>{geom.lo.toFixed(1)} €</span>
        <span className="bar" style={{ background: `linear-gradient(90deg, ${["--q1", "--q2", "--q3", "--q4", "--q5"].map((k) => t[k]).join(",")})` }} />
        <span>{geom.hi.toFixed(1)} €</span>
        <span>· {geom.n.toLocaleString("en-GB")} cells · median {geom.med.toFixed(2)} €/m²</span>
      </div>
    </div>
  );
}
