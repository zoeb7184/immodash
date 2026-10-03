-- Silver: Kreis polygons. VG5000 is from 01.01.2021; Eisenach (16056) merged into the
-- Wartburgkreis (16063) on 01.07.2021, so its polygon is re-keyed to the current AGS.
select
    case when ags = '16056' then '16063' else ags end    as ags,
    name                                                 as geo_name,
    kreis_type,
    ags = '16056'                                        as is_merged_area,
    geometry_geojson
from {{ source('bronze', 'geo_kreise') }}
