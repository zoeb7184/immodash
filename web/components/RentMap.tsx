"use client";

// Street map with the Zensus 100 m rent grid on top (MapLibre GL + OpenFreeMap vector tiles, free and keyless).
// The map has a fixed, screen-sized height, zooms and pans smoothly, and keeps street names above the colours.
// If the basemap cannot load (offline, blocked), the grid is drawn on a plain background instead.
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, StyleSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadJson } from "@/lib/api";
import { laeaToLonLat } from "@/lib/laea";
import { useTokens } from "@/lib/theme";
import type { Grid } from "@/lib/types";

const RAMP = ["--q1", "--q2", "--q3", "--q4", "--q5"];
const TOKENS = [...RAMP, "--surface", "--surface-2", "--ink", "--ink-2", "--bg"];
const STYLE = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };

function quantile(sorted: number[], q: number) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
}
const isDark = () => {
  const t = document.documentElement.getAttribute("data-theme");
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function RentMap({ ags, city }: { ags: string; city: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; v: number } | null>(null);
  const [plain, setPlain] = useState(false);
  const t = useTokens(TOKENS);

  useEffect(() => {
    setGrid(null);
    loadJson<Grid>(`grid/${ags}.json`).then(setGrid).catch((e) => setError(String(e)));
  }, [ags]);

  // grid cells (EPSG:3035 centres) -> lon/lat squares, done once per city
  const geo = useMemo(() => {
    if (!grid) return null;
    const half = grid.resolution_m / 2, feats: GeoJSON.Feature[] = [], vals: number[] = [];
    let w = 180, s = 90, e = -180, n = -90;
    for (let i = 0; i < grid.x.length; i++) {
      if (grid.low_reliability[i]) continue;
      const x = grid.x[i], y = grid.y[i], v = grid.rent_eur_sqm[i];
      const ring = [[x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half], [x - half, y - half]]
        .map(([a, b]) => laeaToLonLat(a, b));
      for (const [lon, lat] of ring) { w = Math.min(w, lon); e = Math.max(e, lon); s = Math.min(s, lat); n = Math.max(n, lat); }
      feats.push({ type: "Feature", properties: { v }, geometry: { type: "Polygon", coordinates: [ring] } });
      vals.push(v);
    }
    const sorted = [...vals].sort((a, b) => a - b);
    let outline: GeoJSON.Feature | null = null;
    if (grid.outline_3035) {
      const polys = (grid.outline_3035.type === "MultiPolygon" ? grid.outline_3035.coordinates : [grid.outline_3035.coordinates]) as number[][][][];
      outline = { type: "Feature", properties: {}, geometry: { type: "MultiLineString",
        coordinates: polys.flatMap((p) => p.map((r) => r.map(([a, b]) => laeaToLonLat(a, b)))) } };
    }
    return { cells: { type: "FeatureCollection", features: feats } as GeoJSON.FeatureCollection, outline,
      bounds: [[w, s], [e, n]] as [[number, number], [number, number]],
      lo: quantile(sorted, 0.02), hi: quantile(sorted, 0.98), med: quantile(sorted, 0.5), n: vals.length };
  }, [grid]);

  // create the map once the grid is ready; rebuild the overlay when the theme changes
  useEffect(() => {
    if (!geo || !box.current || !t["--q1"]) return;
    let cancelled = false;
    let map = mapRef.current;
    const steps = [0, 0.25, 0.5, 0.75, 1].map((p) => geo.lo + p * (geo.hi - geo.lo));
    const fillColor = ["interpolate", ["linear"], ["get", "v"], ...steps.flatMap((s, i) => [s, t[RAMP[i]]])];
    const plainStyle: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": t["--surface"] } }] };

    const addOverlay = (m: MLMap) => {
      if (m.getSource("cells")) return;
      const firstLabel = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;
      m.addSource("cells", { type: "geojson", data: geo.cells });
      m.addLayer({ id: "cells", type: "fill", source: "cells",
        paint: { "fill-color": fillColor as never, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.82, 15, 0.6] } }, firstLabel);
      if (geo.outline) {
        m.addSource("outline", { type: "geojson", data: geo.outline });
        m.addLayer({ id: "outline", type: "line", source: "outline", paint: { "line-color": t["--ink-2"], "line-width": 1.2, "line-opacity": 0.7 } }, firstLabel);
      }
    };

    (async () => {
      const ml = (await import("maplibre-gl")).default;
      if (cancelled || !box.current) return;
      const styleUrl = isDark() ? STYLE.dark : STYLE.light;
      if (!map) {
        map = new ml.Map({
          container: box.current, style: plain ? plainStyle : styleUrl, bounds: geo.bounds, fitBoundsOptions: { padding: 24 },
          cooperativeGestures: true, attributionControl: { compact: true }, maxZoom: 17, minZoom: 8, dragRotate: false, pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        const m = map;
        let loaded = false;
        m.on("load", () => { loaded = true; addOverlay(m); });
        m.on("style.load", () => addOverlay(m));
        m.on("error", (ev) => {
          // basemap unreachable: fall back to a plain background so the rent grid still shows
          if (!loaded && !plain) { setPlain(true); m.setStyle(plainStyle); }
          console.warn("RentMap:", ev.error?.message);
        });
        m.on("mousemove", "cells", (ev) => {
          const f = ev.features?.[0];
          if (f) setHover({ x: ev.point.x, y: ev.point.y, v: Number(f.properties?.v) });
        });
        m.on("mouseleave", "cells", () => setHover(null));
      } else {
        // theme changed: swap basemap and recolour the overlay
        map.setStyle(plain ? plainStyle : styleUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [geo, t, plain]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  if (error) return <p className="note">Neighbourhood grid unavailable ({error}).</p>;
  return (
    <div>
      <div className="rentmap" role="region" aria-label={`Street map of ${city} with rent per 100 metre square`}>
        <div ref={box} className="rentmap-canvas" />
        {!geo && <div className="rentmap-loading">Loading 100 m grid…</div>}
        {hover && geo && (
          <div className="tooltip" style={{ position: "absolute", left: Math.min(hover.x + 14, (box.current?.clientWidth ?? 400) - 220), top: hover.y + 14, pointerEvents: "none", zIndex: 3 }}>
            <b>{hover.v.toFixed(2)} € per m²</b><br />{((100 * hover.v) / geo.med - 100).toFixed(0)}% vs. the {city} median
          </div>
        )}
      </div>
      {geo && (
        <div className="legend" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <span>{geo.lo.toFixed(1)} €</span>
          <span className="bar" style={{ background: `linear-gradient(90deg, ${RAMP.map((k) => t[k]).join(",")})` }} />
          <span>{geo.hi.toFixed(1)} € per m²</span>
          <span className="muted">· {geo.n.toLocaleString("en-GB")} squares · median {geo.med.toFixed(2)} € · hold Ctrl or Cmd and scroll, or pinch, to zoom</span>
        </div>
      )}
    </div>
  );
}
