"""Export a static JSON snapshot of the API for the public site (web/public/data).

The public site is served as static files from a CDN, so it never sleeps and costs nothing. This
script calls the real FastAPI app in-process (same typed response contracts, same SQL) and writes
every response the site needs as a JSON file. A scheduled GitHub Actions job runs
ingest -> dbt -> ml -> this export and commits the result; Vercel redeploys on the push.

    python scripts/export_static.py                    # uses WAREHOUSE_URL or warehouse/immodash.duckdb
    python scripts/export_static.py --out /tmp/data    # write elsewhere
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / "ingestion")]


def slugify(name: str) -> str:
    s = name.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def _write(path: Path, payload) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return len(text)


def export(out: Path, use_llm: bool = True) -> dict:
    from fastapi.testclient import TestClient

    from api import db
    from api.main import app

    db._engine = None
    client = TestClient(app)

    def get(path: str, **params):
        r = client.get(path, params=params)
        r.raise_for_status()
        return r.json()

    sizes: dict[str, int] = {}

    def put(name: str, payload) -> None:
        sizes[name] = _write(out / name, payload)

    cities = get("/cities")
    for c in cities:
        c["slug"] = slugify(c["city"])
    start = date(date.today().year - 6, 1, 1).isoformat()

    put("cities.json", cities)
    put("monthly.json", get("/rents/monthly", start=start))
    put("forecasts.json", get("/forecasts"))
    put("backtest.json", get("/forecasts/backtest"))
    put("anomalies.json", get("/anomalies"))
    put("market-pressure.json", get("/market-pressure"))
    put("mortgage-rates.json", get("/mortgage-rates"))
    put("kreise-affordability.json", get("/kreise/affordability"))
    put("kreise-supply-demand.json", get("/kreise/supply-demand"))
    put("cities-supply-demand.json", get("/cities/supply-demand"))
    put("kreise-asking-rents.json", [r for rooms in ("total", "1", "2", "3", "4", "5", "6", "7+")
                                     for r in get("/kreise/asking-rents", rooms=rooms)])
    put("kreise-rents-by-size.json", get("/kreise/rents-by-size"))
    put("bezirke.json", get("/bezirke/rents"))
    put("sources.json", get("/meta/sources"))
    put("kreise-rent-range.json", get("/kreise/rent-range"))
    put("postcodes.json", get("/postcodes/rents"))
    put("geo-kreise.json", get("/geo/kreise", simplify=0.003))
    put("geo-kreise-lite.json", get("/geo/kreise", simplify=0.012))  # hero map: outline only, ~5x smaller

    for c in cities:
        put(f"grid/{c['ags']}.json", get(f"/kreise/{c['ags']}/grid", resolution_m=100))
        put(f"summaries/{c['slug']}.json", get(f"/cities/{c['city']}/summary", llm=use_llm))

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "latest_month": max(c["latest_month"] for c in cities),
        "files": len(sizes),
        "bytes": sum(sizes.values()),
        "summaries_by_llm": sum(
            json.loads((out / f"summaries/{c['slug']}.json").read_text())["generated_by"].startswith("groq")
            for c in cities),
    }
    put("meta.json", meta)
    return meta


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=ROOT / "web" / "public" / "data")
    ap.add_argument("--no-llm", action="store_true", help="template summaries only (no Groq call)")
    args = ap.parse_args()
    if not os.getenv("WAREHOUSE_URL") and not os.getenv("DATABASE_URL"):
        os.environ["WAREHOUSE_URL"] = f"duckdb:///{ROOT / 'warehouse' / 'immodash.duckdb'}"
    meta = export(args.out, use_llm=not args.no_llm)
    print(f"exported {meta['files']} files, {meta['bytes'] / 1e6:.1f} MB, data to {meta['latest_month']}, "
          f"{meta['summaries_by_llm']} LLM summaries -> {args.out}")


if __name__ == "__main__":
    main()
