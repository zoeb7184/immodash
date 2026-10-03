-- Gold: grid cells with their rent relative to the Kreis median at the same resolution
-- (100 m for GREIX-city Kreise, 1 km everywhere). Feeds the neighbourhood heatmaps.
with c as (select * from {{ ref('stg_zensus__grid_rent') }}),
med as (
    select ags, resolution_m, percentile_cont(0.5) within group (order by rent_eur_sqm) as kreis_median
    from c where not low_reliability group by ags, resolution_m
)
select
    c.ags,
    c.resolution_m,
    c.grid_id,
    c.x,
    c.y,
    c.rent_eur_sqm,
    c.low_reliability,
    round(cast(100 * c.rent_eur_sqm / m.kreis_median as numeric), 1) as rent_index_vs_kreis_median
from c
join med m using (ags, resolution_m)
