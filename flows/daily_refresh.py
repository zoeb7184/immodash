"""Prefect flow: refresh raw sources -> bronze -> dbt build (silver/gold + tests) -> ML layer.

Run once:          python flows/daily_refresh.py
Serve on schedule: python flows/daily_refresh.py --serve   (daily 06:15 Europe/Berlin)
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from prefect import flow, get_run_logger, task

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ingestion"))

from immodash_ingest.pipeline import run as ingest_run  # noqa: E402


def _dbt_env() -> dict[str, str]:
    """dbt's prod profile reads PG* variables; derive them from DATABASE_URL when only that is set (Railway)."""
    env = os.environ.copy()
    url = env.get("WAREHOUSE_URL") or env.get("DATABASE_URL") or ""
    if url.startswith(("postgres://", "postgresql")) and not env.get("PGHOST"):
        from sqlalchemy.engine import make_url

        u = make_url(url.replace("postgres://", "postgresql://", 1))
        env.update(PGHOST=u.host or "", PGPORT=str(u.port or 5432), PGUSER=u.username or "",
                   PGPASSWORD=u.password or "", PGDATABASE=u.database or "")
    if url.startswith(("postgres://", "postgresql")):
        env.setdefault("DBT_TARGET", "prod")
    return env


@task(retries=2, retry_delay_seconds=300)
def ingest(offline: bool = False) -> dict[str, int]:
    return ingest_run(offline=offline)


@task
def dbt_build() -> None:
    logger = get_run_logger()
    proc = subprocess.run(
        ["dbt", "build", "--profiles-dir", "."],
        cwd=ROOT / "dbt",
        capture_output=True,
        text=True,
        env=_dbt_env(),
    )
    logger.info(proc.stdout[-4000:])
    if proc.returncode != 0:
        raise RuntimeError(f"dbt build failed:\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}")


@task
def intelligence() -> None:
    """Forecasts (LightGBM quantile + conformal intervals) and anomaly flags -> schema `ml`."""
    proc = subprocess.run([sys.executable, "-m", "ml"], cwd=ROOT, capture_output=True, text=True, env=_dbt_env())
    get_run_logger().info(proc.stdout[-3000:])
    if proc.returncode != 0:
        raise RuntimeError(f"ml step failed:\n{proc.stderr[-2000:]}")


@flow(name="immodash-daily-refresh", log_prints=True)
def daily_refresh(offline: bool = False) -> None:
    counts = ingest(offline=offline)
    print({k: v for k, v in counts.items()})
    dbt_build()
    intelligence()


if __name__ == "__main__":
    if "--serve" in sys.argv:
        daily_refresh.serve(name="daily", cron="15 6 * * *", parameters={"offline": False})
    else:
        daily_refresh(offline="--offline" in sys.argv)
