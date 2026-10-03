-- Gold: estimated current asking rent per Kreis and rooms.
-- Zensus 2022 measures rents of *existing* contracts, which sit well below what a new tenant
-- pays today. We uplift them with the asking premium observed in GREIX cities:
--   1. Kreis has a GREIX city (exact or containing)  -> that city's own premium
--   2. otherwise                                      -> median premium of GREIX cities in the same Land
--   3. Land without GREIX coverage                    -> national median premium
-- The method column makes the provenance of every estimate explicit.
with premium_city as (
    select ags, max(asking_premium_vs_existing_pct) / 100.0 as premium
    from {{ ref('fct_city_snapshot') }}
    group by ags
),
premium_land as (
    select left(ags, 2) as land_code,
           percentile_cont(0.5) within group (order by asking_premium_vs_existing_pct) / 100.0 as premium
    from {{ ref('fct_city_snapshot') }}
    group by left(ags, 2)
),
premium_national as (
    select percentile_cont(0.5) within group (order by asking_premium_vs_existing_pct) / 100.0 as premium
    from {{ ref('fct_city_snapshot') }}
),
r as (
    select * from {{ ref('fct_kreis_rent_by_rooms') }}
)
select
    r.ags,
    r.kreis_name,
    r.rooms,
    r.rooms_sort,
    r.rent_eur_sqm                                                        as existing_rent_eur_sqm,
    coalesce(pc.premium, pl.premium, pn.premium)                          as asking_premium,
    round(cast(r.rent_eur_sqm * (1 + coalesce(pc.premium, pl.premium, pn.premium)) as numeric), 2)
                                                                          as estimated_asking_rent_eur_sqm,
    case
        when pc.premium is not null then 'greix_city'
        when pl.premium is not null then 'greix_land_median'
        else 'greix_national_median'
    end                                                                   as estimate_method
from r
cross join premium_national pn
left join premium_city pc on pc.ags = r.ags
left join premium_land pl on pl.land_code = left(r.ags, 2)
