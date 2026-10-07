-- Gold: how far rents spread inside every Kreis, as a range around its middle.
-- Uses 100 m Zensus grid cells where available (the 37 GREIX-city Kreise), otherwise 1 km cells.
-- p10_index / p90_index: the cheaper and dearer ends (10th / 90th percentile of cells) relative to the median = 100.
with cells as (
    select ags, resolution_m, rent_eur_sqm from {{ ref('stg_zensus__grid_rent') }}
    where not low_reliability
),
best as (
    select ags, min(resolution_m) as resolution_m from cells group by ags
),
stats as (
    select c.ags, c.resolution_m,
           count(*)                                                    as cells,
           percentile_cont(0.1) within group (order by c.rent_eur_sqm) as p10,
           percentile_cont(0.5) within group (order by c.rent_eur_sqm) as p50,
           percentile_cont(0.9) within group (order by c.rent_eur_sqm) as p90
    from cells c
    join best b on b.ags = c.ags and b.resolution_m = c.resolution_m
    group by c.ags, c.resolution_m
)
select ags, resolution_m, cells,
       round(cast(p10 as numeric), 2) as p10_rent_eur_sqm,
       round(cast(p50 as numeric), 2) as p50_rent_eur_sqm,
       round(cast(p90 as numeric), 2) as p90_rent_eur_sqm,
       round(cast(100 * p10 / p50 as numeric), 1) as p10_index,
       round(cast(100 * p90 / p50 as numeric), 1) as p90_index
from stats
where cells >= 5
