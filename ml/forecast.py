"""3/6/12-month asking-rent forecasts per city with LightGBM quantile regression.

Design
------
- Target: log change of the city's nominal hedonic rent index (GREIX) over h months. The hedonic
  index is quality-adjusted, so it is less noisy than the raw median; forecasts are converted back
  to €/m² by scaling the latest median.
- One global model per horizon and quantile (10/50/90 %) across all 37 cities, so cities share
  information about rent dynamics.
- Features known at the forecast origin only: the city's own momentum (1/3/6/12/24-month log
  changes, 12-month volatility), the cross-city market momentum, the housing-loan rate and its
  12-month change, the latest days-on-market signal and the month of year.
- Rolling-origin backtest against two baselines: "no change" and "continue the last 12-month
  trend". Reported as MAPE on the index level, MAE in €/m² and 80 % interval coverage.
- Intervals are calibrated with sequential split-conformal quantile regression (CQR).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import lightgbm as lgb
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

HORIZONS = (3, 6, 12)
QUANTILES = (0.1, 0.5, 0.9)
MODEL_VERSION = "lgbm-quantile-v1"
PARAMS = dict(
    n_estimators=400,
    learning_rate=0.03,
    num_leaves=15,
    min_child_samples=25,
    subsample=0.8,
    subsample_freq=1,
    colsample_bytree=0.8,
    reg_lambda=1.0,
    verbose=-1,
)
FEATURES = [
    "r1", "r3", "r6", "r12", "r24", "vol12",
    "mkt_r3", "mkt_r12", "rate", "rate_chg12", "tom", "month", "city_code",
]


@dataclass
class ForecastResult:
    forecasts: pd.DataFrame
    backtest: pd.DataFrame
    model_card: pd.DataFrame


def build_features(monthly: pd.DataFrame, rates: pd.DataFrame, pressure: pd.DataFrame) -> pd.DataFrame:
    """One row per city and month with origin-time features and future log changes (targets)."""
    df = monthly[["city", "city_en", "period_date", "nominal_rent_index", "median_rent_sqm"]].copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    df = df.sort_values(["city", "period_date"]).reset_index(drop=True)
    df["li"] = np.log(df["nominal_rent_index"])
    g = df.groupby("city")["li"]
    for k in (1, 3, 6, 12, 24):
        df[f"r{k}"] = df["li"] - g.shift(k)
    df["vol12"] = df.groupby("city")["r1"].transform(lambda s: s.rolling(12, min_periods=6).std())
    for h in HORIZONS:
        df[f"y{h}"] = g.shift(-h) - df["li"]

    mkt = df.groupby("period_date")[["r3", "r12"]].median().add_prefix("mkt_")
    df = df.merge(mkt, left_on="period_date", right_index=True, how="left")

    r = rates[["period_date", "rate_pct", "change_12m_pp"]].copy()
    r["period_date"] = pd.to_datetime(r["period_date"])
    r = r.rename(columns={"rate_pct": "rate", "change_12m_pp": "rate_chg12"})
    df = df.merge(r, on="period_date", how="left")

    # Latest published days-on-market value as of each month (quarterly, rolling 4 quarters)
    p = pressure[["city", "period_date", "time_on_market_days_4q"]].copy()
    p["period_date"] = pd.to_datetime(p["period_date"]) + pd.offsets.MonthBegin(3)  # available after quarter end
    p = p.rename(columns={"time_on_market_days_4q": "tom"}).sort_values("period_date")
    df = pd.merge_asof(df.sort_values("period_date"), p, on="period_date", by="city", direction="backward")

    df["month"] = df["period_date"].dt.month
    df["city_code"] = df["city"].astype("category").cat.codes
    return df.sort_values(["city", "period_date"]).reset_index(drop=True)


def _fit(train: pd.DataFrame, target: str, alpha: float) -> lgb.LGBMRegressor:
    model = lgb.LGBMRegressor(objective="quantile", alpha=alpha, **PARAMS)
    model.fit(train[FEATURES], train[target], categorical_feature=["city_code"])
    return model


def _predict_quantiles(train: pd.DataFrame, test: pd.DataFrame, h: int) -> np.ndarray:
    preds = np.column_stack([_fit(train, f"y{h}", q).predict(test[FEATURES]) for q in QUANTILES])
    return np.sort(preds, axis=1)  # guard against quantile crossing


def backtest(df: pd.DataFrame, n_origins: int = 12, step: int = 3) -> tuple[pd.DataFrame, dict[int, float]]:
    """Rolling-origin evaluation. Training rows only use targets observable at the origin.

    Prediction intervals are calibrated with sequential split-conformal quantile regression: the
    raw 10-90 % LightGBM band is widened by the 80th percentile of conformity scores collected at
    *earlier* origins only, so coverage is measured out of sample. Returns the summary table and
    the final per-horizon widening (applied to the live forecast).
    """
    last = df["period_date"].max()
    rows, widen = [], {}
    for h in HORIZONS:
        latest_origin = last - pd.DateOffset(months=h)
        origins = sorted(latest_origin - pd.DateOffset(months=step * i) for i in range(n_origins))
        scores: list[tuple[pd.Timestamp, float]] = []  # (origin, conformity score)
        for origin in origins:
            train = df[(df["period_date"] + pd.DateOffset(months=h) <= origin)].dropna(subset=FEATURES[:6] + [f"y{h}"])
            test = df[df["period_date"] == origin].dropna(subset=FEATURES[:6] + [f"y{h}"])
            if len(train) < 500 or test.empty:
                continue
            q = _predict_quantiles(train, test, h)
            actual = test[f"y{h}"].to_numpy()
            # Only origins whose h-month outcome was already known before this origin may calibrate it
            known = [sc for o, sc in scores if o + pd.DateOffset(months=h) <= origin]
            pad = float(np.quantile(known, 0.8)) if len(known) >= 30 else np.nan
            lo, hi = q[:, 0] - (pad if pad == pad else 0), q[:, 2] + (pad if pad == pad else 0)
            covered = ((actual >= lo) & (actual <= hi)).astype(float) if pad == pad else np.full(len(test), np.nan)
            level = test["nominal_rent_index"].to_numpy()
            scale = (test["median_rent_sqm"] / test["nominal_rent_index"]).to_numpy()  # index -> €/m²
            candidates = {
                "lightgbm": q[:, 1],
                "naive_no_change": np.zeros(len(test)),
                "drift_last_12m": test["r12"].to_numpy() * h / 12,
            }
            for name, pred in candidates.items():
                pred_level, act_level = level * np.exp(pred), level * np.exp(actual)
                rows.append(pd.DataFrame({
                    "horizon_months": h,
                    "model": name,
                    "origin": origin,
                    "city": test["city"].to_numpy(),
                    "ape": np.abs(pred_level / act_level - 1),
                    "abs_err_eur": np.abs(pred_level - act_level) * scale,
                    "covered": covered if name == "lightgbm" else np.nan,
                }))
            scores.extend((origin, sc) for sc in np.maximum(q[:, 0] - actual, actual - q[:, 2]))
        widen[h] = float(np.quantile([sc for _, sc in scores], 0.8)) if scores else 0.0
    res = pd.concat(rows, ignore_index=True)
    summary = (
        res.groupby(["horizon_months", "model"])
        .agg(mape_pct=("ape", lambda s: 100 * s.mean()),
             mae_eur_sqm=("abs_err_eur", "mean"),
             coverage_80_pct=("covered", lambda s: 100 * s.mean() if s.notna().any() else np.nan),
             n_forecasts=("ape", "size"),
             n_origins=("origin", "nunique"))
        .reset_index()
    )
    return summary.round(3), widen


def forecast(df: pd.DataFrame, widen: dict[int, float] | None = None) -> pd.DataFrame:
    """Fit on all observable history and forecast every city from the latest month."""
    origin = df["period_date"].max()
    test = df[df["period_date"] == origin].dropna(subset=FEATURES[:6])
    out = []
    for h in HORIZONS:
        train = df.dropna(subset=FEATURES[:6] + [f"y{h}"])
        q = _predict_quantiles(train, test, h)
        pad = (widen or {}).get(h, 0.0)
        q[:, 0] -= pad
        q[:, 2] += pad
        ratio = np.exp(q)
        out.append(pd.DataFrame({
            "city": test["city"].to_numpy(),
            "city_en": test["city_en"].to_numpy(),
            "origin_month": origin.date(),
            "horizon_months": h,
            "target_month": (origin + pd.DateOffset(months=h)).date(),
            "median_rent_now": test["median_rent_sqm"].to_numpy(),
            "p10_rent_sqm": np.round(test["median_rent_sqm"].to_numpy() * ratio[:, 0], 2),
            "p50_rent_sqm": np.round(test["median_rent_sqm"].to_numpy() * ratio[:, 1], 2),
            "p90_rent_sqm": np.round(test["median_rent_sqm"].to_numpy() * ratio[:, 2], 2),
            "change_p50_pct": np.round(100 * (ratio[:, 1] - 1), 2),
            "model_version": MODEL_VERSION,
        }))
    return pd.concat(out, ignore_index=True)


def run(monthly: pd.DataFrame, rates: pd.DataFrame, pressure: pd.DataFrame) -> ForecastResult:
    df = build_features(monthly, rates, pressure)
    bt, widen = backtest(df)
    fc = forecast(df, widen)
    card = pd.DataFrame([{
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).replace(tzinfo=None),
        "training_rows": int(df.dropna(subset=["y12"]).shape[0]),
        "cities": int(df["city"].nunique()),
        "history_from": df["period_date"].min().date(),
        "history_to": df["period_date"].max().date(),
        "features": ", ".join(FEATURES),
        "params": str(PARAMS),
        "conformal_widening_log": str({h: round(w, 4) for h, w in widen.items()}),
    }])
    log.info("forecast: %d rows, backtest:\n%s", len(fc), bt.to_string())
    return ForecastResult(forecasts=fc, backtest=bt, model_card=card)
