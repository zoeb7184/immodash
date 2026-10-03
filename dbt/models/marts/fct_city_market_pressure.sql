-- Gold: quarterly demand-pressure signals per city. Time on market and the share of
-- listings taken down within a week are rolling 4-quarter values published by GREIX;
-- short TOM and a high closed-within-a-week share indicate demand outstripping supply.
with q as (
    select * from {{ ref('stg_greix__city_rents') }}
    where frequency = 'quarterly' and not inflation_adjusted
)
select
    q.city,
    m.city_en,
    m.ags,
    q.period_date,
    q.year,
    q.quarter,
    q.median_rent_sqm,
    q.time_on_market_days_4q,
    q.share_closed_within_week_4q,
    -- Pressure score: z-scores of (inverse) TOM and closed-share across all cities in the quarter
    round(cast(
        ( (avg(q.time_on_market_days_4q) over (partition by q.period_date) - q.time_on_market_days_4q)
            / nullif(stddev_samp(q.time_on_market_days_4q) over (partition by q.period_date), 0)
        + (q.share_closed_within_week_4q - avg(q.share_closed_within_week_4q) over (partition by q.period_date))
            / nullif(stddev_samp(q.share_closed_within_week_4q) over (partition by q.period_date), 0)
        ) / 2 as numeric), 3)                                                   as demand_pressure_score
from q
join {{ ref('city_kreis_map') }} m on m.city = q.city
where q.time_on_market_days_4q is not null
