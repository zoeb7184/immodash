-- Gold: city view combining structural supply/demand (Kreis) with live listing dynamics (GREIX).
select
    c.city,
    c.city_en,
    c.ags,
    c.mapping_type,
    k.market_active_vacancy_pct,
    k.population_growth_5y_pct,
    k.supply_demand_index,
    k.market_balance,
    c.time_on_market_days_4q,
    c.share_closed_within_week_4q,
    c.demand_pressure_score,
    c.index_yoy_pct,
    c.median_rent_sqm
from {{ ref('fct_city_snapshot') }} c
left join {{ ref('fct_kreis_supply_demand') }} k using (ags)
