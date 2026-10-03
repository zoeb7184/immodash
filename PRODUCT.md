# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
- **Renters and people about to move in Germany** who want to know what a flat will cost, whether they can afford it, and where rents are heading. They arrive with a city, a flat size and a budget in mind, often on a phone.
- **Recruiters and hiring managers** reviewing Zoeb Ali Khan's portfolio. They scan quickly and judge data engineering, analytics, ML and product craft from the live site and its "How it works" page.

## Product Purpose
ImmoDash explains the German rental market in plain language: asking rents in 37 cities, rents against local incomes for all 400 districts, supply and demand, and a 12-month outlook. Success means a renter leaves with a concrete number for their own situation, and a reviewer sees a complete, tested, self-updating data product.

## Positioning
Every figure comes from official and academic open data (Zensus 2022, GREIX, Bundesbank, VGR der Länder, BKG), is rebuilt automatically every week, and is explained where it appears. The AI-written city summaries may only use numbers from a fixed fact list and are rejected otherwise. Forecasts are shown as ranges with their tested accuracy.

## Operating Context
- Static Next.js site on Vercel, built from a JSON snapshot that a weekly GitHub Actions job regenerates (ingest, dbt with 63 data tests, LightGBM forecasts, export).
- The same numbers are served by a FastAPI service and a Plotly Dash analyst dashboard in the repository.
- Readers come from search, a CV link or a portfolio, often without context: the page must explain its own terms.

## Capabilities and Constraints
- Rent check: cost of a flat by city, size and income against the 30% rule of thumb.
- Budget finder: estimated asking rent for all 400 districts by flat type, on a map.
- City profiles with a 100 m census rent grid, borough rents, listing speed, anomalies and forecast.
- Copy contains live values computed at build time; never replace them with static text.
- Asking rents outside the 37 GREIX cities are model estimates, not listings, and must be labelled as such.
- No user accounts, no tracking, no personal data.

## Brand Commitments
- Name: ImmoDash. Built by Zoeb Ali Khan; source at github.com/zoeb7184/immodash, portfolio at zoeb7184.github.io.
- Voice: plain English, concrete numbers, no hype. No em or en dashes in visible copy.
- Data licences must be credited (dl-de/by-2-0 for Statistische Ämter and BKG).

## Evidence on Hand
- The weekly data snapshot in `web/public/data/` (cities, monthly rents, forecasts, back-test, anomalies, districts, grid cells, summaries).
- Forecast back-test results (`backtest.json`) for honest accuracy claims.
- No testimonials, users counts or press exist; never invent them.

## Product Principles
1. Answer the reader's own question first (what will it cost me), then explain the market.
2. Every number is explained where it appears: glossary terms, "How to read this chart", "Show the numbers".
3. Show uncertainty honestly: ranges, tested accuracy, estimates labelled as estimates.
4. Text is generated from the data so it never goes stale.

## Accessibility & Inclusion
WCAG 2.1 AA: text contrast at least 4.5:1 in light and dark themes, keyboard access to every control, a table view for charts, respect for reduced motion, 44 px touch targets on touch screens.
