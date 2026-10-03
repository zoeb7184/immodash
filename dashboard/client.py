"""Thin, cached client for the ImmoDash API."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

API_URL = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
_TTL = int(os.getenv("CLIENT_CACHE_SECONDS", "900"))
_cache: dict[tuple, tuple[float, Any]] = {}
_http = httpx.Client(base_url=API_URL, timeout=30)


def get(path: str, **params: Any) -> Any:
    key = (path, tuple(sorted((k, tuple(v) if isinstance(v, list) else v) for k, v in params.items())))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < _TTL:
        return hit[1]
    resp = _http.get(path, params={k: v for k, v in params.items() if v is not None})
    resp.raise_for_status()
    data = resp.json()
    _cache[key] = (time.time(), data)
    return data
