# One image, three roles (pipeline / api / dashboard) selected by the container command.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app:/app/ingestion DBT_PROFILES_DIR=/app/dbt
WORKDIR /app

# libgomp: OpenMP runtime required by LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-orchestration.txt ./
RUN pip install -r requirements-orchestration.txt

COPY . .
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000 8050
# Railway/Render inject $PORT; the per-service start commands live in deploy/railway/*.toml
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
