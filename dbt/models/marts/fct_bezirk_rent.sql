-- Gold: Zensus 2022 rents for the Bezirke of Berlin and Hamburg, vs the city average.
select
    b.city,
    b.bezirk_code,
    b.bezirk_name,
    b.rent_eur_sqm,
    k.rent_eur_sqm                                                         as city_rent_eur_sqm,
    round(cast(100 * (b.rent_eur_sqm / k.rent_eur_sqm - 1) as numeric), 1) as vs_city_pct,
    rank() over (partition by b.city order by b.rent_eur_sqm desc)         as rank_in_city
from {{ ref('stg_zensus__bezirke_rent') }} b
join {{ ref('stg_zensus__rent_by_rooms') }} k on k.ags = b.ags and k.rooms = 'total'
