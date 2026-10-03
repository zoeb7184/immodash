# 0002 – Open data instead of scraping listing portals

**Status:** accepted · 2026-10

## Context
The original scope assumed listings scraped from ImmobilienScout24 and Immowelt. Their terms forbid
automated collection, they use bot protection, and a portfolio project should not depend on breaking
either of those.

## Decision
Use open sources that cover the same analytical needs:
- **Time series of asking rents** come from the GREIX Mietpreisindex. It is built by the Kiel Institute
  on VALUE Marktdaten, which aggregates several portals, and covers 37 cities monthly with P25, P50
  and P75 plus time on market.
- **Nationwide coverage by flat size** comes from Zensus 2022 rents by number of rooms for all 400
  Kreise.
- **Today's asking level for the other Kreise** is modelled by uplifting Zensus with the asking
  premia observed in GREIX (`fct_kreis_asking_rent_estimate`). Each estimate carries its method.

## Consequences
- The data is legally clean and reproducible, and everything can be committed and redistributed with
  attribution.
- There is no listing-level data, so neighbourhood heatmaps need another source in Phase 2
  (Zensus 100 m grid or Berlin and Hamburg Bezirke).
