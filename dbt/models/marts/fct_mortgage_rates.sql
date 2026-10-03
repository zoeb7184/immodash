-- Gold: housing-loan rates and the monthly payment for a reference loan
-- (German annuity convention: (interest + initial amortisation) x loan / 12).
{% set loan = var('reference_loan_eur') %}
{% set amort = var('reference_amortisation_pct') %}
select
    period_date,
    rate_pct,
    rate_pct - lag(rate_pct, 12) over (order by period_date)                        as change_12m_pp,
    round(cast({{ loan }} * (rate_pct + {{ amort }}) / 100 / 12 as numeric), 0)     as monthly_payment_reference_loan_eur,
    {{ loan }}                                                                      as reference_loan_eur,
    {{ amort }}                                                                     as reference_amortisation_pct
from {{ ref('stg_bundesbank__mortgage_rate') }}
