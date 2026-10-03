"""GREIX (Kiel Institute): asking-rent metrics for 37 cities and rent vs. sales indices."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def parse_rents(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path)
    df = df.rename(
        columns={
            "Year": "year",
            "Quarter": "quarter",
            "Month": "month",
            "City": "city",
            "Index": "rent_index",
            "AVG_PRICE_SQM": "avg_rent_sqm",
            "MED_PRICE_SQM": "median_rent_sqm",
            "P75_PRICE_SQM": "p75_rent_sqm",
            "P25_PRICE_SQM": "p25_rent_sqm",
            "Inflation_adjusted": "inflation_adjusted",
            "TOM_4Q": "time_on_market_days_4q",
            "Closed_one_week_4Q": "share_closed_within_week_4q",
        }
    )
    df["frequency"] = "annual"
    df.loc[df["quarter"].notna(), "frequency"] = "quarterly"
    df.loc[df["month"].notna(), "frequency"] = "monthly"
    df["inflation_adjusted"] = df["inflation_adjusted"].astype(bool)
    for c in ("year", "quarter", "month"):
        df[c] = df[c].astype("Int64")
    return df


def parse_rent_vs_sales(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path).rename(
        columns={
            "Year": "year",
            "Quarter": "quarter",
            "City": "city",
            "Rent_Index": "rent_index",
            "Sales_Index": "sales_index",
            "Inflation_adjusted": "inflation_adjusted",
        }
    )
    df["inflation_adjusted"] = df["inflation_adjusted"].astype(bool)
    df["year"] = df["year"].astype(int)
    df["quarter"] = df["quarter"].astype("Int64")
    return df
