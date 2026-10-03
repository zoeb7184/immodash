-- Every Kreis in dim_kreis must have an overall ('total') Zensus rent.
select d.ags
from {{ ref('dim_kreis') }} d
left join {{ ref('fct_kreis_rent_by_rooms') }} r on r.ags = d.ags and r.rooms = 'total'
where r.ags is null
