"""Central configuration: paths, warehouse URL and the source registry."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = Path(os.getenv("IMMODASH_RAW_DIR", PROJECT_ROOT / "data" / "raw"))
DEFAULT_WAREHOUSE_URL = f"duckdb:///{PROJECT_ROOT / 'warehouse' / 'immodash.duckdb'}"


def warehouse_url() -> str:
    return _normalise(os.getenv("WAREHOUSE_URL") or os.getenv("DATABASE_URL") or DEFAULT_WAREHOUSE_URL)

def _normalise(url: str) -> str:
    """Accept postgres://... / postgresql://... (Railway, Render, Neon) and use the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url



@dataclass(frozen=True)
class Source:
    """A public dataset. `url` is the canonical download location; `filename` is the
    local copy under data/raw/<folder>/ that the parser reads."""

    key: str
    folder: str
    filename: str
    url: str | None
    licence: str
    publisher: str


SOURCES: dict[str, Source] = {
    s.key: s
    for s in [
        Source(
            key="zensus_rent_by_rooms",
            folder="zensus",
            filename="4000W-0011_de_flat.csv",
            url=None,  # fetched through the Zensus database API (token) or exported manually
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0011)",
        ),
        Source(
            key="zensus_vacancy",
            folder="zensus",
            filename="4000W-0002_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0002)",
        ),
        Source(
            key="zensus_rent_by_size",
            folder="zensus",
            filename="4000W-0009_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0009)",
        ),
        Source(
            key="zensus_bezirke_rent",
            folder="zensus",
            filename="4000W-0004_de_flat.csv",
            url=None,
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 (table 4000W-0004, Bezirke)",
        ),
        Source(
            key="osm_postcodes",
            folder="osm_postcodes",
            filename="postleitzahlen_city_kreise.geojson",
            url=None,  # subset of github.com/yetzt/postleitzahlen (release 2026.02), made by scripts/prepare_postcodes.py
            licence="ODbL 1.0 (© OpenStreetMap contributors); the derived postcode rent table is shared under ODbL",
            publisher="OpenStreetMap postcode boundaries via yetzt/postleitzahlen (release 2026.02)",
        ),
        Source(
            key="zensus_grid_rent",
            folder="zensus_grid",
            filename="Zensus2022_Durchschn_Nettokaltmiete.zip",
            url="https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Durchschn_Nettokaltmiete.zip",
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Statistische Ämter des Bundes und der Länder, Zensus 2022 Gitterzellen (100 m / 1 km)",
        ),
        Source(
            key="vgrdl_income",
            folder="vgrdl",
            filename="vgrdl_r2b3_bs2024.xlsx",
            url="https://www.statistikportal.de/sites/default/files/2026-01/vgrdl_r2b3_bs2024.xlsx",
            licence="Datenlizenz Deutschland - Namensnennung - Version 2.0",
            publisher="Arbeitskreis VGR der Länder, Reihe 2 Band 3 (Berechnungsstand 2024)",
        ),
        Source(
            key="greix_rents",
            folder="greix",
            filename="City_metrics_public.xlsx",
            url=(
                "https://www.kielinstitut.de/fileadmin/Dateiverwaltung/IfW_Unit/Macroeconomics/"
                "GREIX/Mietpreisindex/City_metrics_public.xlsx"
            ),
            licence="Free use with attribution (GREIX, Kiel Institut / VALUE Marktdaten)",
            publisher="GREIX Mietpreisindex, Kiel Institut für Weltwirtschaft",
        ),
        Source(
            key="greix_rent_vs_sales",
            folder="greix",
            filename="City_Metrics_rents_sales-Mietpreis-Transaktionspreisindex.xlsx",
            url=(
                "https://www.kielinstitut.de/fileadmin/Dateiverwaltung/IfW_Unit/Macroeconomics/"
                "GREIX/Mietpreisindex/City_Metrics_rents_sales-Mietpreis-Transaktionspreisindex.xlsx"
            ),
            licence="Free use with attribution (GREIX, Kiel Institut)",
            publisher="GREIX Miet- und Transaktionspreisindex, Kiel Institut für Weltwirtschaft",
        ),
        Source(
            key="bundesbank_mortgage_rate",
            folder="bundesbank",
            filename="BBIM1.M.DE.B.A2C.A.R.A.2250.EUR.N.csv",
            url=(
                "https://api.statistiken.bundesbank.de/rest/download/BBIM1/"
                "M.DE.B.A2C.A.R.A.2250.EUR.N?format=csv&lang=en"
            ),
            licence="Deutsche Bundesbank, free use with attribution",
            publisher="Deutsche Bundesbank, MFI interest rate statistics (SUD131Z)",
        ),
        Source(
            key="geo_kreise",
            folder="geo",
            filename="kreise_vg5000.geojson",
            url=(
                "https://raw.githubusercontent.com/Praesklepios/geoGermany/main/geojson/"
                "Ebene_Kreise.geojson"
            ),
            licence="© GeoBasis-DE / BKG (VG5000, Stand 01.01.2021), dl-de/by-2-0",
            publisher="Bundesamt für Kartographie und Geodäsie via Praesklepios/geoGermany",
        ),
    ]
}


def raw_path(source: Source | str) -> Path:
    source = SOURCES[source] if isinstance(source, str) else source
    return RAW_DIR / source.folder / source.filename


def city_kreis_codes() -> set[str]:
    """AGS of the Kreise that contain a GREIX city (single source of truth: the dbt seed)."""
    import csv

    with open(PROJECT_ROOT / "dbt" / "seeds" / "city_kreis_map.csv", encoding="utf-8") as fh:
        return {row["ags"] for row in csv.DictReader(fh)}
