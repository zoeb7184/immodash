select ags, trim(kreis_name) as kreis_name, market_active_vacancy_pct, cast(reference_date as date) as reference_date
from {{ source('bronze', 'zensus_vacancy') }}
