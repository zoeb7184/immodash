-- Germany has 400 Kreise / kreisfreie Städte (since 07/2021). Fails if coverage drifts.
select count(*) as n from {{ ref('dim_kreis') }} having count(*) <> 400
