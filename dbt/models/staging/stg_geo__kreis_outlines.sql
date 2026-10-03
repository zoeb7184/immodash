select ags, outline_3035_geojson from {{ source('bronze', 'geo_kreise_outline_3035') }}
