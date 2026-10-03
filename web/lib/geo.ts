"use client";

import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { loadJson } from "./api";
import type { KreisGeo } from "./types";

export const MAP_W = 560, MAP_H = 760;

/** Kreis outlines projected to the shared map frame. `lite` loads the coarser outline file (falls back to the full one). */
export function useKreisPaths(geoIn?: KreisGeo, lite = false) {
  const [geo, setGeo] = useState<KreisGeo | null>(geoIn ?? null);
  useEffect(() => {
    if (geoIn) return;
    const full = () => loadJson<KreisGeo>("geo-kreise.json");
    (lite ? loadJson<KreisGeo>("geo-kreise-lite.json").catch(full) : full()).then(setGeo).catch(() => setGeo(null));
  }, [geoIn, lite]);
  return useMemo(() => {
    if (!geo) return null;
    const proj = geoMercator().fitSize([MAP_W, MAP_H], geo as unknown as FeatureCollection);
    const gp = geoPath(proj);
    return geo.features.map((f) => {
      const c = gp.centroid(f as unknown as Feature);
      return { ags: f.id, name: f.properties.name, d: gp(f as unknown as Feature) ?? "", cx: c[0], cy: c[1] };
    });
  }, [geo]);
}
