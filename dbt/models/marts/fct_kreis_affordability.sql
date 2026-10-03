-- Gold: rent burden per Kreis for the Zensus reference year (2022), so rent and income
-- refer to the same year. Burden = annual cold rent of a reference flat / disposable income
-- of a reference household. Index 100 = median Kreis; >100 = more affordable.
{% set sqm = var('reference_flat_sqm') %}
{% set hh = var('reference_household_size') %}
with rent as (
    select ags, rent_eur_sqm, reference_date
    from {{ ref('stg_zensus__rent_by_rooms') }}
    where rooms = 'total'
),
acc as (
    select * from {{ ref('stg_vgrdl__regional_accounts') }}
),
base as (
    select
        rent.ags,
        rent.rent_eur_sqm,
        cur.year                                                        as income_year,
        cur.disposable_income_per_resident_eur,
        cur.population,
        prev.disposable_income_per_resident_eur                         as income_5y_earlier,
        rent.rent_eur_sqm * {{ sqm }}                                   as reference_monthly_rent_eur,
        100.0 * rent.rent_eur_sqm * {{ sqm }} * 12
            / (cur.disposable_income_per_resident_eur * {{ hh }})       as rent_burden_pct
    from rent
    join acc cur  on cur.ags = rent.ags  and cur.year = extract(year from rent.reference_date)
    left join acc prev on prev.ags = rent.ags and prev.year = cur.year - 5
),
med as (
    select percentile_cont(0.5) within group (order by rent_burden_pct) as median_burden from base
)
select
    b.ags,
    d.kreis_name,
    d.land_name,
    d.is_urban_district,
    b.rent_eur_sqm,
    b.income_year,
    b.disposable_income_per_resident_eur,
    b.population,
    b.reference_monthly_rent_eur,
    round(cast(b.rent_burden_pct as numeric), 2)                                  as rent_burden_pct,
    round(cast(100 * m.median_burden / b.rent_burden_pct as numeric), 1)         as affordability_index,
    round(cast(100 * (power(b.disposable_income_per_resident_eur / b.income_5y_earlier, 0.2) - 1) as numeric), 2)
                                                                                  as income_cagr_5y_pct,
    rank() over (order by b.rent_burden_pct)                                      as affordability_rank,
    {{ sqm }}                                                                     as assumed_flat_sqm,
    {{ hh }}                                                                      as assumed_household_size
from base b
cross join med m
join {{ ref('dim_kreis') }} d on d.ags = b.ags
