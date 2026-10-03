-- Gold: how much rents vary *within* each Kreis, from reliable 1 km Zensus grid cells.
with cells as (
    select ags, rent_eur_sqm from {{ ref('stg_zensus__grid_rent') }}
    where resolution_m = 1000 and not low_reliability
)
select
    ags,
    count(*)                                                                         as cells,
    percentile_cont(0.1) within group (order by rent_eur_sqm)                       as p10_rent_eur_sqm,
    percentile_cont(0.5) within group (order by rent_eur_sqm)                       as p50_rent_eur_sqm,
    percentile_cont(0.9) within group (order by rent_eur_sqm)                       as p90_rent_eur_sqm,
    round(cast(percentile_cont(0.9) within group (order by rent_eur_sqm)
             / nullif(percentile_cont(0.1) within group (order by rent_eur_sqm), 0) as numeric), 3)
                                                                                     as p90_p10_ratio
from cells
group by ags
