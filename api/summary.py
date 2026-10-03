"""Grounded market summaries.

1. `city_facts` collects every number the summary may use from the gold and ml layers.
2. If GROQ_API_KEY is set, an LLM writes a short narrative from those facts only.
3. A grounding check extracts every number in the LLM text and verifies it against the facts
   (with rounding tolerance). Any unsupported number -> the answer is discarded and the
   deterministic template summary is returned instead. The response says which path was used.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime, timezone
from typing import Any

from . import db

log = logging.getLogger(__name__)
# Groq retires models regularly (llama-3.3-70b-versatile was shut down in August 2026). GROQ_MODEL
# overrides the choice; otherwise the first model in GROQ_MODELS that the account can use is taken.
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_MODELS = [m for m in dict.fromkeys([GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b"]) if m]
_dead_models: set[str] = set()

SYSTEM_PROMPT = (
    "You are a German housing-market analyst. Write a concise market summary (90-130 words, 3 short "
    "paragraphs: current level and momentum; market tightness and affordability; outlook with the "
    "forecast range). Use ONLY the numbers in the JSON facts, rounded as given; never invent figures, "
    "dates or causes. Use euro amounts like '15.18 €/m²'. Say 'asking rents' (they are listing prices). "
    "Mention that the forecast is a model estimate. No headings, no bullet points."
)


def _one(sql: str, params: dict) -> dict[str, Any] | None:
    rows = db.fetch_all(sql, params)
    return rows[0] if rows else None


def city_facts(city: str) -> dict[str, Any] | None:
    snap = _one("select * from gold.fct_city_snapshot where city = :c", {"c": city})
    if not snap:
        return None
    sd = _one("select * from gold.fct_city_supply_demand where city = :c", {"c": city}) or {}
    fc = db.fetch_all("select * from ml.rent_forecast where city = :c order by horizon_months", {"c": city})
    an = db.fetch_all(
        "select period_date, direction, mom_pct from ml.rent_anomalies "
        "where city = :c and is_anomaly order by period_date desc limit 3", {"c": city})
    rank = _one(
        "select count(*) + 1 as r from gold.fct_city_snapshot where median_rent_sqm > :m",
        {"m": snap["median_rent_sqm"]})
    rate = _one("select * from gold.fct_mortgage_rates order by period_date desc limit 1", {})
    f12 = next((f for f in fc if f["horizon_months"] == 12), None)

    def r(v, n=2):
        return None if v is None else round(float(v), n)

    return {
        "city": snap["city_en"],
        "latest_month": str(snap["latest_month"])[:7],
        "median_asking_rent_eur_sqm": r(snap["median_rent_sqm"]),
        "p25_eur_sqm": r(snap["p25_rent_sqm"]),
        "p75_eur_sqm": r(snap["p75_rent_sqm"]),
        "rank_of_37_cities_most_expensive": int(rank["r"]),
        "yoy_change_pct": r(snap["index_yoy_pct"], 1),
        "five_year_change_pct": r(snap["index_5y_pct"], 1),
        "zensus_2022_existing_rent_eur_sqm": r(snap["existing_contract_rent_sqm_2022"]),
        "asking_premium_vs_existing_pct": r(snap["asking_premium_vs_existing_pct"], 0),
        "rent_60sqm_eur_month": r(snap["reference_monthly_rent_eur"], 0),
        "rent_burden_pct_two_residents": r(snap["asking_rent_burden_pct"], 1),
        "days_on_market": r(snap["time_on_market_days_4q"], 0),
        "share_let_within_week_pct": r(100 * snap["share_closed_within_week_4q"], 0)
        if snap["share_closed_within_week_4q"] is not None else None,
        "market_balance": sd.get("market_balance"),
        "vacancy_rate_pct": r(sd.get("market_active_vacancy_pct"), 1),
        "population_growth_5y_pct": r(sd.get("population_growth_5y_pct"), 1),
        "forecast_12m_median_eur_sqm": r(f12["p50_rent_sqm"]) if f12 else None,
        "forecast_12m_low_eur_sqm": r(f12["p10_rent_sqm"]) if f12 else None,
        "forecast_12m_high_eur_sqm": r(f12["p90_rent_sqm"]) if f12 else None,
        "forecast_12m_change_pct": r(f12["change_p50_pct"], 1) if f12 else None,
        "mortgage_rate_pct": r(rate["rate_pct"]) if rate else None,
        "recent_anomalies": [
            {"month": str(a["period_date"])[:7], "direction": a["direction"], "mom_pct": r(a["mom_pct"], 1)}
            for a in an
        ],
    }


def template_summary(f: dict[str, Any]) -> str:
    """Deterministic natural-language summary - always available, fully grounded by construction."""
    trend = "up" if (f["yoy_change_pct"] or 0) >= 0 else "down"
    p1 = (f"Asking rents in {f['city']} stand at a median of {f['median_asking_rent_eur_sqm']:.2f} €/m² "
          f"({f['latest_month']}), {trend} {abs(f['yoy_change_pct']):.1f}% on the year and "
          f"{f['five_year_change_pct']:+.1f}% over five years. That ranks {f['city']} "
          f"#{f['rank_of_37_cities_most_expensive']} of 37 cities; new lets are priced "
          f"{f['asking_premium_vs_existing_pct']:.0f}% above the 2022 average contract rent of "
          f"{f['zensus_2022_existing_rent_eur_sqm']:.2f} €/m².")
    tight = {"tight": "tight", "balanced": "broadly balanced", "slack": "slack"}.get(f["market_balance"] or "", "")
    p2 = (f"A 60 m² flat costs about {f['rent_60sqm_eur_month']:.0f} € a month in cold rent, "
          f"{f['rent_burden_pct_two_residents']:.1f}% of the disposable income of two residents. "
          f"Listings stay online for about {f['days_on_market']:.0f} days"
          + (f" and {f['share_let_within_week_pct']:.0f}% are gone within a week" if f["share_let_within_week_pct"] is not None else "")
          + (f"; with {f['vacancy_rate_pct']:.1f}% market-active vacancy and {f['population_growth_5y_pct']:+.1f}% "
             f"population growth over five years, the market looks {tight}." if tight else "."))
    p3 = ""
    if f["forecast_12m_median_eur_sqm"] is not None:
        p3 = (f"The model estimate for twelve months ahead is {f['forecast_12m_median_eur_sqm']:.2f} €/m² "
              f"({f['forecast_12m_change_pct']:+.1f}%), with an 80% range of {f['forecast_12m_low_eur_sqm']:.2f}"
              f" to {f['forecast_12m_high_eur_sqm']:.2f} €/m²; housing-loan rates are at "
              f"{f['mortgage_rate_pct']:.2f}%.")
    return "\n\n".join(p for p in (p1, p2, p3) if p)


_NUM = re.compile(r"(?<![\w.])[-+]?\d+(?:[.,]\d+)?")


def _numbers_in_facts(facts: Any) -> list[float]:
    out: list[float] = []
    if isinstance(facts, dict):
        for v in facts.values():
            out += _numbers_in_facts(v)
    elif isinstance(facts, list):
        for v in facts:
            out += _numbers_in_facts(v)
    elif isinstance(facts, (int, float)) and not isinstance(facts, bool):
        out.append(float(facts))
    elif isinstance(facts, str):
        out += [float(m.replace(",", ".")) for m in _NUM.findall(facts)]
    return out


# "1,394" / "1 394" (thin or no-break space) -> "1394"; "15,18" (decimal comma) is left alone
_THOUSANDS = re.compile(r"(?<![\d.,])(\d{1,3})((?:[,\u202f\u00a0 ]\d{3})+)(?![\d]|[.,]\d)")
# percentile labels ("25th to 75th percentile", "25-75 percentile range") name a statistic, not a value
_Q = r"(?:25|50|75)(?:st|nd|rd|th)?"
_SEP = r"[\s\-\u2010\u2011\u2013\u2014/]"
_PERCENTILE = re.compile(rf"\b{_Q}(?:{_SEP}*(?:and|to|{_SEP}){_SEP}*{_Q})?(?={_SEP}*(?:percentile|quartile))", re.I)


def _normalise_numbers(text: str) -> str:
    text = _PERCENTILE.sub(" ", text)
    return _THOUSANDS.sub(lambda m: m.group(1) + re.sub(r"\D", "", m.group(2)), text)


def ungrounded_numbers(text: str, facts: dict[str, Any]) -> list[str]:
    """Numbers in `text` that cannot be matched to a fact (tolerating rounding and sign)."""
    allowed = _numbers_in_facts(facts) + [60, 2, 12, 37, 80, 5, 3]  # reference constants named in the prompt
    bad = []
    for tok in _NUM.findall(_normalise_numbers(text)):
        v = abs(float(tok.replace(",", ".")))
        if not any(abs(v - abs(a)) <= (0.051 if abs(a) < 100 else 0.006 * abs(a)) for a in allowed):
            bad.append(tok)
    return bad


def _model_kwargs(model: str) -> dict[str, Any]:
    if model.startswith("openai/gpt-oss"):
        # reasoning models: keep the reasoning short and out of the returned text
        return {"max_completion_tokens": 1500, "extra_body": {"reasoning_effort": "low", "include_reasoning": False}}
    return {"max_tokens": 400}


def llm_summary(facts: dict[str, Any]) -> tuple[str, str] | None:  # pragma: no cover - network dependent
    """Return (text, model) from the first usable Groq model, or None."""
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    try:
        from groq import Groq
    except ImportError:
        log.warning("LLM summary failed: groq package not installed")
        return None
    # generous retries: the SDK backs off on 429 using the retry-after header (free-tier token limits)
    client = Groq(api_key=key, timeout=60, max_retries=8)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "Facts (JSON):\n" + json.dumps(facts, ensure_ascii=False)},
    ]
    for model in GROQ_MODELS:
        if model in _dead_models:
            continue
        try:
            resp = client.chat.completions.create(model=model, temperature=0.2, messages=messages,
                                                  **_model_kwargs(model))
            text = (resp.choices[0].message.content or "").strip()
            return (text, model) if text else None
        except Exception as exc:  # noqa: BLE001
            if "model_not_found" in str(exc) or "decommissioned" in str(exc):
                log.warning("Groq model %s unavailable, trying the next one", model)
                _dead_models.add(model)
                continue
            log.warning("LLM summary failed: %s", exc)
            return None
    log.warning("LLM summary failed: none of %s is available", GROQ_MODELS)
    return None


_cache: dict[tuple[str, date], dict[str, Any]] = {}


def summarise(city: str, use_llm: bool = True) -> dict[str, Any] | None:
    key = (city, date.today())
    if use_llm and key in _cache:
        return _cache[key]
    facts = city_facts(city)
    if facts is None:
        return None
    text, source, rejected = None, "template", []
    if use_llm:
        out = llm_summary(facts)
        if out:
            draft, model = out
            rejected = ungrounded_numbers(draft, facts)
            if rejected:
                log.warning("LLM summary for %s rejected, ungrounded numbers: %s", city, rejected)
            else:
                text, source = draft, f"groq:{model}"
    result = {
        "city": city,
        "text": text or template_summary(facts),
        "generated_by": source,
        "grounding_rejected_numbers": rejected,
        "generated_at": datetime.now(timezone.utc).replace(tzinfo=None),
        "facts": facts,
    }
    if use_llm:
        _cache[key] = result
    return result
