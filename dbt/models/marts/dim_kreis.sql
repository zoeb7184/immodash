-- Gold: one row per Kreis (400) with geography, type and latest population/income.
with names as (
    select distinct ags, kreis_name from {{ ref('stg_zensus__rent_by_rooms') }}
),
geo as (
    select ags, max(kreis_type) as kreis_type from {{ ref('stg_geo__kreise') }}
    where not is_merged_area group by ags
),
latest_year as (
    select max(year) as year from {{ ref('stg_vgrdl__regional_accounts') }}
    where disposable_income_per_resident_eur is not null
),
acc as (
    select a.ags, a.year, a.population, a.disposable_income_per_resident_eur
    from {{ ref('stg_vgrdl__regional_accounts') }} a
    join latest_year l on a.year = l.year
)
select
    n.ags,
    n.kreis_name,
    split_part(n.kreis_name, ',', 1)                                as kreis_short_name,
    coalesce(g.kreis_type, 'Kreisfreie Stadt')                      as kreis_type,
    coalesce(g.kreis_type, 'Kreisfreie Stadt') in ('Kreisfreie Stadt', 'Stadtkreis')
        or n.ags in ('02000', '11000')                              as is_urban_district,
    left(n.ags, 2)                                                  as land_code,
    b.land_name,
    b.land_short,
    acc.year                                                        as accounts_year,
    acc.population,
    acc.disposable_income_per_resident_eur
from names n
left join geo g on g.ags = n.ags
left join {{ ref('bundeslaender') }} b on b.land_code = left(n.ags, 2)
left join acc on acc.ags = n.ags
