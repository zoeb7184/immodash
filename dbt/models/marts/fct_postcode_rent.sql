-- Gold: rent level of each postcode (PLZ) inside the 37 GREIX-city Kreise, from reliable 100 m Zensus grid cells.
-- rent_index_vs_kreis says how a postcode compares with its whole city (100 = city median); the website scales a
-- city-wide asking-rent estimate by it to estimate rents per postcode. Postcodes with fewer than 10 cells are left out.
with cells as (
    select ags, plz, rent_eur_sqm from {{ ref('stg_zensus__grid_rent') }}
    where resolution_m = 100 and not low_reliability and plz is not null
),
kreis as (
    select ags, percentile_cont(0.5) within group (order by rent_eur_sqm) as kreis_median
    from {{ ref('stg_zensus__grid_rent') }}
    where resolution_m = 100 and not low_reliability
    group by ags
),
agg as (
    select ags, plz,
           count(*)                                                    as cells,
           percentile_cont(0.25) within group (order by rent_eur_sqm) as p25_rent_eur_sqm,
           percentile_cont(0.5)  within group (order by rent_eur_sqm) as p50_rent_eur_sqm,
           percentile_cont(0.75) within group (order by rent_eur_sqm) as p75_rent_eur_sqm
    from cells
    group by ags, plz
    having count(*) >= 10
)
select a.ags, a.plz, a.cells,
       round(cast(a.p25_rent_eur_sqm as numeric), 2) as p25_rent_eur_sqm,
       round(cast(a.p50_rent_eur_sqm as numeric), 2) as p50_rent_eur_sqm,
       round(cast(a.p75_rent_eur_sqm as numeric), 2) as p75_rent_eur_sqm,
       round(cast(100 * a.p50_rent_eur_sqm / k.kreis_median as numeric), 1) as rent_index_vs_kreis
from agg a
join kreis k using (ags)
