select
    cast(period as date)   as period_date,
    rate_pct,
    series_key
from {{ source('bronze', 'bundesbank_mortgage_rate') }}
