"""ImmoDash read API - typed endpoints over the gold layer."""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import db

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ingestion"))
from immodash_ingest.config import SOURCES  # noqa: E402

from . import summary as summary_mod
from .schemas import (
    BacktestRow,
    BezirkRent,
    CityRentPoint,
    CitySnapshot,
    CitySupplyDemand,
    FinderResult,
    GridCells,
    KreisAffordability,
    KreisAskingRent,
    KreisRent,
    KreisRentBySize,
    KreisSupplyDemand,
    MarketPressurePoint,
    MarketSummary,
    MortgageRatePoint,
    NeighbourhoodSpread,
    RentAnomaly,
    RentForecast,
    SourceInfo,
)

app = FastAPI(
    title="ImmoDash API",
    version="0.3.0",
    description="German rental market intelligence: asking rents, Zensus 2022 rents, "
    "income-based affordability and financing costs.",
)
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET"], allow_headers=["*"])

Rooms = Literal["total", "1", "2", "3", "4", "5", "6", "7+"]


@app.get("/health")
def health() -> dict[str, str]:
    db.fetch_all("select 1 as ok")
    return {"status": "ok"}


@app.get("/meta/sources", response_model=list[SourceInfo])
def sources() -> list[SourceInfo]:
    return [SourceInfo(key=s.key, publisher=s.publisher, licence=s.licence, url=s.url) for s in SOURCES.values()]


@app.get("/cities", response_model=list[CitySnapshot])
def cities() -> list[dict]:
    return db.fetch_all("select * from gold.fct_city_snapshot order by median_rent_sqm desc")


@app.get("/rents/monthly", response_model=list[CityRentPoint])
def rents_monthly(
    cities: list[str] = Query(default=[], description="German city names as in /cities; empty = all"),
    start: date | None = Query(default=None, description="First month (inclusive)"),
) -> list[dict]:
    where, params = ["1=1"], {}
    if cities:
        clause, p = db.in_clause("c", cities)
        where.append(f"city in {clause}")
        params.update(p)
    if start:
        where.append("period_date >= :start")
        params["start"] = start
    return db.fetch_all(
        f"select * from gold.fct_city_rent_monthly where {' and '.join(where)} order by city, period_date",
        params,
    )


@app.get("/market-pressure", response_model=list[MarketPressurePoint])
def market_pressure(cities: list[str] = Query(default=[])) -> list[dict]:
    if cities:
        clause, p = db.in_clause("c", cities)
        return db.fetch_all(
            f"select * from gold.fct_city_market_pressure where city in {clause} order by city, period_date", p
        )
    return db.fetch_all("select * from gold.fct_city_market_pressure order by city, period_date")


@app.get("/kreise/affordability", response_model=list[KreisAffordability])
def kreis_affordability() -> list[dict]:
    return db.fetch_all("select * from gold.fct_kreis_affordability order by affordability_rank")


@app.get("/kreise/rents", response_model=list[KreisRent])
def kreis_rents(rooms: Rooms = "total") -> list[dict]:
    return db.fetch_all(
        "select * from gold.fct_kreis_rent_by_rooms where rooms = :rooms order by rank_most_expensive",
        {"rooms": rooms},
    )


@app.get("/kreise/{ags}/rents", response_model=list[KreisRent])
def kreis_rent_detail(ags: str) -> list[dict]:
    rows = db.fetch_all(
        "select * from gold.fct_kreis_rent_by_rooms where ags = :ags order by rooms_sort", {"ags": ags}
    )
    if not rows:
        raise HTTPException(404, f"unknown Kreis {ags}")
    return rows


_ASKING_SQL = """
    select e.ags, e.kreis_name, e.rooms, e.existing_rent_eur_sqm as rent_eur_sqm,
           r.national_mean_rent_eur_sqm, e.estimated_asking_rent_eur_sqm, e.asking_premium, e.estimate_method
    from gold.fct_kreis_asking_rent_estimate e
    join gold.fct_kreis_rent_by_rooms r on r.ags = e.ags and r.rooms = e.rooms
"""


@app.get("/kreise/asking-rents", response_model=list[KreisAskingRent])
def kreis_asking_rents(rooms: Rooms = "total") -> list[dict]:
    """Estimated current asking rent per Kreis (Zensus 2022 x GREIX asking premium)."""
    return db.fetch_all(_ASKING_SQL + " where e.rooms = :rooms order by e.ags", {"rooms": rooms})


@app.get("/kreise/{ags}/asking-rents", response_model=list[KreisAskingRent])
def kreis_asking_rent_detail(ags: str) -> list[dict]:
    rows = db.fetch_all(_ASKING_SQL + " where e.ags = :ags order by e.rooms_sort", {"ags": ags})
    if not rows:
        raise HTTPException(404, f"unknown Kreis {ags}")
    return rows


@app.get("/affordability/finder", response_model=list[FinderResult])
def finder(
    budget_eur: float = Query(..., gt=0, description="Max monthly cold rent"),
    sqm: float = Query(60, gt=10, le=250),
    rooms: Rooms = "total",
    size_band: str | None = Query(None, description="Zensus floor-area band; overrides `rooms` when set"),
    limit: int = Query(25, ge=1, le=400),
) -> list[dict]:
    """Kreise where a flat of `sqm` m² fits the budget at the *estimated current asking rent*
    (Zensus 2022 level uplifted by GREIX asking premia; see fct_kreis_asking_rent_estimate)."""
    if size_band:
        seg_sql = """select ags, kreis_name, rent_eur_sqm as existing_rent_eur_sqm, estimated_asking_rent_eur_sqm,
                            estimate_method from gold.fct_kreis_rent_by_size where size_band_code = :seg"""
        seg = size_band
    else:
        seg_sql = """select ags, kreis_name, existing_rent_eur_sqm, estimated_asking_rent_eur_sqm, estimate_method
                     from gold.fct_kreis_asking_rent_estimate where rooms = :seg"""
        seg = rooms
    return db.fetch_all(
        f"""
        with e as ({seg_sql})
        select e.ags, e.kreis_name, a.land_name,
               e.existing_rent_eur_sqm                                                      as rent_eur_sqm,
               e.estimated_asking_rent_eur_sqm,
               e.estimate_method,
               round(cast(e.estimated_asking_rent_eur_sqm * :sqm as numeric), 0) as estimated_monthly_rent_eur,
               round(cast(:budget - e.estimated_asking_rent_eur_sqm * :sqm as numeric), 0) as headroom_eur,
               a.affordability_index,
               a.population
        from e
        join gold.fct_kreis_affordability a on a.ags = e.ags
        where e.estimated_asking_rent_eur_sqm * :sqm <= :budget
        order by a.population desc
        limit :limit
        """,
        {"budget": budget_eur, "sqm": sqm, "seg": seg, "limit": limit},
    )


@app.get("/mortgage-rates", response_model=list[MortgageRatePoint])
def mortgage_rates(start: date | None = None) -> list[dict]:
    if start:
        return db.fetch_all(
            "select * from gold.fct_mortgage_rates where period_date >= :s order by period_date", {"s": start}
        )
    return db.fetch_all("select * from gold.fct_mortgage_rates order by period_date")


@lru_cache(maxsize=4)
def _kreise_geojson(simplify: float = 0.0) -> dict:
    rows = db.fetch_all("select ags, geo_name, geometry_geojson from silver.stg_geo__kreise")
    feats = []
    for r in rows:
        geom = json.loads(r["geometry_geojson"])
        if simplify > 0:
            import shapely
            from shapely.geometry import mapping, shape

            g = shapely.set_precision(shape(geom).simplify(simplify, preserve_topology=True), 0.0001)
            geom = mapping(g)
        feats.append({"type": "Feature", "id": r["ags"], "properties": {"ags": r["ags"], "name": r["geo_name"]},
                      "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}


@app.get("/geo/kreise")
def kreise_geojson(simplify: float = Query(0.0, ge=0, le=0.05, description="Douglas-Peucker tolerance in degrees")) -> dict:
    """Kreis polygons (BKG VG5000) as a GeoJSON FeatureCollection keyed by AGS. `simplify=0.003`
    cuts the payload ~4x for web maps."""
    return _kreise_geojson(round(simplify, 4))


# ---------------------------------------------------------------- Phase 2: segments, supply/demand, neighbourhoods
SizeBand = Literal["WFL000B039", "WFL040B059", "WFL060B079", "WFL080B099", "WFL100B119", "WFL120B139",
                   "WFL140B159", "WFL160B179", "WFL180B199", "WFL200BXXX"]


@app.get("/kreise/rents-by-size", response_model=list[KreisRentBySize])
def kreis_rents_by_size(
    size_band: SizeBand | None = Query(None, description="Zensus floor-area band code; empty = all bands"),
    ags: str | None = None,
) -> list[dict]:
    where, params = ["1=1"], {}
    if size_band:
        where.append("size_band_code = :b")
        params["b"] = size_band
    if ags:
        where.append("ags = :a")
        params["a"] = ags
    return db.fetch_all(
        f"select * from gold.fct_kreis_rent_by_size where {' and '.join(where)} order by ags, sqm_from", params)


@app.get("/kreise/supply-demand", response_model=list[KreisSupplyDemand])
def kreis_supply_demand() -> list[dict]:
    return db.fetch_all("select * from gold.fct_kreis_supply_demand order by supply_demand_index desc")


@app.get("/cities/supply-demand", response_model=list[CitySupplyDemand])
def city_supply_demand() -> list[dict]:
    return db.fetch_all("select * from gold.fct_city_supply_demand order by supply_demand_index desc")


@app.get("/kreise/neighbourhood-spread", response_model=list[NeighbourhoodSpread])
def neighbourhood_spread() -> list[dict]:
    return db.fetch_all("select * from gold.fct_kreis_neighbourhood_spread order by p90_p10_ratio desc")


@app.get("/kreise/{ags}/grid", response_model=GridCells)
def kreis_grid(ags: str, resolution_m: int = Query(100, description="100 or 1000")) -> dict:
    """Zensus grid rents inside a Kreis (100 m only for Kreise containing a GREIX city)."""
    if resolution_m not in (100, 1000):
        raise HTTPException(422, "resolution_m must be 100 or 1000")
    rows = db.fetch_all(
        "select x, y, rent_eur_sqm, low_reliability from gold.fct_grid_rent_cells "
        "where ags = :a and resolution_m = :r", {"a": ags, "r": resolution_m})
    if not rows:
        raise HTTPException(404, f"no {resolution_m} m grid cells for Kreis {ags}")
    outline = db.fetch_all("select outline_3035_geojson from silver.stg_geo__kreis_outlines where ags = :a", {"a": ags})
    return {
        "ags": ags,
        "resolution_m": resolution_m,
        "x": [r["x"] for r in rows],
        "y": [r["y"] for r in rows],
        "rent_eur_sqm": [float(r["rent_eur_sqm"]) for r in rows],
        "low_reliability": [bool(r["low_reliability"]) for r in rows],
        "outline_3035": json.loads(outline[0]["outline_3035_geojson"]) if outline else None,
    }


@app.get("/bezirke/rents", response_model=list[BezirkRent])
def bezirke_rents() -> list[dict]:
    return db.fetch_all("select * from gold.fct_bezirk_rent order by city, rank_in_city")


# ---------------------------------------------------------------- Phase 3: forecasts, anomalies, summaries
@app.get("/forecasts", response_model=list[RentForecast])
def forecasts(cities: list[str] = Query(default=[])) -> list[dict]:
    if cities:
        clause, p = db.in_clause("c", cities)
        return db.fetch_all(f"select * from ml.rent_forecast where city in {clause} order by city, horizon_months", p)
    return db.fetch_all("select * from ml.rent_forecast order by city, horizon_months")


@app.get("/forecasts/backtest", response_model=list[BacktestRow])
def forecast_backtest() -> list[dict]:
    return db.fetch_all("select * from ml.forecast_backtest order by horizon_months, mape_pct")


@app.get("/anomalies", response_model=list[RentAnomaly])
def anomalies(
    cities: list[str] = Query(default=[]),
    only_flagged: bool = True,
    start: date | None = None,
) -> list[dict]:
    where, params = ["1=1"], {}
    if cities:
        clause, p = db.in_clause("c", cities)
        where.append(f"city in {clause}")
        params.update(p)
    if only_flagged:
        where.append("is_anomaly")
    if start:
        where.append("period_date >= :s")
        params["s"] = start
    return db.fetch_all(
        f"select * from ml.rent_anomalies where {' and '.join(where)} order by period_date desc", params)


@app.get("/cities/{city}/summary", response_model=MarketSummary)
def city_summary(city: str, llm: bool = True) -> dict:
    """Market summary grounded in the warehouse. Uses Groq when GROQ_API_KEY is set and every
    number passes the grounding check; otherwise a deterministic template."""
    result = summary_mod.summarise(city, use_llm=llm)
    if result is None:
        raise HTTPException(404, f"unknown city {city}")
    return result
