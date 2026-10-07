-- Silver: Zensus grid rents (EPSG:3035 cell centres) at 1 km (nationwide) and 100 m (city Kreise).
-- 100 m cells also carry the postcode (PLZ) whose OpenStreetMap area contains the cell centre.
select grid_id, ags, cast(resolution_m as integer) as resolution_m, cast(x as integer) as x, cast(y as integer) as y,
       rent_eur_sqm, low_reliability, cast(null as varchar) as plz
from {{ source('bronze', 'zensus_grid_rent_1km') }}
where rent_eur_sqm is not null
union all
select grid_id, ags, cast(resolution_m as integer), cast(x as integer), cast(y as integer),
       rent_eur_sqm, low_reliability, cast(plz as varchar)
from {{ source('bronze', 'zensus_grid_rent_100m') }}
where rent_eur_sqm is not null
