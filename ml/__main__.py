"""Run the intelligence layer: python -m ml   (after `dbt build`). Writes tables to schema `ml`."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ingestion"))

from immodash_ingest.warehouse import load_table, read_sql  # noqa: E402

from . import anomalies, forecast  # noqa: E402


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    monthly = read_sql("select * from gold.fct_city_rent_monthly")
    rates = read_sql("select * from gold.fct_mortgage_rates")
    pressure = read_sql("select * from gold.fct_city_market_pressure")

    fc = forecast.run(monthly, rates, pressure)
    an = anomalies.detect(monthly)
    counts = {
        "rent_forecast": load_table(fc.forecasts, "rent_forecast", schema="ml"),
        "forecast_backtest": load_table(fc.backtest, "forecast_backtest", schema="ml"),
        "model_card": load_table(fc.model_card, "model_card", schema="ml"),
        "rent_anomalies": load_table(an, "rent_anomalies", schema="ml"),
    }
    for table, n in counts.items():
        print(f"ml.{table:<20} {n:>6} rows")
    print(fc.backtest.to_string(index=False))


if __name__ == "__main__":
    main()
