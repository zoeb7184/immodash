"""VGR der Länder: disposable household income per resident and population by Kreis."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

SHEETS = {
    # sheet -> (metric, unit)
    "2.4": ("disposable_income_per_resident", "EUR"),
    "2.1": ("disposable_income_total", "EUR million"),
    "3": ("population", "1000 persons"),
}

# Berlin and Hamburg are both Land and Kreis; VGRdL lists them with their 2-digit Land key.
_CITY_STATES = {"11": "11000", "02": "02000"}


def _parse_sheet(path: Path, sheet: str) -> pd.DataFrame:
    raw = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
    header_row = raw.index[raw[0].eq("Lfd. Nr.")][0]
    header = raw.iloc[header_row].tolist()
    body = raw.iloc[header_row + 1 :].copy()
    body.columns = header
    body = body[body["Regional-schlüssel"].notna()]
    year_cols = [c for c in header if isinstance(c, str) and c.isdigit()]
    long = body.melt(
        id_vars=["Regional-schlüssel", "Gebietseinheit", "EU-Code"],
        value_vars=year_cols,
        var_name="year",
        value_name="value",
    )
    long = long.rename(
        columns={"Regional-schlüssel": "region_key", "Gebietseinheit": "region_name", "EU-Code": "nuts_code"}
    )
    long["value"] = pd.to_numeric(long["value"], errors="coerce")
    long["year"] = long["year"].astype(int)
    return long


def parse(path: Path) -> pd.DataFrame:
    frames = []
    for sheet, (metric, unit) in SHEETS.items():
        df = _parse_sheet(path, sheet)
        df["metric"] = metric
        df["unit"] = unit
        frames.append(df)
    out = pd.concat(frames, ignore_index=True)
    key = out["region_key"].str.strip()
    out["region_key"] = key
    out["region_level"] = key.str.len().map({2: "land", 3: "regierungsbezirk", 5: "kreis"}).fillna("other")
    out.loc[key.eq("17"), "region_level"] = "national"
    city_state = key.isin(_CITY_STATES)
    out["ags"] = None
    out.loc[out["region_level"].eq("kreis"), "ags"] = key
    out.loc[city_state, "ags"] = key[city_state].map(_CITY_STATES)
    return out
