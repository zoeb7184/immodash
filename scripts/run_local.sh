#!/usr/bin/env bash
# One command to see everything working locally (no Docker needed):
#   ./scripts/run_local.sh            -> builds the warehouse from data/raw and starts API + dashboard
#   ./scripts/run_local.sh --refresh  -> also tries to download fresh source files first
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="$PWD:$PWD/ingestion"
export DBT_PROFILES_DIR="$PWD/dbt"
OFFLINE="--offline"; [[ "${1:-}" == "--refresh" ]] && OFFLINE=""

echo "==> 1/4 ingest (bronze)";        python -m immodash_ingest $OFFLINE
echo "==> 2/4 dbt build (silver/gold + data tests)"; (cd dbt && dbt build --quiet)
echo "==> 3/4 forecasts + anomalies";  python -m ml
echo "==> 4/4 starting API on :8000 and dashboard on :8050"
uvicorn api.main:app --port 8000 --log-level warning & API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
sleep 3
echo
echo "    Dashboard:  http://localhost:8050"
echo "    API docs:   http://localhost:8000/docs"
echo "    (Ctrl+C to stop)"
API_URL=http://localhost:8000 python -m dashboard.app
