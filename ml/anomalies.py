"""Flag unusual month-on-month moves in city asking rents.

Signal: the city's month-on-month change in median asking rent minus the cross-city median change
in the same month (removes market-wide moves such as seasonality). Each month is scored with a
robust z-score against the city's own trailing 24 months (median / MAD), so a single outlier
cannot inflate its own threshold. |z| >= 3.5 is flagged (Iglewicz & Hoaglin's rule of thumb).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

THRESHOLD = 3.5
WINDOW = 24


def detect(monthly: pd.DataFrame, threshold: float = THRESHOLD) -> pd.DataFrame:
    df = monthly[["city", "city_en", "period_date", "median_rent_sqm"]].copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    df = df.sort_values(["city", "period_date"])
    df["mom_pct"] = 100 * df.groupby("city")["median_rent_sqm"].pct_change()
    df["market_mom_pct"] = df.groupby("period_date")["mom_pct"].transform("median")
    df["excess_pct"] = df["mom_pct"] - df["market_mom_pct"]

    def robust_z(s: pd.Series) -> pd.Series:
        hist = s.shift(1).rolling(WINDOW, min_periods=12)
        med = hist.median()
        mad = hist.apply(lambda w: np.median(np.abs(w - np.median(w))), raw=True)
        return (s - med) / (1.4826 * mad.replace(0, np.nan))

    df["robust_z"] = df.groupby("city")["excess_pct"].transform(robust_z)
    df["is_anomaly"] = df["robust_z"].abs() >= threshold
    df["direction"] = np.where(df["excess_pct"] > 0, "spike", "drop")
    df["severity"] = pd.cut(df["robust_z"].abs(), [0, threshold, 5, np.inf], labels=["normal", "notable", "extreme"],
                            right=False).astype(str)
    out = df.dropna(subset=["robust_z"])
    out = out[["city", "city_en", "period_date", "median_rent_sqm", "mom_pct", "market_mom_pct", "excess_pct",
               "robust_z", "is_anomaly", "direction", "severity"]]
    out["period_date"] = out["period_date"].dt.date
    return out.round({"mom_pct": 2, "market_mom_pct": 2, "excess_pct": 2, "robust_z": 2}).reset_index(drop=True)
