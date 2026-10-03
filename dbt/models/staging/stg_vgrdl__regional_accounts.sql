-- Silver: one row per Kreis and year with income and population (wide).
with src as (
    select ags, region_name, cast(year as integer) as year, metric, value
    from {{ source('bronze', 'vgrdl_income_population') }}
    where ags is not null
)
select
    ags,
    max(region_name)                                                           as region_name,
    year,
    max(case when metric = 'disposable_income_per_resident' then value end)   as disposable_income_per_resident_eur,
    max(case when metric = 'disposable_income_total' then value end)          as disposable_income_total_meur,
    max(case when metric = 'population' then value end) * 1000                as population
from src
group by ags, year
