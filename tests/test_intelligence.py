"""Phase 3: forecasts, anomalies and grounded summaries."""

import numpy as np
import pandas as pd

from api.summary import template_summary, ungrounded_numbers
from ml import anomalies


def test_forecast_outputs(api_client):
    fc = api_client.get("/forecasts").json()
    assert len(fc) == 37 * 3
    for r in fc:
        assert r["p10_rent_sqm"] <= r["p50_rent_sqm"] <= r["p90_rent_sqm"]
        assert abs(r["change_p50_pct"]) < 25


def test_model_beats_baselines_out_of_sample(api_client):
    bt = pd.DataFrame(api_client.get("/forecasts/backtest").json())
    for h, g in bt.groupby("horizon_months"):
        g = g.set_index("model")
        assert g.loc["lightgbm", "mape_pct"] < g.loc["naive_no_change", "mape_pct"], h
        assert g.loc["lightgbm", "mape_pct"] < g.loc["drift_last_12m", "mape_pct"], h
        # calibrated 80 % intervals should cover roughly 80 % out of sample
        assert 65 <= g.loc["lightgbm", "coverage_80_pct"] <= 95, h


def test_anomaly_detector_flags_injected_spike():
    months = pd.date_range("2020-01-01", periods=48, freq="MS")
    rng = np.random.default_rng(0)
    rows = []
    for city in ["A", "B", "C", "D"]:
        level = 10 * np.cumprod(1 + rng.normal(0.003, 0.004, len(months)))
        if city == "A":
            level[40:] *= 1.08  # +8 % jump in month 40 only for city A
        rows += [{"city": city, "city_en": city, "period_date": m, "median_rent_sqm": v} for m, v in zip(months, level, strict=True)]
    out = anomalies.detect(pd.DataFrame(rows))
    flagged = out[out.is_anomaly]
    assert ((flagged.city == "A") & (pd.to_datetime(flagged.period_date) == months[40])).any()
    assert len(flagged) <= 3


def test_summary_endpoint_is_grounded(api_client):
    s = api_client.get("/cities/Bielefeld/summary", params={"llm": False}).json()
    assert s["generated_by"] == "template"
    assert "Bielefeld" in s["text"]
    assert ungrounded_numbers(s["text"], s["facts"]) == []


def test_grounding_check_rejects_invented_numbers(api_client):
    facts = api_client.get("/cities/Berlin/summary", params={"llm": False}).json()["facts"]
    text = template_summary(facts) + " Experts expect a 47.3% jump to 88.88 €/m²."
    assert set(ungrounded_numbers(text, facts)) == {"47.3", "88.88"}


def test_phase2_endpoints(api_client):
    assert len(api_client.get("/kreise/supply-demand").json()) == 400
    cities = api_client.get("/cities/supply-demand").json()
    assert len(cities) == 37
    grid = api_client.get("/kreise/11000/grid").json()
    assert grid["resolution_m"] == 100 and len(grid["x"]) > 20_000 and grid["outline_3035"]
    assert api_client.get("/kreise/09187/grid").status_code == 404  # no 100 m grid outside city Kreise
    assert len(api_client.get("/kreise/09187/grid", params={"resolution_m": 1000}).json()["x"]) > 100
    assert len(api_client.get("/bezirke/rents").json()) == 19
    sized = api_client.get("/affordability/finder",
                           params={"budget_eur": 600, "sqm": 50, "size_band": "WFL040B059", "limit": 400}).json()
    assert sized and all(r["estimated_monthly_rent_eur"] <= 600 for r in sized)


def test_structural_and_live_pressure_agree(api_client):
    df = pd.DataFrame(api_client.get("/cities/supply-demand").json()).dropna()
    r = np.corrcoef(df["supply_demand_index"], df["demand_pressure_score"])[0, 1]
    assert r > 0.5
