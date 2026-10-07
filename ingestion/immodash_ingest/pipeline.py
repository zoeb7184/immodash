"""Acquire -> parse -> load bronze, for every registered source.

Usage:
    python -m immodash_ingest            # try to refresh downloads, fall back to local raw files
    python -m immodash_ingest --offline  # only use files already in data/raw
"""

from __future__ import annotations

import argparse
import logging
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from . import http
from .config import SOURCES, Source, city_kreis_codes, raw_path
from .sources import bundesbank, geo, greix, vgrdl, zensus, zensus_grid
from .warehouse import load_bronze

log = logging.getLogger("immodash_ingest")


@dataclass(frozen=True)
class Job:
    source_key: str
    table: str
    parser: Callable[[Path], pd.DataFrame]


def _geo() -> Path:
    return raw_path("geo_kreise")


JOBS: list[Job] = [
    Job("zensus_rent_by_rooms", "zensus_rent_by_rooms", zensus.parse),
    Job("zensus_vacancy", "zensus_vacancy", zensus.parse_vacancy),
    Job("zensus_rent_by_size", "zensus_rent_by_size", zensus.parse_rent_by_size),
    Job("zensus_bezirke_rent", "zensus_bezirke_rent", zensus.parse_bezirke_rent),
    Job("zensus_grid_rent", "zensus_grid_rent_1km", lambda p: zensus_grid.parse_1km(p, _geo())),
    Job("zensus_grid_rent", "zensus_grid_rent_100m",
        lambda p: zensus_grid.parse_100m_for(p, _geo(), city_kreis_codes(), raw_path("osm_postcodes"))),
    Job("geo_kreise", "geo_kreise_outline_3035", lambda p: zensus_grid.kreis_outlines_3035(p)),
    Job("vgrdl_income", "vgrdl_income_population", vgrdl.parse),
    Job("greix_rents", "greix_city_rents", greix.parse_rents),
    Job("greix_rent_vs_sales", "greix_rent_vs_sales", greix.parse_rent_vs_sales),
    Job("bundesbank_mortgage_rate", "bundesbank_mortgage_rate", bundesbank.parse),
    Job("geo_kreise", "geo_kreise", geo.parse),
]


def acquire(source: Source, offline: bool) -> Path:
    """Refresh the raw file if possible; otherwise keep the existing local copy."""
    path = raw_path(source)
    if offline:
        return path
    try:
        if source.key.startswith("zensus_") and source.url is None:
            table = path.name.split("_")[0]
            return zensus.fetch_via_api(path, table=table)
        if source.url:
            return http.download(source.url, path)
    except Exception as exc:  # noqa: BLE001 - network/source issues must not kill the run
        if path.exists():
            log.warning("refresh failed for %s (%s); using cached %s", source.key, exc, path.name)
        else:
            raise
    return path


def run(offline: bool = False, warehouse_url: str | None = None) -> dict[str, int]:
    results: dict[str, int] = {}
    acquired: dict[str, Path] = {}
    for job in JOBS:
        source = SOURCES[job.source_key]
        if source.key not in acquired:
            acquired[source.key] = acquire(source, offline)
        path = acquired[source.key]
        if not path.exists():
            raise FileNotFoundError(f"{source.key}: missing raw file {path}")
        df = job.parser(path)
        if df.empty:
            raise ValueError(f"{source.key}: parser returned no rows")
        results[job.table] = load_bronze(df, job.table, source_key=source.key, url=warehouse_url)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="use only files in data/raw")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    for table, n in run(offline=args.offline).items():
        print(f"bronze.{table:<28} {n:>7} rows")


if __name__ == "__main__":
    main()
