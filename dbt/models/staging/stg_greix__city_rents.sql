-- Silver: GREIX asking rents. Keeps all frequencies; period_date is the first day of the period.
select
    city,
    frequency,
    cast(year as integer)                                 as year,
    cast(quarter as integer)                              as quarter,
    cast(month as integer)                                as month,
    case frequency
        when 'monthly'   then make_date(cast(year as integer), cast(month as integer), 1)
        when 'quarterly' then make_date(cast(year as integer), (cast(quarter as integer) - 1) * 3 + 1, 1)
        else make_date(cast(year as integer), 1, 1)
    end                                                   as period_date,
    inflation_adjusted,
    rent_index,
    avg_rent_sqm,
    median_rent_sqm,
    p25_rent_sqm,
    p75_rent_sqm,
    time_on_market_days_4q,
    share_closed_within_week_4q
from {{ source('bronze', 'greix_city_rents') }}
where city <> 'Greix'  -- 'Greix' is the cross-city aggregate, kept out of city-level marts
