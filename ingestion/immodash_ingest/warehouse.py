"""Load DataFrames into the bronze schema of DuckDB (local) or Postgres (production)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import create_engine, text

from .config import warehouse_url

log = logging.getLogger(__name__)
BRONZE = "bronze"


def read_sql(sql: str, url: str | None = None) -> pd.DataFrame:
    """Run a read query against the warehouse and return a DataFrame."""
    url = url or warehouse_url()
    if _is_duckdb(url):
        import duckdb

        with duckdb.connect(url.split("duckdb:///", 1)[1], read_only=True) as con:
            return con.execute(sql).df()
    with create_engine(url).connect() as conn:
        return pd.read_sql(text(sql), conn)


def _is_duckdb(url: str) -> bool:
    return url.startswith("duckdb")


def load_bronze(df: pd.DataFrame, table: str, *, source_key: str, url: str | None = None) -> int:
    """Replace `bronze.<table>` with `df` plus lineage columns. Returns row count."""
    df = df.copy()
    df["_source"] = source_key
    df["_loaded_at"] = datetime.now(timezone.utc).replace(tzinfo=None)
    return load_table(df, table, schema=BRONZE, url=url)


def load_table(df: pd.DataFrame, table: str, *, schema: str, url: str | None = None) -> int:
    """Create or replace `<schema>.<table>` from a DataFrame (DuckDB or Postgres)."""
    url = url or warehouse_url()

    if _is_duckdb(url):
        import duckdb

        path = url.split("duckdb:///", 1)[1]
        from pathlib import Path

        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with duckdb.connect(path) as con:
            con.execute(f"create schema if not exists {schema}")
            con.register("df_in", df)
            con.execute(f"create or replace table {schema}.{table} as select * from df_in")
            con.unregister("df_in")
    else:
        engine = create_engine(url)
        with engine.begin() as conn:
            conn.execute(text(f"create schema if not exists {schema}"))
            # dbt's silver views depend on bronze tables; drop with CASCADE so a re-load never fails.
            # The next `dbt build` recreates the views.
            conn.execute(text(f'drop table if exists {schema}."{table}" cascade'))
        chunk = max(1, 60000 // max(1, len(df.columns)))  # stay below the 65535 bind-parameter limit
        df.to_sql(table, engine, schema=schema, if_exists="replace", index=False, chunksize=chunk, method="multi")
    log.info("loaded %d rows into %s.%s", len(df), schema, table)
    return len(df)
