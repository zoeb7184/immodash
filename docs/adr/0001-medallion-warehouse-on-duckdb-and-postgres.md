# 0001 – Medallion warehouse that runs on DuckDB and Postgres

**Status:** accepted · 2026-10

## Context
The project has to build in seconds on a laptop and in CI, and also run on a hosted database
(Railway) for the live dashboard.

## Decision
- Bronze holds raw tables as parsed, plus lineage columns `_source` and `_loaded_at`. Silver holds dbt
  staging views (typed, renamed, de-duplicated). Gold holds dbt marts materialised as tables.
- There is one dbt project with two targets: `dev` (dbt-duckdb, file `warehouse/immodash.duckdb`) and
  `prod` (dbt-postgres). SQL sticks to the dialect overlap: `make_date`, `percentile_cont … within
  group`, window functions, and `cast(... as numeric)` before `round`.
- CI runs `dbt build` against both engines.

## Consequences
- Contributors need no database server, and production uses Postgres.
- Engine-specific features (DuckDB `QUALIFY`, Postgres `DISTINCT ON`) are off-limits in models.
