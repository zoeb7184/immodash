-- Gold: monthly asking rents per city (nominal) with real index and momentum metrics.
with nominal as (
    select * from {{ ref('stg_greix__city_rents') }}
    where frequency = 'monthly' and not inflation_adjusted
),
real_idx as (
    select city, period_date, rent_index as real_rent_index
    from {{ ref('stg_greix__city_rents') }}
    where frequency = 'monthly' and inflation_adjusted
),
joined as (
    select
        n.city,
        m.city_en,
        m.ags,
        n.period_date,
        n.median_rent_sqm,
        n.avg_rent_sqm,
        n.p25_rent_sqm,
        n.p75_rent_sqm,
        n.rent_index                                                        as nominal_rent_index,
        r.real_rent_index,
        lag(n.median_rent_sqm, 1)  over (partition by n.city order by n.period_date) as median_1m_ago,
        lag(n.median_rent_sqm, 12) over (partition by n.city order by n.period_date) as median_12m_ago,
        lag(n.rent_index, 12)      over (partition by n.city order by n.period_date) as index_12m_ago,
        lag(n.rent_index, 60)      over (partition by n.city order by n.period_date) as index_60m_ago
    from nominal n
    left join real_idx r on r.city = n.city and r.period_date = n.period_date
    join {{ ref('city_kreis_map') }} m on m.city = n.city
)
select
    city,
    city_en,
    ags,
    period_date,
    median_rent_sqm,
    avg_rent_sqm,
    p25_rent_sqm,
    p75_rent_sqm,
    p75_rent_sqm - p25_rent_sqm                                                as iqr_rent_sqm,
    nominal_rent_index,
    real_rent_index,
    round(cast(100 * (median_rent_sqm / nullif(median_1m_ago, 0) - 1) as numeric), 2)   as median_mom_pct,
    round(cast(100 * (nominal_rent_index / nullif(index_12m_ago, 0) - 1) as numeric), 2) as index_yoy_pct,
    round(cast(100 * (nominal_rent_index / nullif(index_60m_ago, 0) - 1) as numeric), 2) as index_5y_pct
from joined
