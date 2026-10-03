-- Gold: supply vs demand per Kreis.
--   Supply slack  = Zensus 2022 market-active vacancy rate (flats on the market, multi-dwelling buildings)
--   Demand growth = population growth over the last 5 years (VGRdL)
-- supply_demand_index = z(population growth) - z(vacancy): > 0 means demand outpaces available supply.
with acc as (select * from {{ ref('stg_vgrdl__regional_accounts') }}),
yr as (select max(year) as y from acc where population is not null),
growth as (
    select cur.ags,
           cur.population                                                     as population,
           100.0 * (cur.population / prev.population - 1)                     as population_growth_5y_pct,
           100.0 * (cur.disposable_income_per_resident_eur
                    / prev.disposable_income_per_resident_eur - 1)             as income_growth_5y_pct
    from acc cur
    join yr on cur.year = yr.y
    join acc prev on prev.ags = cur.ags and prev.year = yr.y - 5
),
base as (
    select v.ags, v.market_active_vacancy_pct, g.population, g.population_growth_5y_pct, g.income_growth_5y_pct
    from {{ ref('stg_zensus__vacancy') }} v
    join growth g using (ags)
),
stats as (
    select avg(market_active_vacancy_pct) as mv, stddev_samp(market_active_vacancy_pct) as sv,
           avg(population_growth_5y_pct) as mg, stddev_samp(population_growth_5y_pct) as sg
    from base
),
scored as (
    select b.*,
           (b.population_growth_5y_pct - s.mg) / s.sg - (b.market_active_vacancy_pct - s.mv) / s.sv as idx
    from base b cross join stats s
)
select
    s.ags,
    d.kreis_name,
    d.land_name,
    d.is_urban_district,
    s.market_active_vacancy_pct,
    s.population,
    round(cast(s.population_growth_5y_pct as numeric), 2)   as population_growth_5y_pct,
    round(cast(s.income_growth_5y_pct as numeric), 2)       as income_growth_5y_pct,
    round(cast(s.idx as numeric), 3)                        as supply_demand_index,
    case when s.idx >= 1 then 'tight' when s.idx <= -1 then 'slack' else 'balanced' end as market_balance,
    r.rent_eur_sqm
from scored s
join {{ ref('dim_kreis') }} d using (ags)
left join {{ ref('stg_zensus__rent_by_rooms') }} r on r.ags = s.ags and r.rooms = 'total'
