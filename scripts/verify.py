"""End-to-end verification of ImmoDash, with an HTML report.

    python scripts/verify.py                  # fresh DuckDB build in a temp folder
    python scripts/verify.py --postgres URL   # also rebuild everything on Postgres and smoke-test the API there

Checks (each timed, pass/fail):
  1. lint (ruff)                         5. pytest (parsers, API contracts, ML, dashboard logic)
  2. ingest raw files -> bronze          6. live API: every endpoint over HTTP (status, rows, latency)
  3. dbt build: models + data tests      7. dashboard: layout + every callback, light and dark
  4. ML: forecasts, backtest, anomalies  8. static site: API snapshot export, type-check, build, every page
                                         9. (optional) the same build + API check on Postgres

Writes reports/verification_report.html (open it in a browser) and reports/verification.json.
Exit code 0 only if every check passed.
"""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "ingestion")]
ENV = {**os.environ, "PYTHONPATH": f"{ROOT}{os.pathsep}{ROOT / 'ingestion'}", "DBT_PROFILES_DIR": str(ROOT / "dbt")}

ENDPOINTS = [
    "/health", "/meta/sources", "/cities", "/rents/monthly?cities=Bielefeld&cities=Berlin",
    "/market-pressure?cities=Berlin", "/kreise/affordability", "/kreise/rents?rooms=2", "/kreise/asking-rents",
    "/kreise/05711/asking-rents", "/kreise/05711/rents", "/affordability/finder?budget_eur=700&sqm=60&limit=400",
    "/affordability/finder?budget_eur=700&sqm=50&size_band=WFL040B059&limit=400", "/mortgage-rates", "/geo/kreise",
    "/kreise/rents-by-size?size_band=WFL060B079", "/kreise/supply-demand", "/cities/supply-demand",
    "/kreise/neighbourhood-spread", "/kreise/11000/grid", "/kreise/05711/grid?resolution_m=1000", "/bezirke/rents",
    "/forecasts", "/forecasts/backtest", "/anomalies", "/cities/Bielefeld/summary?llm=false",
]


@dataclass
class Check:
    name: str
    ok: bool
    seconds: float
    summary: str
    details: list = field(default_factory=list)


def run(cmd: list[str], env: dict | None = None, cwd: Path = ROOT, timeout: int = 1800) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, env=env or ENV, capture_output=True, text=True, timeout=timeout)


def timed(name: str, fn) -> Check:
    t0 = time.time()
    try:
        ok, summary, details = fn()
    except Exception as exc:  # noqa: BLE001 - a crashing check is a failed check
        ok, summary, details = False, f"{type(exc).__name__}: {exc}", []
    c = Check(name, ok, round(time.time() - t0, 1), summary, details)
    print(f"[{'PASS' if ok else 'FAIL'}] {name:<34} {c.seconds:>6.1f}s  {summary}")
    return c


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@contextlib.contextmanager
def api_server(warehouse_url: str):
    port = free_port()
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--port", str(port), "--log-level", "warning"],
        cwd=ROOT, env={**ENV, "WAREHOUSE_URL": warehouse_url}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    import httpx

    base = f"http://127.0.0.1:{port}"
    for _ in range(60):
        try:
            if httpx.get(base + "/health", timeout=2).status_code == 200:
                break
        except httpx.HTTPError:
            time.sleep(0.5)
    try:
        yield base
    finally:
        proc.terminate()
        proc.wait(10)


# ---------------------------------------------------------------- checks
def check_lint():
    if not shutil.which("ruff"):
        return True, "ruff not installed - skipped", []
    p = run(["ruff", "check", "."])
    return p.returncode == 0, (p.stdout.strip().splitlines() or ["ok"])[-1], []


def check_ingest(url: str):
    from immodash_ingest.pipeline import run as ingest

    counts = ingest(offline=True, warehouse_url=url)
    return all(n > 0 for n in counts.values()), f"{len(counts)} bronze tables, {sum(counts.values()):,} rows", [
        {"table": f"bronze.{k}", "rows": v} for k, v in counts.items()]


def check_dbt(env: dict, target_dir: Path):
    p = run(["dbt", "build", "--target-path", str(target_dir)], env=env, cwd=ROOT / "dbt")
    res = json.loads((target_dir / "run_results.json").read_text())["results"]
    rows = [{"node": r["unique_id"].split(".", 1)[1], "type": r["unique_id"].split(".")[0],
             "status": r["status"], "seconds": round(r["execution_time"], 2)} for r in res]
    n_models = sum(r["type"] in ("model", "seed") for r in rows)
    n_tests = sum(r["type"] == "test" for r in rows)
    bad = [r for r in rows if r["status"] not in ("success", "pass")]
    return p.returncode == 0 and not bad, f"{n_models} models/seeds built, {n_tests} data tests, {len(bad)} failures", rows


def check_ml(env: dict):
    p = run([sys.executable, "-m", "ml"], env=env)
    lines = [ln for ln in p.stdout.splitlines() if ln.startswith("ml.")]
    return p.returncode == 0, "; ".join(" ".join(ln.split()) for ln in lines) or p.stderr[-300:], []


def check_pytest():
    p = run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider"])
    tail = [ln for ln in p.stdout.splitlines() if "passed" in ln or "failed" in ln]
    fails = [ln for ln in p.stdout.splitlines() if ln.startswith("FAILED")]
    return p.returncode == 0, (tail[-1] if tail else p.stdout[-200:]).strip("= "), [{"failure": f} for f in fails]


def check_api(base: str):
    import httpx

    rows, bad = [], 0
    for path in ENDPOINTS:
        t0 = time.time()
        r = httpx.get(base + path, timeout=60)
        ms = round(1000 * (time.time() - t0))
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else None
        n = len(body) if isinstance(body, list) else len(body.get("x", body.get("features", []))) if isinstance(body, dict) else 0
        ok = r.status_code == 200 and (n > 0 or path in ("/health",) or isinstance(body, dict))
        bad += not ok
        rows.append({"endpoint": path, "status": r.status_code, "items": n, "ms": ms, "ok": ok})
    return bad == 0, f"{len(ENDPOINTS) - bad}/{len(ENDPOINTS)} endpoints OK, median {sorted(r['ms'] for r in rows)[len(rows)//2]} ms", rows


def check_dashboard(base: str):
    os.environ["API_URL"] = base
    import importlib

    from dashboard import client

    importlib.reload(client)
    client._http = client.httpx.Client(base_url=base, timeout=60)
    client._cache.clear()
    from dashboard import app as A

    importlib.reload(A)
    slots = {c: i for i, c in enumerate(A.DEFAULT_CITIES)}
    flask = A.app.server.test_client()
    calls = {
        "page / (HTML)": lambda th: flask.get("/").status_code == 200,
        "layout (all tabs)": lambda th: flask.get("/_dash-layout").status_code == 200,
        "KPI tiles": lambda th: A.kpis("Bielefeld"),
        "rent trend": lambda th: A.trend(A.DEFAULT_CITIES, "3Y", slots, th),
        "city ranges": lambda th: A.ranges(slots, "Berlin", th),
        "burden scatter": lambda th: A.burden(slots, "Berlin", th),
        "market pressure": lambda th: A.pressure(A.DEFAULT_CITIES, "12M", slots, th),
        "map: affordability": lambda th: A.kreis_map("afford", "total", th, None),
        "map: supply vs demand": lambda th: A.kreis_map("sd", "total", th, None),
        "map: rent by size band": lambda th: A.kreis_map("rent", "size:WFL040B059", th, {"points": [{"location": "09162"}]}),
        "Kreis detail (rooms)": lambda th: A.kreis_detail(None, th, "total"),
        "Kreis detail (sizes)": lambda th: A.kreis_detail(None, th, "size:WFL060B079"),
        "supply & demand tab": lambda th: A.supply_demand(slots, th),
        "neighbourhoods 100 m": lambda th: A.neighbourhoods("11000", 100, ["hide"], th),
        "neighbourhoods 1 km": lambda th: A.neighbourhoods("05711", 1000, [], th),
        "forecast fan": lambda th: A.outlook("Bielefeld", slots, th),
        "backtest chart": lambda th: A.backtest(th),
        "forecast table": lambda th: A.forecast_table(A.DEFAULT_CITIES),
        "anomaly feed": lambda th: A.anomaly_list(th),
        "AI summary": lambda th: A.market_summary("Bielefeld"),
        "affordability finder": lambda th: A.finder(700, 50, "size:WFL040B059"),
        "affordability ranking": lambda th: A.afford_rank(th),
        "financing": lambda th: A.finance(th),
    }
    rows, bad = [], 0
    for name, fn in calls.items():
        for th in ("light", "dark"):
            t0 = time.time()
            try:
                out = fn(th)
                ok, err = out is not False and out is not None, ""
            except Exception as exc:  # noqa: BLE001
                ok, err = False, f"{type(exc).__name__}: {exc}"
            bad += not ok
            rows.append({"callback": name, "theme": th, "ok": ok, "ms": round(1000 * (time.time() - t0)), "error": err})
    return bad == 0, f"{len(rows) - bad}/{len(rows)} callback runs OK (light + dark)", rows


def check_web(warehouse_url: str):
    """Export the static snapshot from the API, type-check and build the static site, then serve out/."""
    web = ROOT / "web"
    if not shutil.which("npm"):
        return True, "npm not installed - skipped", []
    from export_static import export

    meta = export(web / "public" / "data", use_llm=False)
    env = {**os.environ, "NEXT_TELEMETRY_DISABLED": "1"}
    if not (web / "node_modules").exists():
        p = subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=web, env=env, capture_output=True, text=True)
        if p.returncode:
            return False, "npm ci failed", [{"stderr": p.stderr[-500:]}]
    for cmd in (["npx", "tsc", "--noEmit"], ["npx", "next", "build"]):
        p = subprocess.run(cmd, cwd=web, env=env, capture_output=True, text=True, timeout=900)
        if p.returncode:
            return False, f"{' '.join(cmd)} failed", [{"output": (p.stdout + p.stderr)[-800:]}]

    # Serve out/ like a static host does (clean URLs: /map -> map.html, unknown -> 404.html)
    import functools
    import http.server
    import threading

    out = web / "out"

    class Clean(http.server.SimpleHTTPRequestHandler):
        def send_head(self):
            path = self.path.split("?", 1)[0]
            if path != "/" and Path(self.translate_path(path.rstrip("/") + ".html")).is_file():
                self.path = path.rstrip("/") + ".html"  # static hosts prefer page.html over the page/ data folder
            elif path != "/" and not Path(self.translate_path(path)).exists():
                self.send_response(404)
                self.end_headers()
                return None
            return super().send_head()

        def log_message(self, *a):
            pass

    port = free_port()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Clean, directory=str(out)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    import httpx

    rows = []
    try:
        pages = ["/", "/cities/berlin", "/cities/muenchen", "/cities/bielefeld", "/map", "/supply-demand",
                 "/affordability", "/methodology", "/data/meta.json", "/data/grid/11000.json", "/cities/nowhere"]
        for path in pages:
            t0 = time.time()
            r = httpx.get(f"http://127.0.0.1:{port}{path}", timeout=30)
            expected = 404 if path.endswith("nowhere") else 200
            rows.append({"page": path, "status": r.status_code, "kb": round(len(r.content) / 1024),
                         "ms": round(1000 * (time.time() - t0)), "ok": r.status_code == expected})
    finally:
        srv.shutdown()
    bad = sum(not r["ok"] for r in rows)
    return bad == 0, (f"snapshot {meta['files']} files ({meta['bytes'] / 1e6:.1f} MB), static build OK, "
                      f"{len(rows) - bad}/{len(rows)} URLs served as expected"), rows


def check_postgres(pg_url: str):
    env = {**ENV, "WAREHOUSE_URL": pg_url, "DBT_TARGET": "prod"}
    from sqlalchemy.engine import make_url

    u = make_url(pg_url)
    env.update(PGHOST=u.host or "localhost", PGPORT=str(u.port or 5432), PGUSER=u.username or "",
               PGPASSWORD=u.password or "", PGDATABASE=u.database or "")
    from immodash_ingest.pipeline import run as ingest

    ingest(offline=True, warehouse_url=pg_url)
    with tempfile.TemporaryDirectory() as td:
        ok_dbt, s_dbt, _ = check_dbt(env, Path(td))
    ok_ml, _, _ = check_ml(env)
    with api_server(pg_url) as base:
        ok_api, s_api, _ = check_api(base)
    return ok_dbt and ok_ml and ok_api, f"Postgres: {s_dbt}; ML {'ok' if ok_ml else 'FAILED'}; {s_api}", []


# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--postgres", help="SQLAlchemy URL of an empty Postgres database to verify the production path")
    ap.add_argument("--no-report", action="store_true")
    args = ap.parse_args()

    started = datetime.now(timezone.utc)
    tmp = Path(tempfile.mkdtemp(prefix="immodash-verify-"))
    db = tmp / "verify.duckdb"
    url = f"duckdb:///{db}"
    env = {**ENV, "WAREHOUSE_URL": url, "DUCKDB_PATH": str(db), "DBT_TARGET": "dev"}
    os.environ["WAREHOUSE_URL"] = url

    checks = [
        timed("Lint (ruff)", check_lint),
        timed("Ingest raw files -> bronze", lambda: check_ingest(url)),
        timed("dbt build (silver + gold + tests)", lambda: check_dbt(env, tmp / "dbt_target")),
        timed("ML: forecasts + anomalies", lambda: check_ml(env)),
        timed("pytest suite", check_pytest),
    ]
    with api_server(url) as base:
        checks.append(timed("Live API (HTTP)", lambda: check_api(base)))
        checks.append(timed("Dashboard layout + callbacks", lambda: check_dashboard(base)))
        checks.append(timed("Static site (snapshot + build + pages)", lambda: check_web(url)))
    if args.postgres:
        checks.append(timed("Postgres production path", lambda: check_postgres(args.postgres)))

    ok = all(c.ok for c in checks)
    result = {
        "ok": ok,
        "started_at": started.isoformat(timespec="seconds"),
        "seconds": round((datetime.now(timezone.utc) - started).total_seconds(), 1),
        "python": sys.version.split()[0],
        "checks": [asdict(c) for c in checks],
    }
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "verification.json").write_text(json.dumps(result, indent=2, default=str))
    if not args.no_report:
        from report import build_report

        path = build_report(result, url, ROOT / "reports")
        print(f"\nReport: {path}")
    print(f"\n{'ALL CHECKS PASSED' if ok else 'SOME CHECKS FAILED'} in {result['seconds']} s")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    raise SystemExit(main())
