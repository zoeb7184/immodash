"""Contract tests for the read API, run against a freshly built warehouse."""

import pytest


@pytest.mark.parametrize(
    "path,expected_len",
    [
        ("/cities", 37),
        ("/kreise/affordability", 400),
        ("/kreise/rents?rooms=2", 400),
        ("/kreise/asking-rents?rooms=3", 400),
        ("/kreise/05711/asking-rents", 8),
    ],
)
def test_list_endpoints(api_client, path, expected_len):
    r = api_client.get(path)
    assert r.status_code == 200
    assert len(r.json()) == expected_len


def test_health(api_client):
    assert api_client.get("/health").json() == {"status": "ok"}


def test_monthly_rents_filter(api_client):
    rows = api_client.get("/rents/monthly", params={"cities": ["Bielefeld"], "start": "2025-01-01"}).json()
    assert rows and {r["city"] for r in rows} == {"Bielefeld"}
    assert min(r["period_date"] for r in rows) >= "2025-01-01"


def test_finder_respects_budget(api_client):
    rows = api_client.get("/affordability/finder", params={"budget_eur": 600, "sqm": 60, "limit": 400}).json()
    assert rows
    assert all(r["estimated_monthly_rent_eur"] <= 600 for r in rows)
    assert all(r["headroom_eur"] >= 0 for r in rows)


def test_unknown_kreis_is_404(api_client):
    assert api_client.get("/kreise/99999/asking-rents").status_code == 404


def test_rooms_validation(api_client):
    assert api_client.get("/kreise/rents?rooms=12").status_code == 422


def test_geojson_keys_match_kreise(api_client):
    gj = api_client.get("/geo/kreise").json()
    ids = {f["id"] for f in gj["features"]}
    kreise = {r["ags"] for r in api_client.get("/kreise/affordability").json()}
    assert kreise <= ids
