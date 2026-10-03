"""Small, polite HTTP downloader with retries."""

from __future__ import annotations

import logging
import time
from pathlib import Path

import requests

log = logging.getLogger(__name__)
USER_AGENT = "ImmoDash/0.1 (+https://github.com/zoeb7184; open-data research project)"


def download(url: str, dest: Path, *, retries: int = 3, timeout: int = 60) -> Path:
    """Download `url` to `dest` atomically. Raises the last error after `retries` attempts."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout, stream=True) as r:
                r.raise_for_status()
                with open(tmp, "wb") as fh:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        fh.write(chunk)
            tmp.replace(dest)
            log.info("downloaded %s -> %s (%d bytes)", url, dest, dest.stat().st_size)
            return dest
        except requests.RequestException as exc:  # pragma: no cover - network dependent
            last_exc = exc
            log.warning("download attempt %d/%d failed for %s: %s", attempt, retries, url, exc)
            time.sleep(2**attempt)
    assert last_exc is not None
    raise last_exc
