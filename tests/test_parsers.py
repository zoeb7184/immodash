"""Parsers turn the committed raw files into tidy frames with the expected shape and ranges."""

from immodash_ingest.config import SOURCES, raw_path
from immodash_ingest.sources import bundesbank, geo, greix, vgrdl, zensus


def test_zensus_covers_all_kreise_and_room_sizes():
    df = zensus.parse(raw_path(SOURCES["zensus_rent_by_rooms"]))
    assert df["ags"].nunique() == 400
    assert set(df["rooms"]) == {"total", "1", "2", "3", "4", "5", "6", "7+"}
    assert df["rent_eur_sqm"].between(2, 30).all()
    assert df["ags"].str.len().eq(5).all()


def test_vgrdl_maps_city_states_and_kreise():
    df = vgrdl.parse(raw_path(SOURCES["vgrdl_income"]))
    kreise = df.dropna(subset=["ags"])
    assert kreise["ags"].nunique() == 400  # 398 Kreise + Berlin + Hamburg
    assert {"11000", "02000"} <= set(kreise["ags"])
    inc = kreise[(kreise.metric == "disposable_income_per_resident") & (kreise.year == 2022)]
    assert inc["value"].between(15_000, 60_000).all()


def test_greix_frequencies_and_cities():
    df = greix.parse_rents(raw_path(SOURCES["greix_rents"]))
    assert set(df["frequency"]) == {"monthly", "quarterly", "annual"}
    assert df["city"].nunique() == 38  # 37 cities + 'Greix' aggregate
    monthly = df[df.frequency == "monthly"]
    assert monthly["median_rent_sqm"].between(3, 40).all()


def test_bundesbank_series_is_monthly_and_plausible():
    df = bundesbank.parse(raw_path(SOURCES["bundesbank_mortgage_rate"]))
    assert df["period"].is_monotonic_increasing
    assert df["period"].dt.day.eq(1).all()
    assert df["rate_pct"].between(0.5, 7).all()


def test_geo_has_one_polygon_per_kreis():
    df = geo.parse(raw_path(SOURCES["geo_kreise"]))
    assert len(df) == 401  # VG5000 2021 still contains Eisenach (merged 07/2021)
    assert df["ags"].is_unique


def test_zensus_phase2_tables():
    vac = zensus.parse_vacancy(raw_path("zensus_vacancy"))
    assert vac["ags"].nunique() == 400 and vac["market_active_vacancy_pct"].between(0, 30).all()
    size = zensus.parse_rent_by_size(raw_path("zensus_rent_by_size"))
    bands = size[size.size_band_code != "TOTAL"]
    assert bands["size_band_code"].nunique() == 10
    assert (bands["sqm_to"].isna() == bands["size_band_code"].eq("WFL200BXXX")).all()
    bez = zensus.parse_bezirke_rent(raw_path("zensus_bezirke_rent"))
    assert set(bez["ags"]) == {"11000", "02000"} and len(bez) == 19


def test_grid_cells_are_assigned_to_kreise():
    from immodash_ingest.sources import zensus_grid

    df = zensus_grid.parse_1km(raw_path("zensus_grid_rent"), raw_path("geo_kreise"))
    assert df["ags"].nunique() == 400
    assert len(df) > 130_000
    # Bielefeld's cells lie inside its own bounding box (EPSG:3035)
    bi = df[df.ags == "05711"]
    assert 4_190_000 < bi["x"].median() < 4_230_000 and 3_190_000 < bi["y"].median() < 3_230_000
