# 0003 – Affordability index definition

**Status:** accepted · 2026-10

## Decision
Rent burden is the annual cold rent of a 60 m² flat divided by the disposable income of two
residents:

    burden = rent_eur_sqm × 60 × 12 / (2 × disposable_income_per_resident)
    affordability_index = median(burden over Kreise) / burden × 100

- For the Kreis level, rent and income both refer to **2022**: Zensus rent (15 May 2022) and VGRdL
  income for 2022.
- For the city level, the latest GREIX asking rent is paired with the latest available income year,
  so the vintages differ. This is labelled in the UI.
- VGRdL income (national accounts concept) includes imputed components and is higher than survey
  household net income. Absolute burdens are therefore lower than Destatis' *Mietbelastungsquote*,
  but the cross-sectional ranking is what the index is for.

## Alternatives considered
- Household net income from the Mikrozensus: not published for every Kreis.
- Purchasing-power data from commercial providers (GfK/NIQ): not open.

## Consequences
The assumptions are dbt vars (`reference_flat_sqm`, `reference_household_size`), so sensitivity
analysis is a single `--vars` flag.
