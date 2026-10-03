"""ImmoDash - Plotly Dash dashboard (Phase 1).

Reads exclusively from the ImmoDash API (API_URL). Run with `python -m dashboard.app`.
"""

from __future__ import annotations

import json
import os

import pandas as pd
import plotly.graph_objects as go
from dash import Dash, Input, Output, State, callback_context, dash_table, dcc, html, no_update

from . import client
from .figures import (
    affordability_ranking,
    choropleth,
    city_range_dots,
    kreis_rooms_bars,
    mortgage_payment_line,
    mortgage_rate_line,
    pressure_lines,
    rent_burden_scatter,
    rent_trend_lines,
)
from .figures_intel import (
    backtest_bars,
    balance_bars,
    bezirke_bars,
    forecast_fan,
    grid_heatmap,
    grid_histogram,
    structure_vs_live,
    supply_demand_scatter,
)
from .theme import MAX_SERIES, tokens

DEFAULT_CITIES = ["Berlin", "München", "Hamburg", "Frankfurt am Main", "Köln", "Bielefeld"]
DEFAULT_KREIS = "05711"  # Bielefeld
PERIODS = {"12M": 12, "3Y": 36, "5Y": 60, "All": None}
SIZE_BANDS = {
    "WFL000B039": "Under 40 m²", "WFL040B059": "40–59 m²", "WFL060B079": "60–79 m²", "WFL080B099": "80–99 m²",
    "WFL100B119": "100–119 m²", "WFL120B139": "120–139 m²", "WFL140B159": "140–159 m²", "WFL160B179": "160–179 m²",
    "WFL180B199": "180–199 m²", "WFL200BXXX": "200 m² and more",
}
ROOM_OPTIONS = (
    [{"label": "All flats", "value": "total"}]
    + [{"label": f"{n} room" + ("" if n == 1 else "s"), "value": str(n)} for n in range(1, 6)]
    + [{"label": f"Size: {lab}", "value": f"size:{code}"} for code, lab in SIZE_BANDS.items()]
)
MAP_METRICS = {"afford": "Affordability", "sd": "Supply vs demand", "rent": "Zensus rent", "asking": "Est. asking rent"}

app = Dash(__name__, title="ImmoDash - German rental market", suppress_callback_exceptions=True)
server = app.server


# ---------------------------------------------------------------- helpers
def cities_df() -> pd.DataFrame:
    return pd.DataFrame(client.get("/cities"))


def fmt_num(v: float | None, digits: int = 2) -> str:
    return "–" if v is None or pd.isna(v) else f"{v:,.{digits}f}"


def seg(id_: str, options: list[dict], value: str) -> dcc.RadioItems:
    return dcc.RadioItems(id=id_, options=options, value=value, className="seg", inline=True)


def card(title: str, sub: str, body, span: int) -> html.Div:
    return html.Div([html.H3(title), html.P(sub, className="sub"), body], className=f"card span-{span}")


def graph(id_: str, height: int) -> dcc.Graph:
    # topojsonURL: serve Plotly's base-map files from /assets so maps work offline and under strict CSPs
    config = {"displayModeBar": False, "responsive": True, "topojsonURL": "/assets/topojson/"}
    return dcc.Graph(id=id_, config=config, style={"height": f"{height}px"})


def clicked_ags(click: dict | None) -> str:
    return click["points"][0]["location"] if click else DEFAULT_KREIS


# ---------------------------------------------------------------- layout
def serve_layout() -> html.Div:
    snap = cities_df()
    city_opts = [
        {"label": r.city_en if r.city_en == r.city else f"{r.city_en} ({r.city})", "value": r.city}
        for r in snap.sort_values("city_en").itertuples()
    ]
    latest = pd.to_datetime(snap["latest_month"]).max()
    return html.Div(
        [
            dcc.Store(id="theme", data="light"),
            dcc.Store(id="slots", data={c: i for i, c in enumerate(DEFAULT_CITIES)}),
            dcc.Store(id="focus", data=DEFAULT_CITIES[0]),
            html.Div(
                [
                    html.Div(
                        [
                            html.H1("ImmoDash"),
                            html.P(
                                "German rental market intelligence · 37 cities, 400 Kreise · "
                                f"asking rents to {latest:%B %Y}"
                            ),
                        ],
                        className="brand",
                    ),
                    html.Button("Dark mode", id="theme-btn", className="theme-btn", n_clicks=0),
                ],
                className="topbar",
            ),
            html.Div(
                [
                    html.Div(
                        [
                            html.Label("Cities (up to 6)", className="lbl"),
                            dcc.Dropdown(id="cities", options=city_opts, value=DEFAULT_CITIES, multi=True,
                                         clearable=False),
                        ],
                        className="filter grow",
                    ),
                    html.Div(
                        [html.Label("Period", className="lbl"),
                         seg("period", [{"label": k, "value": k} for k in PERIODS], "3Y")],
                        className="filter",
                    ),
                    html.Div(
                        [html.Label("Flat type / size (map & finder)", className="lbl"),
                         dcc.Dropdown(id="rooms", options=ROOM_OPTIONS, value="total", clearable=False)],
                        className="filter",
                    ),
                ],
                className="filters",
            ),
            html.Div(id="kpis", className="kpis"),
            html.Div(id="focus-note", className="focus-note"),
            dcc.Tabs(
                id="tabs",
                value="cities",
                className="tab-container",
                parent_className="tabs-root",
                children=[
                    dcc.Tab(label="Cities", value="cities", className="tab", selected_className="tab--selected",
                            children=cities_tab()),
                    dcc.Tab(label="Map", value="map", className="tab", selected_className="tab--selected",
                            children=map_tab()),
                    dcc.Tab(label="Supply & demand", value="sd", className="tab",
                            selected_className="tab--selected", children=supply_demand_tab()),
                    dcc.Tab(label="Neighbourhoods", value="hood", className="tab",
                            selected_className="tab--selected", children=neighbourhood_tab()),
                    dcc.Tab(label="Outlook & AI summary", value="outlook", className="tab",
                            selected_className="tab--selected", children=outlook_tab()),
                    dcc.Tab(label="Affordability", value="afford", className="tab",
                            selected_className="tab--selected", children=afford_tab()),
                    dcc.Tab(label="Financing", value="finance", className="tab",
                            selected_className="tab--selected", children=finance_tab()),
                ],
            ),
            footer(),
        ],
        className="shell",
    )


def cities_tab() -> html.Div:
    return html.Div(
        [
            card("Median asking rent", "€ per m², monthly, nominal · GREIX Mietpreisindex (Kiel Institute)",
                 graph("trend", 380), 7),
            card("Market pressure", "Days on market (rolling 4 quarters) · lower = tighter market",
                 graph("pressure", 380), 5),
            card("Where every city sits today", "Median and P25–P75 band, latest month · click a city to focus",
                 graph("ranges", 640), 4),
            card("Rent burden vs. momentum",
                 "Asking rent for 60 m² as % of the disposable income of 2 residents, vs. YoY change · "
                 "bubble size = population · click a bubble to focus",
                 graph("burden", 640), 8),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def map_tab() -> html.Div:
    return html.Div(
        [
            html.Div(
                [
                    html.H3("Germany by Kreis"),
                    html.Div(seg("map-metric", [{"label": v, "value": k} for k, v in MAP_METRICS.items()],
                                 "afford"), style={"margin": "6px 0"}),
                    html.P(id="map-sub", className="sub"),
                    graph("map", 620),
                ],
                className="card span-7",
            ),
            html.Div(
                [html.Div(id="kreis-panel", className="kreis-panel"), graph("kreis-rooms", 300)],
                className="card span-5",
            ),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


TABLE_CELL = {"padding": "6px 8px", "fontSize": "13px", "textAlign": "left", "backgroundColor": "var(--surface)",
              "color": "var(--text)", "border": "none", "borderBottom": "1px solid var(--border)",
              "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"}


def afford_tab() -> html.Div:
    cell = {"padding": "6px 8px", "fontSize": "13px", "textAlign": "left", "backgroundColor": "var(--surface)",
            "color": "var(--text)", "border": "none", "borderBottom": "1px solid var(--border)",
            "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"}
    return html.Div(
        [
            html.Div(
                [
                    html.H3("Affordability finder"),
                    html.P("Where does my budget work? Estimated asking rent today for the chosen size.",
                           className="sub"),
                    html.Div(
                        [
                            html.Div([html.Label("Max cold rent (€ / month)", className="lbl"),
                                      dcc.Input(id="budget", type="number", value=700, min=100, step=50)],
                                     className="filter"),
                            html.Div([html.Label("Size (m²)", className="lbl"),
                                      dcc.Input(id="sqm", type="number", value=60, min=15, max=200, step=5)],
                                     className="filter"),
                        ],
                        style={"display": "flex", "gap": "16px", "margin": "8px 0 12px"},
                    ),
                    html.Div(id="finder-count", className="hint", style={"marginBottom": "8px"}),
                    dash_table.DataTable(
                        id="finder-table",
                        columns=[
                            {"name": "Kreis", "id": "kreis_name"},
                            {"name": "Land", "id": "land_name"},
                            {"name": "Est. rent € / month", "id": "estimated_monthly_rent_eur", "type": "numeric"},
                            {"name": "Headroom €", "id": "headroom_eur", "type": "numeric"},
                            {"name": "Index", "id": "affordability_index", "type": "numeric"},
                        ],
                        page_size=12,
                        sort_action="native",
                        style_as_list_view=True,
                        style_table={"overflowX": "auto"},
                        style_cell=cell,
                        style_header={**cell, "fontWeight": 600, "color": "var(--text-2)"},
                        style_cell_conditional=[{"if": {"column_type": "numeric"}, "textAlign": "right"}],
                    ),
                ],
                className="card span-6",
            ),
            card("Most and least affordable Kreise",
                 "Rent burden 2022: Zensus rent for 60 m² ÷ disposable income of 2 residents · "
                 "red = 10 highest burden, blue = 10 lowest",
                 graph("afford-rank", 560), 6),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def supply_demand_tab() -> html.Div:
    return html.Div(
        [
            card("Supply vs. demand across 400 Kreise",
                 "Supply slack = market-active vacancy (Zensus 2022) · demand = population growth 2018–2023 · "
                 "colour = composite index (red = tight) · selected cities ringed",
                 graph("sd-scatter", 520), 8),
            card("Tightest and slackest Kreise", "Composite index: z(population growth) − z(vacancy)",
                 graph("sd-bars", 520), 4),
            card("Does the structural signal match the live market?",
                 "Structural index (census + population) vs. live listing pressure (GREIX days on market and "
                 "quick-let share), 37 cities",
                 graph("sd-validate", 420), 12),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def neighbourhood_tab() -> html.Div:
    return html.Div(
        [
            html.Div(
                [
                    html.Div(
                        [
                            html.Div([html.Label("City", className="lbl"),
                                      dcc.Dropdown(id="hood-city", clearable=False)], className="filter",
                                     style={"minWidth": "240px"}),
                            html.Div([html.Label("Grid", className="lbl"),
                                      seg("hood-res", [{"label": "100 m", "value": 100},
                                                       {"label": "1 km", "value": 1000}], 100)],
                                     className="filter"),
                            html.Div([html.Label("Reliability", className="lbl"),
                                      dcc.Checklist(id="hood-hide", options=[{"label": " hide low-reliability cells",
                                                                              "value": "hide"}], value=["hide"])],
                                     className="filter"),
                        ],
                        style={"display": "flex", "gap": "20px", "flexWrap": "wrap", "alignItems": "flex-end"},
                    ),
                    html.P(id="hood-sub", className="sub", style={"marginTop": "8px"}),
                    graph("hood-map", 620),
                ],
                className="card span-8",
            ),
            html.Div(
                [html.H3("Rent distribution inside the city"), html.P(id="hood-stats", className="sub"),
                 graph("hood-hist", 260), html.Div(id="hood-bezirke-wrap", children=[graph("hood-bezirke", 300)])],
                className="card span-4",
            ),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def outlook_tab() -> html.Div:
    return html.Div(
        [
            html.Div(
                [html.H3(id="fc-title"),
                 html.P("History (median asking rent) with 3/6/12-month LightGBM quantile forecast and "
                        "conformal 80% interval · triangles = detected anomalies", className="sub"),
                 graph("fc-fan", 380)],
                className="card span-8",
            ),
            html.Div(
                [html.H3("AI market summary"), html.Div(id="summary-badge", className="hint"),
                 dcc.Loading(html.Div(id="summary-text", className="summary-text"), type="dot"),
                 html.Details([html.Summary("Facts the summary is grounded in"),
                               html.Pre(id="summary-facts", className="facts")])],
                className="card span-4",
            ),
            card("Forecast accuracy (out-of-sample backtest)",
                 "Mean absolute % error over 12 rolling origins × 37 cities, lower is better",
                 graph("fc-backtest", 300), 5),
            html.Div(
                [html.H3("Forecasts for the selected cities"), html.P(id="fc-table-sub", className="sub"),
                 dash_table.DataTable(
                     id="fc-table",
                     columns=[{"name": "City", "id": "city_en"}, {"name": "Now €/m²", "id": "now"},
                              {"name": "+3 m", "id": "h3"}, {"name": "+6 m", "id": "h6"},
                              {"name": "+12 m", "id": "h12"}, {"name": "12 m range (80%)", "id": "range"}],
                     style_as_list_view=True, style_cell=TABLE_CELL,
                     style_header={**TABLE_CELL, "fontWeight": 600, "color": "var(--text-2)"}),
                 html.H3("Recent anomalies (all cities)", style={"marginTop": "14px"}),
                 html.P("Month-on-month moves far outside a city's own history after removing the market-wide move "
                        "(robust z ≥ 3.5)", className="sub"),
                 html.Div(id="anomaly-list", className="anomaly-list")],
                className="card span-7",
            ),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def finance_tab() -> html.Div:
    return html.Div(
        [
            card("Housing loan rate", "Effective rate on new housing loans to households, % p.a. · Bundesbank",
                 graph("rate", 320), 6),
            card("What that means per month",
                 "Payment on a €300,000 loan with 2% initial amortisation, € per month",
                 graph("payment", 320), 6),
        ],
        className="grid",
        style={"marginTop": "16px"},
    )


def footer() -> html.Div:
    srcs = client.get("/meta/sources")
    return html.Div(
        [html.Div(html.B("Sources & licences"))]
        + [html.Div(f"{s['publisher']} · {s['licence']}") for s in srcs]
        + [html.Div("Affordability uses stated assumptions (60 m², 2 residents); asking-rent estimates outside "
                    "the 37 GREIX cities are modelled, not observed."),
           html.Div("Built by Zoeb Ali Khan · github.com/zoeb7184 · zoeb7184.github.io")],
        className="footer",
    )


app.layout = serve_layout

# ---------------------------------------------------------------- state callbacks
app.clientside_callback(
    """
    function(n) {
        const theme = (n % 2 === 1) ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        return [theme, theme === 'dark' ? 'Light mode' : 'Dark mode'];
    }
    """,
    Output("theme", "data"),
    Output("theme-btn", "children"),
    Input("theme-btn", "n_clicks"),
)


@app.callback(Output("cities", "value"), Output("slots", "data"), Input("cities", "value"), State("slots", "data"))
def assign_slots(selected: list[str], slots: dict) -> tuple:
    """Colour follows the city: a city keeps its slot while selected; new ones take the lowest free slot."""
    selected = (selected or [])[:MAX_SERIES]
    kept = {c: s for c, s in (slots or {}).items() if c in selected}
    free = [i for i in range(MAX_SERIES) if i not in kept.values()]
    for c in selected:
        if c not in kept:
            kept[c] = free.pop(0)
    return selected, kept


@app.callback(
    Output("focus", "data"),
    Input("ranges", "clickData"),
    Input("burden", "clickData"),
    Input("cities", "value"),
    State("focus", "data"),
)
def set_focus(click_r, click_b, selected, focus):
    trig = callback_context.triggered_id
    click = click_r if trig == "ranges" else click_b if trig == "burden" else None
    if click and "customdata" in click["points"][0]:
        return click["points"][0]["customdata"][0]
    if trig == "cities" and selected and focus not in selected:
        return selected[0]
    return focus or (selected[0] if selected else DEFAULT_CITIES[0])


# ---------------------------------------------------------------- KPI tiles
@app.callback(Output("kpis", "children"), Output("focus-note", "children"), Input("focus", "data"))
def kpis(focus: str):
    snap = cities_df().set_index("city")
    if focus not in snap.index:
        return no_update, no_update
    r = snap.loc[focus]
    rates = client.get("/mortgage-rates")
    rate = rates[-1] if rates else None
    yoy = r["index_yoy_pct"]
    trend = html.Span(f"{'▲' if yoy >= 0 else '▼'} {abs(yoy):.1f}% YoY", className="up" if yoy >= 0 else "down")

    def tile(label, value, unit, sub):
        return html.Div(
            [html.Div(label, className="k-label"),
             html.Div([value, html.Span(unit, className="k-unit")], className="k-value"),
             html.Div(sub, className="k-sub")],
            className="kpi",
        )

    tiles = [
        tile(f"Median asking rent · {r['city_en']}", fmt_num(r["median_rent_sqm"]), "€/m²", trend),
        tile("60 m² flat, cold rent", fmt_num(r["reference_monthly_rent_eur"], 0), "€/mo",
             f"Zensus 2022 average: {fmt_num(r['existing_contract_rent_sqm_2022'])} €/m²"),
        tile("Rent burden", fmt_num(r["asking_rent_burden_pct"], 1), "%",
             f"of 2 residents' disposable income ({int(r['income_year'])})"),
        tile("Time on market", fmt_num(r["time_on_market_days_4q"], 0), "days",
             f"{100 * r['share_closed_within_week_4q']:.0f}% of listings gone within a week"),
        tile("Housing loan rate", fmt_num(rate["rate_pct"]) if rate else "–", "%",
             f"{pd.to_datetime(rate['period_date']):%b %Y} · {rate['change_12m_pp']:+.2f} pp YoY" if rate else ""),
    ]
    note = (f"Focus: {r['city_en']}, {pd.to_datetime(r['latest_month']):%B %Y}. "
            "Click a city in the charts below to change it.")
    if r["mapping_type"] != "exact":
        note += f" Income and Zensus figures refer to the surrounding Kreis (AGS {r['ags']})."
    return tiles, note


# ---------------------------------------------------------------- cities tab
def _trim(rows: pd.DataFrame, months: int | None) -> pd.DataFrame:
    if rows.empty:
        return rows
    rows = rows.assign(period_date=pd.to_datetime(rows["period_date"]))
    if months:
        rows = rows[rows["period_date"] > rows["period_date"].max() - pd.DateOffset(months=months)]
    return rows


@app.callback(
    Output("trend", "figure"),
    Input("cities", "value"), Input("period", "value"), Input("slots", "data"), Input("theme", "data"),
)
def trend(selected, period, slots, theme):
    rows = pd.DataFrame(client.get("/rents/monthly", cities=selected or []))
    return rent_trend_lines(_trim(rows, PERIODS[period]), slots, theme)


@app.callback(Output("ranges", "figure"), Input("slots", "data"), Input("focus", "data"), Input("theme", "data"))
def ranges(slots, focus, theme):
    return city_range_dots(cities_df(), slots, focus, theme)


@app.callback(Output("burden", "figure"), Input("slots", "data"), Input("focus", "data"), Input("theme", "data"))
def burden(slots, focus, theme):
    return rent_burden_scatter(cities_df(), slots, focus, theme)


@app.callback(
    Output("pressure", "figure"),
    Input("cities", "value"), Input("period", "value"), Input("slots", "data"), Input("theme", "data"),
)
def pressure(selected, period, slots, theme):
    rows = pd.DataFrame(client.get("/market-pressure", cities=selected or []))
    months = PERIODS[period]
    return pressure_lines(_trim(rows, max(months, 24) if months else None), slots, theme)


# ---------------------------------------------------------------- map tab
def _segment(value: str) -> dict:
    """Map the flat type/size control to API parameters."""
    if value.startswith("size:"):
        code = value.split(":", 1)[1]
        return {"size_band": code, "label": SIZE_BANDS[code]}
    return {"rooms": value, "label": "all flats" if value == "total" else f"{value}-room flats"}


def _kreis_frame(segment: str) -> pd.DataFrame:
    seg = _segment(segment)
    if "size_band" in seg:
        est = pd.DataFrame(client.get("/kreise/rents-by-size", size_band=seg["size_band"]))
    else:
        est = pd.DataFrame(client.get("/kreise/asking-rents", rooms=seg["rooms"]))
    aff = pd.DataFrame(client.get("/kreise/affordability"))[
        ["ags", "land_name", "affordability_index", "rent_burden_pct"]]
    sd = pd.DataFrame(client.get("/kreise/supply-demand"))[["ags", "supply_demand_index"]]
    return est[["ags", "kreis_name", "rent_eur_sqm", "estimated_asking_rent_eur_sqm"]].merge(
        aff, on="ags", how="left").merge(sd, on="ags", how="left")


@app.callback(
    Output("map", "figure"),
    Output("map-sub", "children"),
    Input("map-metric", "value"), Input("rooms", "value"), Input("theme", "data"), Input("map", "clickData"),
)
def kreis_map(metric, segment, theme, click):
    df = _kreis_frame(segment)
    sub = {
        "rent": "Average net cold rent of existing contracts, € per m², Zensus 15 May 2022",
        "asking": "Zensus 2022 rent uplifted by the asking premium observed in GREIX cities (modelled estimate)",
        "afford": "Index 100 = median Kreis · below 100 (red) = rent takes a larger share of local income (2022)",
        "sd": "Red = demand outpaces supply (low vacancy, growing population) · blue = slack market",
    }[metric]
    if segment != "total" and metric in ("rent", "asking"):
        sub += f" · {_segment(segment)['label']}"
    return choropleth(df, client.get("/geo/kreise"), metric, clicked_ags(click), theme), sub + " · click a Kreis"


@app.callback(
    Output("kreis-panel", "children"),
    Output("kreis-rooms", "figure"),
    Input("map", "clickData"), Input("theme", "data"), Input("rooms", "value"),
)
def kreis_detail(click, theme, segment):
    ags = clicked_ags(click)
    rooms = pd.DataFrame(client.get(f"/kreise/{ags}/asking-rents"))
    aff = next((a for a in client.get("/kreise/affordability") if a["ags"] == ags), None)
    method = rooms["estimate_method"].iloc[0].replace("_", " ")
    panel = [
        html.Div(rooms["kreis_name"].iloc[0], className="name"),
        html.Div(f"{aff['land_name']} · AGS {ags} · {aff['population']:,.0f} residents ({aff['income_year']})"
                 if aff else f"AGS {ags}", className="meta"),
        html.Div(
            [
                html.Div([html.B(f"{aff['rent_eur_sqm']:.2f} €"), "Zensus rent / m²"]),
                html.Div([html.B(f"{aff['disposable_income_per_resident_eur']:,.0f} €"), "income / resident"]),
                html.Div([html.B(f"{aff['rent_burden_pct']:.1f}%"), "rent burden"]),
                html.Div([html.B(f"{aff['affordability_index']:.0f}"),
                          f"affordability · #{aff['affordability_rank']} of 400 (1 = most affordable)"]),
            ],
            className="stat-row",
        ) if aff else None,
        html.P(f"Rent by {'floor area' if segment.startswith('size:') else 'number of rooms'}: Zensus 2022 vs. "
               f"estimated asking rent today (premium: {method}) · switch with the flat type/size filter",
               className="sub"),
    ]
    if segment.startswith("size:"):
        sizes = pd.DataFrame(client.get("/kreise/rents-by-size", ags=ags))
        return panel, kreis_rooms_bars(sizes, theme, labels=[SIZE_BANDS[c] for c in sizes["size_band_code"]])
    return panel, kreis_rooms_bars(rooms, theme)


# ---------------------------------------------------------------- affordability + financing
@app.callback(
    Output("finder-table", "data"),
    Output("finder-count", "children"),
    Input("budget", "value"), Input("sqm", "value"), Input("rooms", "value"),
)
def finder(budget, sqm, segment):
    if not budget or not sqm:
        return [], "Enter a budget and a size."
    seg = _segment(segment)
    params = {k: v for k, v in seg.items() if k in ("rooms", "size_band")}
    rows = client.get("/affordability/finder", budget_eur=budget, sqm=sqm, limit=400, **params)
    return rows, (f"{len(rows)} of 400 Kreise fit {budget:,.0f} € for {sqm:.0f} m² ({seg['label']}), largest first. "
                  "Modelled estimates, not live listings.")


@app.callback(Output("afford-rank", "figure"), Input("theme", "data"))
def afford_rank(theme):
    return affordability_ranking(pd.DataFrame(client.get("/kreise/affordability")), theme)


@app.callback(Output("rate", "figure"), Output("payment", "figure"), Input("theme", "data"))
def finance(theme):
    df = pd.DataFrame(client.get("/mortgage-rates"))
    return mortgage_rate_line(df, theme), mortgage_payment_line(df, theme)


# ---------------------------------------------------------------- supply & demand tab
def _highlights(slots: dict, theme: str) -> dict[str, tuple[str, str]]:
    snap = cities_df().set_index("city")
    series = tokens(theme)["series"]
    return {snap.loc[c, "ags"]: (snap.loc[c, "city_en"], series[s]) for c, s in (slots or {}).items() if c in snap.index}


@app.callback(
    Output("sd-scatter", "figure"), Output("sd-bars", "figure"), Output("sd-validate", "figure"),
    Input("slots", "data"), Input("theme", "data"),
)
def supply_demand(slots, theme):
    kreise = pd.DataFrame(client.get("/kreise/supply-demand"))
    cities = pd.DataFrame(client.get("/cities/supply-demand"))
    return (supply_demand_scatter(kreise, _highlights(slots, theme), theme), balance_bars(kreise, theme),
            structure_vs_live(cities, slots, theme))


# ---------------------------------------------------------------- neighbourhoods tab
@app.callback(Output("hood-city", "options"), Output("hood-city", "value"), Input("focus", "data"),
              State("hood-city", "value"))
def hood_city_options(focus, current):
    snap = cities_df().sort_values("city_en")
    opts = [{"label": r.city_en if r.mapping_type == "exact" else f"{r.city_en} (whole Kreis)", "value": r.ags}
            for r in snap.itertuples()]
    if current:
        return opts, current
    match = snap.loc[snap["city"] == focus, "ags"]
    return opts, (match.iloc[0] if len(match) else "05711")


@app.callback(
    Output("hood-map", "figure"), Output("hood-hist", "figure"), Output("hood-sub", "children"),
    Output("hood-stats", "children"), Output("hood-bezirke", "figure"), Output("hood-bezirke-wrap", "style"),
    Input("hood-city", "value"), Input("hood-res", "value"), Input("hood-hide", "value"), Input("theme", "data"),
)
def neighbourhoods(ags, res, hide, theme):
    if not ags:
        return (no_update,) * 6
    hide_low = "hide" in (hide or [])
    grid = client.get(f"/kreise/{ags}/grid", resolution_m=res)
    name = next((c["city_en"] for c in client.get("/cities") if c["ags"] == ags), ags)
    n_all = len(grid["x"])
    n_low = sum(grid["low_reliability"])
    sub = (f"Zensus 2022 average net cold rent per {res} m grid cell · {n_all:,} cells"
           f"{f', {n_low:,} low-reliability' + (' hidden' if hide_low else ' shown') if n_low else ''} · "
           "scale clipped to P2–P98")
    spread = next((r for r in client.get("/kreise/neighbourhood-spread") if r["ags"] == ags), None)
    stats = (f"1 km cells: P10 {spread['p10_rent_eur_sqm']:.2f} € · median {spread['p50_rent_eur_sqm']:.2f} € · "
             f"P90 {spread['p90_rent_eur_sqm']:.2f} € (P90/P10 = {spread['p90_p10_ratio']:.2f})") if spread else ""
    bez = pd.DataFrame(client.get("/bezirke/rents"))
    bez = bez[bez["bezirk_code"].str[:5] == ags] if not bez.empty else bez
    show_bez = not bez.empty
    bez_fig = bezirke_bars(bez, theme) if show_bez else go.Figure()
    return (grid_heatmap(grid, theme, hide_low, name), grid_histogram(grid, theme, hide_low), sub, stats, bez_fig,
            {} if show_bez else {"display": "none"})


# ---------------------------------------------------------------- outlook tab
@app.callback(
    Output("fc-title", "children"), Output("fc-fan", "figure"),
    Input("focus", "data"), Input("slots", "data"), Input("theme", "data"),
)
def outlook(focus, slots, theme):
    hist = pd.DataFrame(client.get("/rents/monthly", cities=[focus]))
    fc = pd.DataFrame(client.get("/forecasts", cities=[focus]))
    an = pd.DataFrame(client.get("/anomalies", cities=[focus]))
    t = tokens(theme)
    color = t["series"][slots[focus]] if focus in (slots or {}) else t["series"][0]
    name = hist["city_en"].iloc[0] if not hist.empty else focus
    return f"Rent outlook · {name}", forecast_fan(hist, fc, an, color, theme)


@app.callback(Output("fc-backtest", "figure"), Input("theme", "data"))
def backtest(theme):
    return backtest_bars(pd.DataFrame(client.get("/forecasts/backtest")), theme)


@app.callback(Output("fc-table", "data"), Output("fc-table-sub", "children"), Input("cities", "value"))
def forecast_table(selected):
    fc = pd.DataFrame(client.get("/forecasts", cities=selected or []))
    if fc.empty:
        return [], ""
    rows = []
    for _city, g in fc.groupby("city", sort=False):
        g = g.set_index("horizon_months")
        rows.append({
            "city_en": g["city_en"].iloc[0], "now": f"{g['median_rent_now'].iloc[0]:.2f}",
            **{f"h{h}": f"{g.loc[h, 'p50_rent_sqm']:.2f} ({g.loc[h, 'change_p50_pct']:+.1f}%)" for h in (3, 6, 12)},
            "range": f"{g.loc[12, 'p10_rent_sqm']:.2f} – {g.loc[12, 'p90_rent_sqm']:.2f}",
        })
    origin = pd.to_datetime(fc["origin_month"].iloc[0])
    return rows, f"Median forecast in €/m² from {origin:%B %Y} · model {fc['model_version'].iloc[0]}"


@app.callback(Output("anomaly-list", "children"), Input("theme", "data"))
def anomaly_list(_theme):
    rows = client.get("/anomalies", start=str((pd.Timestamp.today() - pd.DateOffset(months=24)).date()))
    if not rows:
        return html.Div("No anomalies in the last 24 months.", className="hint")
    return [html.Div([html.Span("▲" if r["direction"] == "spike" else "▼", className=f"arrow {r['direction']}"),
                      html.B(f" {r['city_en']} "), f"{pd.to_datetime(r['period_date']):%b %Y}: ",
                      f"{r['mom_pct']:+.1f}% MoM vs. market {r['market_mom_pct']:+.1f}% (z = {r['robust_z']:.1f}, "
                      f"{r['severity']})"], className="anomaly")
            for r in rows[:10]]


@app.callback(
    Output("summary-text", "children"), Output("summary-badge", "children"), Output("summary-facts", "children"),
    Input("focus", "data"),
)
def market_summary(focus):
    s = client.get(f"/cities/{focus}/summary")
    badge = ("Written by an LLM (" + s["generated_by"].split(":", 1)[1] + "), every number verified against the data"
             if s["generated_by"].startswith("groq") else
             "Template summary (set GROQ_API_KEY for an LLM-written version; numbers are verified either way)")
    if s["grounding_rejected_numbers"]:
        badge += f" · LLM draft rejected: unsupported numbers {', '.join(s['grounding_rejected_numbers'])}"
    paras = [html.P(p) for p in s["text"].split("\n\n")]
    return paras, badge, json.dumps(s["facts"], indent=2, ensure_ascii=False)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8050")), debug=os.getenv("DASH_DEBUG") == "1")
