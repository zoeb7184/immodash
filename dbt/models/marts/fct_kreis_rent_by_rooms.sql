-- Gold: Zensus 2022 rent per m² by Kreis and rooms, benchmarked against the national average.
with r as (
    select * from {{ ref('stg_zensus__rent_by_rooms') }}
),
national as (
    -- unweighted mean across Kreise (Zensus publishes the weighted national value separately)
    select rooms, avg(rent_eur_sqm) as national_mean_rent_eur_sqm
    from r group by rooms
)
select
    r.ags,
    r.kreis_name,
    r.rooms,
    r.rooms_sort,
    r.rent_eur_sqm,
    n.national_mean_rent_eur_sqm,
    round(cast(100 * r.rent_eur_sqm / n.national_mean_rent_eur_sqm as numeric), 1) as rent_index_vs_national,
    rank() over (partition by r.rooms order by r.rent_eur_sqm desc)              as rank_most_expensive,
    r.reference_date
from r
join national n using (rooms)
