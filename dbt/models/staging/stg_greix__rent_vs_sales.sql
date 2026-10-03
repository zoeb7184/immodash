select
    city,
    cast(year as integer)                                              as year,
    cast(quarter as integer)                                           as quarter,
    make_date(cast(year as integer), (cast(quarter as integer) - 1) * 3 + 1, 1) as period_date,
    inflation_adjusted,
    rent_index,
    sales_index
from {{ source('bronze', 'greix_rent_vs_sales') }}
where quarter is not null
