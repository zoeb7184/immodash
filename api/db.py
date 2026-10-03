"""Read-only access to the gold layer (DuckDB locally, Postgres in production)."""

from __future__ import annotations

import os
import threading
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT = f"duckdb:///{ROOT / 'warehouse' / 'immodash.duckdb'}"
_engine: Engine | None = None
_lock = threading.Lock()


def warehouse_url() -> str:
    return _normalise(os.getenv("WAREHOUSE_URL") or os.getenv("DATABASE_URL") or _DEFAULT)

def _normalise(url: str) -> str:
    """Accept postgres://... / postgresql://... (Railway, Render, Neon) and use the psycopg 3 driver."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url



def engine() -> Engine:
    global _engine
    with _lock:
        if _engine is None:
            url = warehouse_url()
            if url.startswith("duckdb"):
                _engine = create_engine(url, connect_args={"read_only": True})
            else:
                _engine = create_engine(url, pool_pre_ping=True, pool_size=5)
    return _engine


def fetch_all(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with engine().connect() as conn:
        result = conn.execute(text(sql), params or {})
        return [dict(row._mapping) for row in result]


def in_clause(name: str, values: Sequence[str]) -> tuple[str, dict[str, str]]:
    """Build a portable `IN (:p0, :p1, ...)` clause with bound parameters."""
    keys = {f"{name}{i}": v for i, v in enumerate(values)}
    return "(" + ", ".join(f":{k}" for k in keys) + ")", keys
