-- Silver: Zensus grid rents (EPSG:3035 cell centres) at 1 km (nationwide) and 100 m (city Kreise).
select grid_id, ags, cast(resolution_m as integer) as resolution_m, cast(x as integer) as x, cast(y as integer) as y,
       rent_eur_sqm, low_reliability
from {{ source('bronze', 'zensus_grid_rent_1km') }}
where rent_eur_sqm is not null
union all
select grid_id, ags, cast(resolution_m as integer), cast(x as integer), cast(y as integer),
       rent_eur_sqm, low_reliability
from {{ source('bronze', 'zensus_grid_rent_100m') }}
where rent_eur_sqm is not null
