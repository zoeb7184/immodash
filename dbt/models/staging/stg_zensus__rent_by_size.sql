-- Silver: rent per m² by floor-area band. The overall value ('TOTAL') is dropped (see rent_by_rooms).
select
    ags,
    trim(kreis_name)                                   as kreis_name,
    size_band_code,
    replace(size_band_label, 'Unter', 'Under')         as size_band_label,
    cast(sqm_from as integer)                          as sqm_from,
    cast(sqm_to as integer)                            as sqm_to,
    rent_eur_sqm
from {{ source('bronze', 'zensus_rent_by_size') }}
where size_band_code <> 'TOTAL' and rent_eur_sqm is not null
