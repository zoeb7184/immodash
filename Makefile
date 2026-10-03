.PHONY: install ingest dbt ml refresh api dashboard test up down demo verify

export DBT_PROFILES_DIR := $(CURDIR)/dbt

install:
	pip install -r requirements-dev.txt

ingest:            ## raw files -> bronze
	PYTHONPATH=ingestion python -m immodash_ingest

dbt:               ## bronze -> silver -> gold, with tests
	cd dbt && dbt build

ml:                ## gold -> forecasts + anomalies (schema ml)
	python -m ml

refresh: ingest dbt ml

demo:              ## build everything offline and start API + dashboard (Ctrl+C to stop)
	./scripts/run_local.sh

verify:            ## full check: lint, build, data tests, unit/API tests, live endpoint smoke test, HTML report
	python scripts/verify.py

api:
	uvicorn api.main:app --reload --port 8000

dashboard:
	python -m dashboard.app

test:
	pytest -q

up:                ## full stack: postgres + pipeline + api + dashboard
	docker compose up --build

down:
	docker compose down
