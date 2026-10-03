"""Deutsche Bundesbank: effective interest rate on new housing loans to households (monthly)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def parse(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, header=None, skiprows=1, dtype=str, encoding="utf-8-sig")
    df = df[df[0].str.match(r"^\d{4}-\d{2}$", na=False)]
    out = pd.DataFrame(
        {
            "period": pd.to_datetime(df[0] + "-01"),
            "rate_pct": pd.to_numeric(df[1], errors="coerce"),
            "flag": df[2] if 2 in df.columns else None,
        }
    )
    out["series_key"] = "BBIM1.M.DE.B.A2C.A.R.A.2250.EUR.N"
    return out.dropna(subset=["rate_pct"]).reset_index(drop=True)
