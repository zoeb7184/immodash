"""Zensus 2022 average net cold rent on the INSPIRE grid (EPSG:3035).

- 1 km grid: kept nationwide (~136k cells) and assigned to a Kreis by point-in-polygon.
- 100 m grid: kept only for the Kreise that contain a GREIX city (neighbourhood heatmaps).
Cells published in brackets ("KLAMMERN") have low statistical reliability; they are flagged.
"""

from __future__ import annotations

import csv
import json
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform

_TO_3035 = Transformer.from_crs("EPSG:4326", "EPSG:3035", always_xy=True).transform


def kreis_polygons_3035(geojson_path: Path) -> dict[str, shapely.Geometry]:
    """AGS -> polygon in EPSG:3035. Eisenach (16056) is merged into the Wartburgkreis (16063)."""
    gj = json.loads(Path(geojson_path).read_text(encoding="utf-8"))
    polys: dict[str, list] = {}
    for feat in gj["features"]:
        ags = str(feat["properties"]["ARS"])[:5]
        ags = "16063" if ags == "16056" else ags
        polys.setdefault(ags, []).append(transform(_TO_3035, shape(feat["geometry"])))
    return {a: shapely.union_all(p) for a, p in polys.items()}


def _read_grid(zip_path: Path, resolution: str) -> pd.DataFrame:
    with zipfile.ZipFile(zip_path) as zf:
        name = next(n for n in zf.namelist() if n.endswith(f"_{resolution}-Gitter.csv"))
        df = pd.read_csv(zf.open(name), sep=";", decimal=",", encoding="latin-1",
                         quoting=csv.QUOTE_NONE)
    df.columns = ["grid_id", "x", "y", "rent_eur_sqm", "flag"]
    df["low_reliability"] = df["flag"].eq("KLAMMERN")
    return df.drop(columns="flag")


def _assign_kreis(df: pd.DataFrame, polys: dict[str, shapely.Geometry], only: set[str] | None) -> pd.DataFrame:
    xs, ys = df["x"].to_numpy(float), df["y"].to_numpy(float)
    ags = np.full(len(df), None, dtype=object)
    for code, poly in polys.items():
        if only is not None and code not in only:
            continue
        minx, miny, maxx, maxy = poly.bounds
        cand = np.where((xs >= minx) & (xs <= maxx) & (ys >= miny) & (ys <= maxy) & (ags == None))[0]  # noqa: E711
        if len(cand) == 0:
            continue
        shapely.prepare(poly)
        inside = shapely.contains_xy(poly, xs[cand], ys[cand])
        ags[cand[inside]] = code
    df = df.assign(ags=ags)
    return df[df["ags"].notna()].reset_index(drop=True)


def parse_1km(zip_path: Path, geojson_path: Path) -> pd.DataFrame:
    df = _read_grid(zip_path, "1km")
    out = _assign_kreis(df, kreis_polygons_3035(geojson_path), only=None)
    out["resolution_m"] = 1000
    return out


def parse_100m_for(zip_path: Path, geojson_path: Path, ags_codes: set[str]) -> pd.DataFrame:
    df = _read_grid(zip_path, "100m")
    out = _assign_kreis(df, kreis_polygons_3035(geojson_path), only=ags_codes)
    out["resolution_m"] = 100
    return out


def kreis_outlines_3035(geojson_path: Path, ags_codes: set[str] | None = None) -> pd.DataFrame:
    """Simplified Kreis outlines in EPSG:3035 (for drawing borders on grid heatmaps)."""
    rows = []
    for code, poly in kreis_polygons_3035(geojson_path).items():
        if ags_codes is None or code in ags_codes:
            simple = poly.simplify(50)
            rows.append({"ags": code, "outline_3035_geojson": json.dumps(shapely.geometry.mapping(simple))})
    return pd.DataFrame(rows)
