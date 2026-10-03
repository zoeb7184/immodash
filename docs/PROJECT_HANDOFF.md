# Project Handoff: German Real Estate Market Intelligence Platform
## For new chat window | Created: October 2026

---

## Project Overview

Build a full-stack German real estate market intelligence dashboard from scratch.
Deployed, live URL, data-driven, with an LLM narrative layer.
Target: add to Zoeb Ali Khan's portfolio alongside FootballIQ, Career OS, Electricity Forecaster, Salary Explorer.

---

## Project Name (TBD)
Options: ImmoDash / MietMonitor / your suggestion
(Working folder name: `immodash`)

---

## Goals (all three simultaneously)
1. Show Plotly/Dash depth - rich interactive visualisations, crossfilters, choropleth maps
2. Show analytical storytelling - affordability index, supply/demand ratio, LLM-generated market summaries
3. Fill the BI/dashboard gap on CV - what Power BI/Tableau do, built in Python and deployed live

---

## Data Sources

Primary:
- ImmobilienScout24 / ImmoWelt - scraped listings (Playwright + BeautifulSoup) for rental and sale prices
- Destatis (Genesis API) - population, household income, unemployment by Landkreis
- Wohnungsmarktbericht - housing market reports (PDF extraction)
- OpenStreetMap / Nominatim - geocoding addresses to coordinates

Secondary:
- Bundesbank - mortgage rates over time
- BBSR (Bundesinstitut für Bau-, Stadt- und Raumforschung) - regional housing data

---

## Tech Stack

| Layer | Tool |
|---|---|
| Scraping / ingestion | Python, Playwright, BeautifulSoup, Prefect (scheduled) |
| Data warehouse | PostgreSQL + dbt (bronze/silver/gold medallion) |
| Data quality | dbt tests |
| Backend API | FastAPI |
| Visualisation | Plotly Dash (Phase 1) -> Next.js + Recharts (final version) |
| Maps | Plotly Choropleth + Mapbox or Folium |
| Deployment | Railway (backend + DB) + Vercel (frontend) |
| CI/CD | GitHub Actions |

---

## Architecture Pattern
Same as existing portfolio projects (FootballIQ, Career OS):
- Medallion warehouse: bronze (raw) / silver (cleaned) / gold (analytical)
- dbt for transformations and quality contracts
- FastAPI read layer with typed response contracts
- Prefect for scheduled daily data refresh
- Docker containerization throughout

---

## Feature Roadmap

### Phase 1 - Core Dashboard (weeks 1-2)
- City-level rent price overview: Berlin, Munich, Hamburg, Frankfurt, Cologne, Bielefeld
- Price per sqm by city and property type (1BR, 2BR, 3BR)
- Trend over time (last 12 months)
- Affordability index (rent as % of average local income via Destatis)

### Phase 2 - Analytical Depth (weeks 3-4)
- Interactive choropleth map of Germany by Landkreis
- Supply vs demand ratio per city
- Price heatmap by neighbourhood within a city
- Filters: city, property type, size range, date range

### Phase 3 - Intelligence Layer (weeks 5-6)
- Rent forecasting model (LightGBM or Prophet) - 3/6/12-month price projections
- Affordability finder: input budget, get matching cities/neighbourhoods
- Anomaly detection: flag unusual price spikes by area
- LLM-generated natural language market summary (grounded in live data)

### Phase 4 - Polish and Deploy (weeks 7-8)
- Full deployment on Railway + Vercel
- Automated daily data refresh via Prefect
- Documentation, README, architecture decision records
- Live URL ready for CV

---

## Existing Portfolio Context (for reference, not duplication)

| Project | Domain | Stack |
|---|---|---|
| FootballIQ | Sports analytics | FastAPI, dbt, PostgreSQL, XGBoost, SHAP, Next.js, Vercel |
| Career OS | Job market / AI agents | FastAPI, Prefect, Celery, Groq LLM, Qdrant, Railway, Next.js |
| Electricity Forecaster | Energy market | LightGBM, FastAPI, Streamlit, Docker |
| Salary Explorer | Tech compensation | Pandas, Plotly, Streamlit, Docker |

ImmoDash must be distinct from all four - new domain, visualisation-first, richer frontend.

---

## CV Positioning (how to frame on Zoeb's CV)

Lead bullets should cover:
- Scraped and ingested X listings from Y sources using Playwright and Prefect-orchestrated pipelines
- Built affordability index combining rental data with Destatis income statistics across Z cities
- Deployed interactive choropleth dashboard with crossfiltering and LLM-generated market narratives
- Reduced [some metric] with forecasting model (LightGBM/Prophet)

---

## Owner
Zoeb Ali Khan
M.Sc. Data Science, Universität Bielefeld
GitHub: https://github.com/zoeb7184
Portfolio: https://zoeb7184.github.io

---

## Status (updated 03 Oct 2026)
Phase 1 is built and verified locally:
- Ingestion of 6 open sources into bronze (Zensus 2022, VGRdL, GREIX x2, Bundesbank, BKG geo)
- dbt silver/gold with 57 passing data tests on DuckDB and Postgres
- FastAPI read layer (11 typed endpoints) and a Plotly Dash dashboard (Cities, Map, Affordability, Financing)
- Prefect daily flow, Docker Compose stack, GitHub Actions CI, 19 pytest tests

Change versus the original plan: listing-portal scraping was replaced by the GREIX Mietpreisindex and
Zensus 2022 (see docs/adr/0002). Next: Phase 2 (Bezirk views, supply/demand ratio), then deployment.
