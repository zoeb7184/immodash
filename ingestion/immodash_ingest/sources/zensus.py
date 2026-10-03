"""Zensus 2022: average net cold rent (EUR/m²) by number of rooms for all 400 Kreise.

Table 4000W-0011 "Wohnungskennzahlen: Durchschnittliche Nettokaltmiete nach Räume",
exported in the database's flat CSV format with the region variable GEOLK4.
"""

from __future__ import annotations

import io
import logging
import os
import zipfile
from pathlib import Path

import pandas as pd
import requests

log = logging.getLogger(__name__)

API_URL = "https://ergebnisse.zensus2022.de/api/rest/2020/data/tablefile"
TABLE = "4000W-0011"


def fetch_via_api(dest: Path, token: str | None = None, table: str = TABLE) -> Path:
    """Download the Kreis-level flat CSV through the Zensus GENESIS API.

    Requires a free account token (ZENSUS_API_TOKEN). Falls back to the committed export
    when no token is configured.
    """
    token = token or os.getenv("ZENSUS_API_TOKEN")
    if not token:
        raise RuntimeError("ZENSUS_API_TOKEN not set; using committed export instead")
    resp = requests.post(
        API_URL,
        headers={"username": token, "password": "", "Content-Type": "application/x-www-form-urlencoded"},
        data={
            "name": table,
            "area": "all",
            "format": "ffcsv",
            "compress": "false",
            "regionalvariable": "GEOBZ1" if table == "4000W-0004" else "GEOLK4",
            "language": "de",
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = resp.content
    if content[:2] == b"PK":  # zipped response
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            content = zf.read(zf.namelist()[0])
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)
    return dest


_ROOMS = {
    "INSGESAMT": "total",
    "RAUM01": "1",
    "RAUM02": "2",
    "RAUM03": "3",
    "RAUM04": "4",
    "RAUM05": "5",
    "RAUM06": "6",
    "RAUM07UM": "7+",
}


def parse(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";", dtype=str, encoding="utf-8-sig")
    out = pd.DataFrame(
        {
            "reference_date": pd.to_datetime(df["time"]),
            "ags": df["1_variable_attribute_code"].str.zfill(5),
            "kreis_name": df["1_variable_attribute_label"],
            "rooms_code": df["2_variable_attribute_code"].fillna("INSGESAMT"),
            "rooms_label": df["2_variable_attribute_label"],
            "rent_eur_sqm": pd.to_numeric(df["value"].str.replace(",", ".", regex=False), errors="coerce"),
            "quality_flag": df["value_q"],
        }
    )
    out.loc[out["rooms_label"].eq("Insgesamt"), "rooms_code"] = "INSGESAMT"
    out["rooms"] = out["rooms_code"].map(_ROOMS)
    return out


# ---------------------------------------------------------------- Phase 2 tables
def _num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.str.replace(",", ".", regex=False), errors="coerce")


def _read_flat(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, sep=";", dtype=str, encoding="utf-8-sig")


def parse_vacancy(path: Path) -> pd.DataFrame:
    """4000W-0002: market-active vacancy rate of flats in multi-dwelling buildings, % (Kreis)."""
    df = _read_flat(path)
    return pd.DataFrame(
        {
            "reference_date": pd.to_datetime(df["time"]),
            "ags": df["1_variable_attribute_code"].str.zfill(5),
            "kreis_name": df["1_variable_attribute_label"],
            "market_active_vacancy_pct": _num(df["value"]),
            "quality_flag": df["value_q"],
        }
    )


def parse_rent_by_size(path: Path) -> pd.DataFrame:
    """4000W-0009: average net cold rent per m² by floor-area band (20 m² steps), Kreis level."""
    df = _read_flat(path)
    code = df["2_variable_attribute_code"].fillna("TOTAL")
    bounds = code.str.extract(r"WFL(?P<lo>\d{3})B(?P<hi>\d{3}|XXX)")
    out = pd.DataFrame(
        {
            "reference_date": pd.to_datetime(df["time"]),
            "ags": df["1_variable_attribute_code"].str.zfill(5),
            "kreis_name": df["1_variable_attribute_label"],
            "size_band_code": code,
            "size_band_label": df["2_variable_attribute_label"],
            "sqm_from": pd.to_numeric(bounds["lo"], errors="coerce"),
            "sqm_to": pd.to_numeric(bounds["hi"].replace("XXX", None), errors="coerce"),
            "rent_eur_sqm": _num(df["value"]),
            "quality_flag": df["value_q"],
        }
    )
    return out


def parse_bezirke_rent(path: Path) -> pd.DataFrame:
    """4000W-0004 for the Bezirke of Berlin and Hamburg."""
    df = _read_flat(path)
    code = df["1_variable_attribute_code"]
    return pd.DataFrame(
        {
            "reference_date": pd.to_datetime(df["time"]),
            "bezirk_code": code,
            "bezirk_name": df["1_variable_attribute_label"],
            "ags": code.str[:5],
            "rent_eur_sqm": _num(df["value"]),
            "quality_flag": df["value_q"],
        }
    )
