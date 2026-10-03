"""Render the verification result as a self-contained HTML page with interactive charts.

The page carries both light and dark versions of every chart and follows the viewer's theme.
Plotly.js is loaded from jsDelivr; the base-map topojson is inlined, so the map needs no other host.
"""

from __future__ import annotations

import html
import json
import os
from pathlib import Path

import pandas as pd
import plotly.io as pio

ROOT = Path(__file__).resolve().parents[1]
PLOTLY_JS = "https://cdn.jsdelivr.net/npm/plotly.js-dist-min@4.1.1/plotly.min.js"
CITIES = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Bielefeld"]


def _api(warehouse_url: str):
    os.environ["WAREHOUSE_URL"] = warehouse_url
    from fastapi.testclient import TestClient

    from api import db
    from api.main import app

    db._engine = None
    c = TestClient(app)
    return lambda path, **params: c.get(path, params=params).json()


def _simplify(geojson: dict, tol: float = 0.004) -> dict:
    import shapely
    from shapely.geometry import mapping, shape

    feats = []
    for f in geojson["features"]:
        g = shapely.set_precision(shape(f["geometry"]).simplify(tol, preserve_topology=True), 0.0001)
        feats.append({**f, "geometry": mapping(g)})
    return {**geojson, "features": feats}


def _figures(get) -> tuple[dict, dict]:
    from dashboard.figures import choropleth, rent_trend_lines
    from dashboard.figures_intel import backtest_bars, forecast_fan, grid_heatmap, supply_demand_scatter
    from dashboard.theme import tokens

    slots = {c: i for i, c in enumerate(CITIES)}
    monthly = pd.DataFrame(get("/rents/monthly", cities=CITIES))
    monthly["period_date"] = pd.to_datetime(monthly["period_date"])
    monthly = monthly[monthly["period_date"] > monthly["period_date"].max() - pd.DateOffset(months=36)]
    aff = pd.DataFrame(get("/kreise/affordability"))
    rents = pd.DataFrame(get("/kreise/asking-rents", rooms="total"))
    sd = pd.DataFrame(get("/kreise/supply-demand"))
    kreise = rents[["ags", "kreis_name", "rent_eur_sqm", "estimated_asking_rent_eur_sqm"]].merge(
        aff[["ags", "land_name", "affordability_index", "rent_burden_pct"]], on="ags").merge(
        sd[["ags", "supply_demand_index"]], on="ags")
    geo = _simplify(get("/geo/kreise"))
    cities = pd.DataFrame(get("/cities"))
    hl_base = {r.ags: r.city_en for r in cities.itertuples() if r.city in slots}
    grid = get("/kreise/11000/grid")
    hist = pd.DataFrame(get("/rents/monthly", cities=["Bielefeld"]))
    fc = pd.DataFrame(get("/forecasts", cities=["Bielefeld"]))
    an = pd.DataFrame(get("/anomalies", cities=["Bielefeld"]))
    bt = pd.DataFrame(get("/forecasts/backtest"))

    figs: dict[str, dict] = {}
    for theme in ("light", "dark"):
        t = tokens(theme)
        city_slot = {r.ags: slots[r.city] for r in cities.itertuples() if r.city in slots}
        built = {
            "trend": rent_trend_lines(monthly, slots, theme),
            "map": choropleth(kreise, {"type": "FeatureCollection", "features": []}, "afford", "05711", theme),
            "sd": supply_demand_scatter(sd, {a: (n, t["series"][city_slot[a]]) for a, n in hl_base.items()}, theme),
            "grid": grid_heatmap(grid, theme, True, "Berlin"),
            "fan": forecast_fan(hist, fc, an, t["series"][5], theme),
            "backtest": backtest_bars(bt, theme),
        }
        for k, f in built.items():
            f.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)")
            if k in ("map",):
                f.update_geos(bgcolor="rgba(0,0,0,0)")
            figs.setdefault(k, {})[theme] = json.loads(pio.to_json(f, validate=False))
    facts = {
        "kreise": len(aff), "cities": len(cities), "latest_month": str(cities["latest_month"].max())[:7],
        "grid_cells_berlin": len(grid["x"]),
        "backtest": bt.to_dict("records"),
    }
    return {"figs": figs, "geo": geo}, facts


def _pill(ok: bool) -> str:
    return f'<span class="pill {"ok" if ok else "bad"}">{"Pass" if ok else "Fail"}</span>'


def _table(rows: list[dict], limit: int | None = None) -> str:
    if not rows:
        return ""
    cols = list(rows[0])
    body = []
    for r in rows[:limit]:
        tds = []
        for c in cols:
            v = r[c]
            if isinstance(v, bool):
                tds.append(f"<td>{_pill(v)}</td>")
            elif isinstance(v, (int, float)):
                tds.append(f'<td class="num">{v:,}</td>' if isinstance(v, int) else f'<td class="num">{v:,.2f}</td>')
            else:
                tds.append(f"<td>{html.escape(str(v))}</td>")
        body.append("<tr>" + "".join(tds) + "</tr>")
    head = "".join(f"<th>{html.escape(c.replace('_', ' '))}</th>" for c in cols)
    more = f'<p class="note">Showing {limit} of {len(rows)} rows.</p>' if limit and len(rows) > limit else ""
    return f'<div class="tablewrap"><table><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>{more}'


def build_fragment(result: dict, warehouse_url: str) -> str:
    get = _api(warehouse_url)
    payload, facts = _figures(get)
    topo = (ROOT / "dashboard" / "assets" / "topojson" / "world_110m.json").read_text()
    checks = result["checks"]
    n_ok = sum(c["ok"] for c in checks)

    rows_html = []
    for i, c in enumerate(checks):
        details = c.get("details") or []
        limit = None if len(details) <= 60 else 60
        if c["name"].startswith("dbt"):
            tests = [d for d in details if d["type"] == "test"]
            models = [d for d in details if d["type"] != "test"]
            det = (f"<h4>Models and seeds ({len(models)})</h4>{_table(models)}"
                   f"<h4>Data tests ({len(tests)})</h4>{_table(tests, 120)}")
        else:
            det = _table(details, limit)
        rows_html.append(f"""
        <details class="check" {'open' if not c['ok'] else ''} id="check-{i}">
          <summary>{_pill(c['ok'])}<span class="cname">{html.escape(c['name'])}</span>
            <span class="csum">{html.escape(c['summary'])}</span><span class="csec">{c['seconds']:.1f} s</span></summary>
          <div class="cbody">{det or '<p class="note">No further detail.</p>'}</div>
        </details>""")

    bt = pd.DataFrame(facts["backtest"])
    lg = bt[bt.model == "lightgbm"].set_index("horizon_months")
    dr = bt[bt.model == "drift_last_12m"].set_index("horizon_months")
    gain = 100 * (1 - lg.loc[12, "mape_pct"] / dr.loc[12, "mape_pct"])

    return f"""<title>ImmoDash Verification</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: one reading column; check list first (the verdict), then the evidence charts, then how to reproduce. */
:root {{
  --bg: #f5f6f8; --surface: #ffffff; --ink: #14171c; --ink-2: #4a5160; --muted: #7d8494; --line: #e2e5ea;
  --accent: #2a78d6; --ok: #0b7a32; --ok-bg: #e3f4e8; --bad: #b42323; --bad-bg: #fbe5e5;
  --sans: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #121417; --surface: #1a1d22; --ink: #f2f4f7; --ink-2: #b9bfca; --muted: #8b92a0; --line: #2c3139;
  --accent: #3987e5; --ok: #5fd389; --ok-bg: #16301f; --bad: #ff8a80; --bad-bg: #3a1a1a; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --bg: #121417; --surface: #1a1d22; --ink: #f2f4f7; --ink-2: #b9bfca; --muted: #8b92a0; --line: #2c3139;
  --accent: #3987e5; --ok: #5fd389; --ok-bg: #16301f; --bad: #ff8a80; --bad-bg: #3a1a1a; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--ink); font: 15px/1.55 var(--sans); }}
.wrap {{ max-width: 1120px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 56px; display: grid; gap: 28px; }}
header {{ display: grid; gap: 10px; }}
.eyebrow {{ font: 500 12px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }}
h1 {{ margin: 0; font-size: clamp(26px, 4vw, 34px); line-height: 1.15; font-weight: 600; text-wrap: balance; }}
h2 {{ margin: 0 0 4px; font-size: 19px; font-weight: 600; }}
h3 {{ margin: 0; font-size: 15px; font-weight: 600; }}
h4 {{ margin: 14px 0 6px; font-size: 13px; color: var(--ink-2); }}
.lede {{ margin: 0; color: var(--ink-2); max-width: 70ch; }}
.verdict {{ display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }}
.big {{ font: 600 15px var(--sans); padding: 6px 14px; border-radius: 999px; }}
.big.ok {{ background: var(--ok-bg); color: var(--ok); }} .big.bad {{ background: var(--bad-bg); color: var(--bad); }}
.meta {{ font: 13px var(--mono); color: var(--muted); }}
.stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }}
.stat {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }}
.stat b {{ display: block; font: 600 22px var(--sans); font-variant-numeric: tabular-nums; }}
.stat span {{ font-size: 12.5px; color: var(--ink-2); }}
.checks {{ display: grid; gap: 8px; }}
details.check {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }}
details.check > summary {{ list-style: none; cursor: pointer; display: grid; grid-template-columns: auto minmax(0, 1.1fr) minmax(0, 2fr) auto;
  gap: 12px; align-items: center; padding: 12px 14px; }}
details.check > summary::-webkit-details-marker {{ display: none; }}
details.check > summary:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 10px; }}
.cname {{ font-weight: 600; }} .csum {{ color: var(--ink-2); font-size: 13.5px; }}
.csec {{ font: 12.5px var(--mono); color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }}
.cbody {{ padding: 0 14px 14px; min-width: 0; }}
.pill {{ font: 600 11.5px var(--mono); padding: 2px 9px; border-radius: 999px; letter-spacing: .03em; white-space: nowrap; }}
.pill.ok {{ background: var(--ok-bg); color: var(--ok); }} .pill.ok::before {{ content: "✓ "; }}
.pill.bad {{ background: var(--bad-bg); color: var(--bad); }} .pill.bad::before {{ content: "✕ "; }}
.tablewrap {{ overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; max-height: 420px; overflow-y: auto; }}
table {{ border-collapse: collapse; width: 100%; font-size: 12.5px; }}
th, td {{ text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }}
th {{ position: sticky; top: 0; background: var(--surface); color: var(--muted); font-weight: 500; text-transform: capitalize; }}
td.num {{ text-align: right; font-family: var(--mono); font-variant-numeric: tabular-nums; }}
.note {{ font-size: 12.5px; color: var(--muted); margin: 6px 0 0; }}
.charts {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }}
.chart {{ background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 14px 6px; min-width: 0; display: grid; gap: 4px; }}
.chart.wide {{ grid-column: 1 / -1; }}
.chart p {{ margin: 0; font-size: 13px; color: var(--ink-2); }}
.plot {{ width: 100%; height: 360px; }} .plot.tall {{ height: 520px; }}
pre {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; overflow-x: auto;
  font: 13px/1.6 var(--mono); color: var(--ink); margin: 0; }}
pre .c {{ color: var(--muted); }}
.howto {{ display: grid; gap: 10px; }}
.howto p {{ margin: 0; color: var(--ink-2); max-width: 75ch; }}
@media (max-width: 760px) {{
  .charts {{ grid-template-columns: 1fr; }}
  details.check > summary {{ grid-template-columns: auto 1fr auto; }}
  .csum {{ grid-column: 1 / -1; }}
}}
</style>

<div class="wrap">
  <header>
    <div class="eyebrow">ImmoDash · end-to-end verification</div>
    <h1>{"Every check passed" if result["ok"] else f"{len(checks) - n_ok} of {len(checks)} checks failed"}</h1>
    <p class="lede">A fresh warehouse was built from the committed raw data, transformed and tested with dbt, scored by the
      forecasting and anomaly models, then exercised through the live API and every dashboard callback in light and dark mode.
      The charts below are drawn by the same code the dashboard uses.</p>
    <div class="verdict">
      <span class="big {"ok" if result["ok"] else "bad"}">{n_ok}/{len(checks)} checks passed</span>
      <span class="meta">run {html.escape(result["started_at"].replace("T", " "))} UTC · {result["seconds"]:.0f} s · Python {result["python"]}</span>
    </div>
  </header>

  <section class="stats" aria-label="Coverage">
    <div class="stat"><b>{facts["kreise"]}</b><span>Kreise with rent, income, vacancy</span></div>
    <div class="stat"><b>{facts["cities"]}</b><span>cities with monthly asking rents to {facts["latest_month"]}</span></div>
    <div class="stat"><b>{facts["grid_cells_berlin"]:,}</b><span>100 m grid cells in Berlin alone</span></div>
    <div class="stat"><b>{lg.loc[12, "mape_pct"]:.2f}%</b><span>12-month forecast error (MAPE), {gain:.0f}% below trend-following</span></div>
    <div class="stat"><b>{lg.loc[12, "coverage_80_pct"]:.0f}%</b><span>of outcomes inside the 80% interval (12 m)</span></div>
  </section>

  <section class="checks" aria-label="Checks">
    <h2>Checks</h2>
    {"".join(rows_html)}
  </section>

  <section aria-label="Evidence">
    <h2>What the pipeline produces</h2>
    <p class="note" style="margin-bottom:12px">Interactive: hover for values. All figures come from the verification warehouse.</p>
    <div class="charts">
      <div class="chart"><h3>Median asking rent, six cities</h3><p>€/m², monthly, last 3 years (GREIX)</p><div class="plot" id="p-trend"></div></div>
      <div class="chart"><h3>Affordability by Kreis</h3><p>Index 100 = median Kreis; red = rent takes more of local income (2022)</p><div class="plot" id="p-map"></div></div>
      <div class="chart"><h3>Supply vs. demand, 400 Kreise</h3><p>Vacancy (Zensus 2022) against 5-year population growth</p><div class="plot" id="p-sd"></div></div>
      <div class="chart"><h3>Berlin at 100 m resolution</h3><p>Zensus 2022 average net cold rent per grid cell</p><div class="plot" id="p-grid"></div></div>
      <div class="chart"><h3>Bielefeld outlook</h3><p>History, 3/6/12-month forecast with calibrated 80% band, detected anomalies</p><div class="plot" id="p-fan"></div></div>
      <div class="chart"><h3>Forecast accuracy</h3><p>Out-of-sample MAPE, 12 rolling origins × 37 cities (lower is better)</p><div class="plot" id="p-backtest"></div></div>
    </div>
  </section>

  <section class="howto" aria-label="Reproduce">
    <h2>Run it yourself</h2>
    <p>From the project folder, with the Python environment activated. The first command opens the full interactive
      dashboard; the second re-runs every check above and rewrites this report.</p>
<pre><span class="c"># full dashboard on http://localhost:8050, API docs on http://localhost:8000/docs</span>
make demo

<span class="c"># every check, writes reports/verification_report.html</span>
make verify

<span class="c"># optional: an LLM-written market summary (numbers are still verified against the data)</span>
export GROQ_API_KEY=...</pre>
  </section>
</div>

<script>window.PlotlyGeoAssets = {{ topojson: {{ world_110m: {topo} }} }};</script>
<script src="{PLOTLY_JS}"></script>
<script>
const FIGS = {json.dumps(payload["figs"], separators=(",", ":"))};
const GEO = {json.dumps(payload["geo"], separators=(",", ":"))};
FIGS.map.light.data.forEach(t => t.geojson = GEO); FIGS.map.dark.data.forEach(t => t.geojson = GEO);
const IDS = {{trend: "p-trend", map: "p-map", sd: "p-sd", grid: "p-grid", fan: "p-fan", backtest: "p-backtest"}};
const cfg = {{displayModeBar: false, responsive: true}};
function theme() {{
  const a = document.documentElement.getAttribute("data-theme");
  if (a === "dark" || a === "light") return a;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}}
function draw() {{
  if (!window.Plotly) return;
  const th = theme();
  for (const [k, id] of Object.entries(IDS)) {{
    const f = FIGS[k][th];
    const layout = Object.assign({{}}, f.layout, {{autosize: true, height: undefined, width: undefined}});
    Plotly.react(id, f.data, layout, cfg);
  }}
}}
draw();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
new MutationObserver(draw).observe(document.documentElement, {{attributes: true, attributeFilter: ["data-theme"]}});
</script>
"""


def build_report(result: dict, warehouse_url: str, out_dir: Path) -> Path:
    frag = build_fragment(result, warehouse_url)
    (out_dir / "verification_report.fragment.html").write_text(frag, encoding="utf-8")
    page = ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body>"
            + frag + "</body></html>")
    path = out_dir / "verification_report.html"
    path.write_text(page, encoding="utf-8")
    return path
