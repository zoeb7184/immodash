"use client";

import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { loadJson } from "./api";
import type { KreisGeo } from "./types";

export const MAP_W = 560, MAP_H = 760;

export function useKreisPaths(geoIn?: KreisGeo) {
  const [geo, setGeo] = useState<KreisGeo | null>(geoIn ?? null);
  useEffect(() => {
    if (!geoIn) loadJson<KreisGeo>("geo-kreise.json").then(setGeo).catch(() => setGeo(null));
  }, [geoIn]);
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
