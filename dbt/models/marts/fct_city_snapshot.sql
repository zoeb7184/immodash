-- Gold: one row per city for the latest month - the headline table behind the dashboard.
{% set sqm = var('reference_flat_sqm') %}
{% set hh = var('reference_household_size') %}
with latest as (
    select * from (
        select m.*, row_number() over (partition by city order by period_date desc) as rn
        from {{ ref('fct_city_rent_monthly') }} m
    ) x where rn = 1
),
pressure as (
    select * from (
        select p.*, row_number() over (partition by city order by period_date desc) as rn
        from {{ ref('fct_city_market_pressure') }} p
    ) x where rn = 1
),
zensus as (
    select ags, rent_eur_sqm as existing_contract_rent_sqm_2022
    from {{ ref('stg_zensus__rent_by_rooms') }} where rooms = 'total'
),
price_rent as (
    select * from (
        select s.city, s.period_date, s.sales_index, s.rent_index,
               row_number() over (partition by city order by period_date desc) as rn
        from {{ ref('stg_greix__rent_vs_sales') }} s where not inflation_adjusted
    ) x where rn = 1
)
select
    l.city,
    l.city_en,
    l.ags,
    m.mapping_type,
    d.land_name,
    l.period_date                                                           as latest_month,
    l.median_rent_sqm,
    l.p25_rent_sqm,
    l.p75_rent_sqm,
    l.index_yoy_pct,
    l.index_5y_pct,
    z.existing_contract_rent_sqm_2022,
    round(cast(100 * (l.median_rent_sqm / z.existing_contract_rent_sqm_2022 - 1) as numeric), 1)
                                                                            as asking_premium_vs_existing_pct,
    d.accounts_year                                                         as income_year,
    d.disposable_income_per_resident_eur,
    d.population,
    round(cast(l.median_rent_sqm * {{ sqm }} as numeric), 0)                as reference_monthly_rent_eur,
    round(cast(100.0 * l.median_rent_sqm * {{ sqm }} * 12
        / (d.disposable_income_per_resident_eur * {{ hh }}) as numeric), 2) as asking_rent_burden_pct,
    p.time_on_market_days_4q,
    p.share_closed_within_week_4q,
    p.demand_pressure_score,
    p.period_date                                                           as pressure_quarter,
    round(cast(pr.sales_index / nullif(pr.rent_index, 0) as numeric), 3)    as sales_to_rent_index_ratio,
    pr.period_date                                                          as sales_rent_quarter
from latest l
join {{ ref('city_kreis_map') }} m on m.city = l.city
left join {{ ref('dim_kreis') }} d on d.ags = l.ags
left join zensus z on z.ags = l.ags
left join pressure p on p.city = l.city
left join price_rent pr on pr.city = l.city
