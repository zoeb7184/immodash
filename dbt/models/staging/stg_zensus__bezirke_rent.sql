select
    bezirk_code,
    bezirk_name,
    ags,
    case ags when '11000' then 'Berlin' when '02000' then 'Hamburg' end as city,
    rent_eur_sqm
from {{ source('bronze', 'zensus_bezirke_rent') }}
