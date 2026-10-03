"""Build a throwaway warehouse once per test session: bronze (ingest) -> silver/gold (dbt)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def warehouse(tmp_path_factory) -> str:
    db = tmp_path_factory.mktemp("wh") / "test.duckdb"
    url = f"duckdb:///{db}"
    from immodash_ingest.pipeline import run

    run(offline=True, warehouse_url=url)
    env = {**os.environ, "DUCKDB_PATH": str(db), "DBT_TARGET": "dev"}
    proc = subprocess.run(["dbt", "build", "--profiles-dir", "."], cwd=ROOT / "dbt", env=env,
                          capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout[-3000:]
    os.environ["WAREHOUSE_URL"] = url
    ml = subprocess.run([sys.executable, "-m", "ml"], cwd=ROOT, env={**os.environ, "WAREHOUSE_URL": url},
                        capture_output=True, text=True)
    assert ml.returncode == 0, ml.stderr[-3000:]
    return url


@pytest.fixture(scope="session")
def api_client(warehouse):
    from fastapi.testclient import TestClient

    from api import db
    from api.main import app

    db._engine = None  # rebind to the test warehouse
    return TestClient(app)
