-- Gold: Zensus 2022 rent per m² by Kreis and floor-area band, plus the estimated asking rent today
-- (same Kreis asking premium as fct_kreis_asking_rent_estimate).
with s as (select * from {{ ref('stg_zensus__rent_by_size') }}),
national as (select size_band_code, avg(rent_eur_sqm) as national_mean_rent_eur_sqm from s group by size_band_code),
premium as (
    select ags, max(asking_premium) as asking_premium, max(estimate_method) as estimate_method
    from {{ ref('fct_kreis_asking_rent_estimate') }} where rooms = 'total' group by ags
)
select
    s.ags,
    s.kreis_name,
    s.size_band_code,
    s.size_band_label,
    s.sqm_from,
    s.sqm_to,
    s.rent_eur_sqm,
    n.national_mean_rent_eur_sqm,
    round(cast(s.rent_eur_sqm * (1 + p.asking_premium) as numeric), 2)  as estimated_asking_rent_eur_sqm,
    p.estimate_method
from s
join national n using (size_band_code)
left join premium p using (ags)
