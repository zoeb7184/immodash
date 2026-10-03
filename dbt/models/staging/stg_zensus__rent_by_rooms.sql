-- Silver: Zensus 2022 net cold rent by Kreis and number of rooms.
select
    ags,
    trim(kreis_name)                    as kreis_name,
    rooms,
    case rooms when 'total' then 0 when '7+' then 7 else cast(rooms as integer) end as rooms_sort,
    rent_eur_sqm,
    cast(reference_date as date)        as reference_date
from {{ source('bronze', 'zensus_rent_by_rooms') }}
where rent_eur_sqm is not null
