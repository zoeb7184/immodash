# 0005 – Forecasting and anomaly detection

**Status:** accepted · 2026-10

## Decision
- **Target**: the h-month log change of the city's GREIX hedonic rent index (quality-adjusted, so less
  noisy than the raw median). Forecasts are converted to €/m² by scaling the latest median.
- **Model**: one global LightGBM model per horizon (3, 6, 12) and quantile (10/50/90 %) across all 37
  cities. Features known at the origin only: own momentum (1–24 months), 12-month volatility,
  cross-city momentum, housing-loan rate and its 12-month change, latest days-on-market, month.
- **Evaluation**: rolling origin, 12 origins every 3 months, with training restricted to targets that
  were observable at each origin. Baselines are "no change" and "continue the last 12 months".
- **Intervals**: raw quantile bands under-covered (57 % at 12 months), so they are widened with
  sequential split-conformal calibration that uses only conformity scores whose outcomes were known
  before the origin. Out-of-sample coverage is now 77–83 %.
- **Anomalies**: the city's month-on-month change minus the cross-city median change, scored with a
  robust z (median/MAD of the previous 24 months, excluding the current month); |z| ≥ 3.5 is flagged.

## Results (latest run)
| Horizon | LightGBM MAPE | Trend continuation | No change | 80 % coverage |
|---|---|---|---|---|
| 3 m | 1.06 % | 1.32 % | 1.51 % | 81 % |
| 6 m | 1.22 % | 1.58 % | 2.43 % | 77 % |
| 12 m | 1.74 % | 2.33 % | 4.59 % | 82 % |

A pytest test fails the build if the model stops beating either baseline or coverage leaves 65–95 %.
