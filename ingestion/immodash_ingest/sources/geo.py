"""Kreis boundaries (BKG VG5000) keyed by the 5-digit AGS."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


def parse(path: Path) -> pd.DataFrame:
    gj = json.loads(path.read_text(encoding="utf-8"))
    rows = []
    for feat in gj["features"]:
        p = feat["properties"]
        rows.append(
            {
                "ags": str(p["ARS"])[:5],
                "name": p["GEN"],
                "kreis_type": p["BEZ"],
                "geometry_geojson": json.dumps(feat["geometry"], separators=(",", ":")),
            }
        )
    return pd.DataFrame(rows)
