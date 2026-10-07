"""Cut the German postcode areas (OpenStreetMap, ODbL) down to the Kreise that contain a GREIX city.

Input:  postleitzahlen.geojson(.br) from https://github.com/yetzt/postleitzahlen/releases (release 2026.02)
Output: data/raw/osm_postcodes/postleitzahlen_city_kreise.geojson  (only postcodes touching those Kreise,
        simplified to ~5 m, 6-decimal coordinates)

Usage:  python scripts/prepare_postcodes.py ~/Downloads/postleitzahlen.geojson.br
Postcode areas change rarely, so this is a manual step; re-run it when a new release is out.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import shapely
from shapely.geometry import mapping, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ingestion"))

from immodash_ingest.config import city_kreis_codes, raw_path  # noqa: E402
from immodash_ingest.sources.zensus_grid import _TO_3035, kreis_polygons_3035  # noqa: E402


def _load(path: Path) -> dict:
    raw = path.read_bytes()
    if path.suffix == ".br":
        import brotli

        raw = brotli.decompress(raw)
    return json.loads(raw)


def main(src: Path) -> None:
    kreise = kreis_polygons_3035(raw_path("geo_kreise"))
    cities = shapely.union_all([kreise[a] for a in city_kreis_codes() if a in kreise])
    shapely.prepare(cities)
    keep = []
    for f in _load(src)["features"]:
        geom = shape(f["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        g3035 = transform(_TO_3035, geom)
        if not cities.intersects(g3035):
            continue
        # keep only postcodes with a real share of their area inside a city Kreis
        if g3035.intersection(cities).area < 0.05 * g3035.area:
            continue
        simple = geom.simplify(0.00005, preserve_topology=True)
        gj = json.loads(json.dumps(mapping(simple)), parse_float=lambda x: round(float(x), 6))
        keep.append({"type": "Feature", "properties": {"plz": f["properties"]["postcode"]}, "geometry": gj})
    out = raw_path("osm_postcodes")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"type": "FeatureCollection", "features": keep}, separators=(",", ":")), encoding="utf-8")
    print(f"{len(keep)} postcode areas -> {out} ({out.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main(Path(sys.argv[1]).expanduser())
