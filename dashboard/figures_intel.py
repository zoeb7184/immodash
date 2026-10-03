"""Figure builders for Phase 2 (supply & demand, neighbourhoods) and Phase 3 (outlook)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go

from .figures import _label_positions
from .theme import base_layout, colorscale, empty_figure, tokens


# ---------------------------------------------------------------- supply & demand
def supply_demand_scatter(kreise: pd.DataFrame, highlight_ags: dict[str, tuple[str, str]], theme: str) -> go.Figure:
    """Vacancy (supply slack) vs population growth (demand) for all 400 Kreise.

    `highlight_ags` maps AGS -> (label, colour) for the selected cities.
    """
    t = tokens(theme)
    df = kreise.copy()
    size = 5 + 18 * (df["population"] / df["population"].max()) ** 0.5
    fig = go.Figure(
        go.Scatter(
            x=df["market_active_vacancy_pct"], y=df["population_growth_5y_pct"], mode="markers",
            marker=dict(size=size, color=df["supply_demand_index"], colorscale=colorscale(t["div"]),
                        cmin=-3, cmax=3, cmid=0, reversescale=True, opacity=0.85,
                        line=dict(color=t["surface"], width=1),
                        colorbar=dict(title=dict(text="Index", font=dict(size=11, color=t["text_2"])), thickness=10,
                                      len=0.6, tickfont=dict(color=t["text_2"], size=10), outlinewidth=0)),
            customdata=df[["kreis_name", "supply_demand_index", "market_balance", "rent_eur_sqm"]].to_numpy(),
            hovertemplate="<b>%{customdata[0]}</b><br>Vacancy %{x:.1f}% · population %{y:+.1f}% (5y)"
            "<br>Index %{customdata[1]:+.2f} (%{customdata[2]})<br>Zensus rent %{customdata[3]:.2f} €/m²<extra></extra>",
        )
    )
    hl = df[df["ags"].isin(highlight_ags)]
    if not hl.empty:
        lab = hl.assign(city=hl["ags"], logv=np.log(hl["market_active_vacancy_pct"]))
        pos = _label_positions(lab, "logv", "population_growth_5y_pct")
        fig.add_trace(go.Scatter(
            x=hl["market_active_vacancy_pct"], y=hl["population_growth_5y_pct"], mode="markers+text",
            text=[highlight_ags[a][0] for a in hl["ags"]], textposition=[pos[a] for a in hl["ags"]],
            textfont=dict(color=t["text"], size=11),
            marker=dict(size=12, color="rgba(0,0,0,0)", line=dict(color=[highlight_ags[a][1] for a in hl["ags"]], width=2.5)),
            hoverinfo="skip"))
    fig.add_vline(x=df["market_active_vacancy_pct"].median(), line=dict(color=t["axis"], dash="dot", width=1))
    fig.add_hline(y=df["population_growth_5y_pct"].median(), line=dict(color=t["axis"], dash="dot", width=1))
    for x, y, txt, xa, ya in ((0.01, 0.99, "Tight: low vacancy, growing", "left", "top"),
                              (0.99, 0.01, "Slack: high vacancy, shrinking", "right", "bottom")):
        fig.add_annotation(x=x, y=y, xref="paper", yref="paper", text=txt, showarrow=False, xanchor=xa, yanchor=ya,
                           font=dict(color=t["muted"], size=11))
    fig.update_layout(**base_layout(theme, margin=dict(l=52, r=16, t=8, b=44)))
    fig.update_xaxes(title=dict(text="Market-active vacancy, % (Zensus 2022)", font=dict(size=11)), type="log",
                     tickvals=[0.5, 1, 2, 3, 5, 10], ticksuffix="%", showgrid=True, gridcolor=t["grid"])
    fig.update_yaxes(title=dict(text="Population growth 2018–2023, %", font=dict(size=11)), ticksuffix="%",
                     showgrid=True, zeroline=True, zerolinecolor=t["axis"])
    return fig


def structure_vs_live(cities: pd.DataFrame, slots: dict, theme: str) -> go.Figure:
    """Structural supply-demand index (Zensus + population) vs live demand pressure (GREIX)."""
    t = tokens(theme)
    df = cities.dropna(subset=["supply_demand_index", "demand_pressure_score"])
    sel = df["city"].isin(slots or {})
    positions = _label_positions(df[sel], "supply_demand_index", "demand_pressure_score")
    fig = go.Figure()
    for mask, is_sel in ((~sel, False), (sel, True)):
        part = df[mask]
        fig.add_trace(go.Scatter(
            x=part["supply_demand_index"], y=part["demand_pressure_score"],
            mode="markers+text" if is_sel else "markers",
            text=part["city_en"] if is_sel else None,
            textposition=[positions.get(c, "top center") for c in part["city"]] if is_sel else None,
            textfont=dict(color=t["text_2"], size=11),
            marker=dict(size=11 if is_sel else 8,
                        color=[t["series"][slots[c]] for c in part["city"]] if is_sel else t["context"],
                        line=dict(color=t["surface"], width=2)),
            customdata=part[["city_en", "market_active_vacancy_pct", "time_on_market_days_4q"]].to_numpy(),
            hovertemplate="<b>%{customdata[0]}</b><br>Structural index %{x:+.2f}<br>Live pressure %{y:+.2f}"
            "<br>Vacancy %{customdata[1]:.1f}% · %{customdata[2]:.0f} days on market<extra></extra>"))
    r = np.corrcoef(df["supply_demand_index"], df["demand_pressure_score"])[0, 1]
    slope, icpt = np.polyfit(df["supply_demand_index"], df["demand_pressure_score"], 1)
    xs = np.array([df["supply_demand_index"].min(), df["supply_demand_index"].max()])
    fig.add_trace(go.Scatter(x=xs, y=icpt + slope * xs, mode="lines", line=dict(color=t["axis"], dash="dash", width=1),
                             hoverinfo="skip"))
    fig.add_annotation(x=0.01, y=0.99, xref="paper", yref="paper", showarrow=False, xanchor="left", yanchor="top",
                       text=f"Pearson r = {r:.2f} across {len(df)} cities", font=dict(color=t["text_2"], size=12))
    fig.update_layout(**base_layout(theme, margin=dict(l=52, r=16, t=8, b=44)))
    fig.update_xaxes(title=dict(text="Structural supply-demand index (Zensus vacancy + population)", font=dict(size=11)),
                     showgrid=True, gridcolor=t["grid"], zeroline=True, zerolinecolor=t["axis"])
    fig.update_yaxes(title=dict(text="Live demand pressure (GREIX)", font=dict(size=11)), showgrid=True,
                     zeroline=True, zerolinecolor=t["axis"])
    return fig


def balance_bars(kreise: pd.DataFrame, theme: str, n: int = 10) -> go.Figure:
    t = tokens(theme)
    top = kreise.nlargest(n, "supply_demand_index")
    bottom = kreise.nsmallest(n, "supply_demand_index").iloc[::-1]
    df = pd.concat([bottom, top.iloc[::-1]])
    df["label"] = df["kreis_name"].str.split(",").str[0]
    colors = [t["div"][-2]] * len(bottom) + [t["div"][1]] * len(top)
    fig = go.Figure(go.Bar(
        x=df["supply_demand_index"], y=df["label"], orientation="h", marker=dict(color=colors, cornerradius=4),
        customdata=df[["kreis_name", "market_active_vacancy_pct", "population_growth_5y_pct"]].to_numpy(),
        hovertemplate="<b>%{customdata[0]}</b><br>Index %{x:+.2f}<br>Vacancy %{customdata[1]:.1f}% · "
        "population %{customdata[2]:+.1f}%<extra></extra>"))
    fig.update_layout(**base_layout(theme, margin=dict(l=8, r=16, t=8, b=36), bargap=0.3))
    fig.update_yaxes(automargin=True, tickfont=dict(size=11))
    fig.update_xaxes(showgrid=True, gridcolor=t["grid"], zeroline=True, zerolinecolor=t["axis"])
    return fig


# ---------------------------------------------------------------- neighbourhoods
def grid_heatmap(grid: dict, theme: str, hide_low: bool, title_name: str) -> go.Figure:
    """Raster heatmap of Zensus grid cells (EPSG:3035 metres -> km), with the Kreis outline."""
    t = tokens(theme)
    df = pd.DataFrame({"x": grid["x"], "y": grid["y"], "rent": grid["rent_eur_sqm"], "low": grid["low_reliability"]})
    if hide_low:
        df = df[~df["low"]]
    if df.empty:
        return empty_figure(theme, "No reliable grid cells")
    res = grid["resolution_m"]
    x0, y0 = df["x"].min(), df["y"].min()
    df["i"] = ((df["x"] - x0) // res).astype(int)
    df["j"] = ((df["y"] - y0) // res).astype(int)
    z = np.full((df["j"].max() + 1, df["i"].max() + 1), np.nan)
    z[df["j"], df["i"]] = df["rent"]
    xs = (x0 + res * np.arange(z.shape[1]) - x0) / 1000
    ys = (y0 + res * np.arange(z.shape[0]) - y0) / 1000
    lo, hi = np.nanpercentile(df["rent"], 2), np.nanpercentile(df["rent"], 98)
    fig = go.Figure(go.Heatmap(
        x=xs, y=ys, z=z, zmin=lo, zmax=hi, colorscale=colorscale(t["seq"]), hoverongaps=False,
        colorbar=dict(title=dict(text="€/m²", font=dict(size=11, color=t["text_2"])), thickness=10, len=0.6,
                      tickfont=dict(color=t["text_2"], size=10), outlinewidth=0, ticksuffix=" €"),
        hovertemplate="%{z:.2f} €/m²<br>%{x:.1f} km E · %{y:.1f} km N<extra></extra>"))
    outline = grid.get("outline_3035")
    if outline:
        polys = outline["coordinates"] if outline["type"] == "MultiPolygon" else [outline["coordinates"]]
        ox, oy = [], []
        for poly in polys:
            for ring in poly[:1]:
                arr = np.asarray(ring)
                ox += list((arr[:, 0] - x0) / 1000) + [None]
                oy += list((arr[:, 1] - y0) / 1000) + [None]
        fig.add_trace(go.Scatter(x=ox, y=oy, mode="lines", line=dict(color=t["text_2"], width=1.2), hoverinfo="skip"))
    fig.update_layout(**base_layout(theme, margin=dict(l=8, r=8, t=8, b=8)))
    fig.update_xaxes(visible=False, constrain="domain")
    fig.update_yaxes(visible=False, scaleanchor="x", scaleratio=1, constrain="domain")
    return fig


def grid_histogram(grid: dict, theme: str, hide_low: bool) -> go.Figure:
    t = tokens(theme)
    rent = np.asarray(grid["rent_eur_sqm"])
    low = np.asarray(grid["low_reliability"])
    if hide_low:
        rent = rent[~low]
    p10, p50, p90 = np.percentile(rent, [10, 50, 90])
    fig = go.Figure(go.Histogram(x=rent, xbins=dict(size=0.25), marker=dict(color=t["series"][0], cornerradius=2),
                                 hovertemplate="%{x} €/m²: %{y} cells<extra></extra>"))
    for (v, lab), ypos in zip(((p10, "P10"), (p50, "median"), (p90, "P90")), (1.0, 1.09, 1.0), strict=True):
        fig.add_vline(x=v, line=dict(color=t["text_2"], width=1, dash="dot"))
        fig.add_annotation(x=v, y=ypos, yref="paper", text=f"{lab} {v:.2f}", showarrow=False, yanchor="bottom",
                           xanchor={"P10": "right", "median": "center", "P90": "left"}[lab],
                           font=dict(color=t["text_2"], size=10))
    fig.update_layout(**base_layout(theme, margin=dict(l=40, r=12, t=34, b=36), bargap=0.05))
    fig.update_xaxes(ticksuffix=" €", range=[np.percentile(rent, 0.5) - 0.5, np.percentile(rent, 99.5) + 0.5])
    fig.update_yaxes(title=dict(text="grid cells", font=dict(size=11)), showgrid=True)
    return fig


def bezirke_bars(bez: pd.DataFrame, theme: str) -> go.Figure:
    t = tokens(theme)
    df = bez.sort_values("rent_eur_sqm")
    fig = go.Figure(go.Bar(
        x=df["rent_eur_sqm"], y=df["bezirk_name"], orientation="h",
        marker=dict(color=[t["div"][-2] if v < 0 else t["div"][1] for v in df["vs_city_pct"]], cornerradius=4),
        text=[f"{v:+.0f}%" for v in df["vs_city_pct"]], textposition="outside", cliponaxis=False,
        textfont=dict(color=t["text_2"], size=11),
        hovertemplate="<b>%{y}</b><br>%{x:.2f} €/m² (Zensus 2022)<extra></extra>"))
    fig.add_vline(x=df["city_rent_eur_sqm"].iloc[0], line=dict(color=t["axis"], dash="dot", width=1))
    fig.update_layout(**base_layout(theme, margin=dict(l=8, r=40, t=8, b=36), bargap=0.3))
    fig.update_yaxes(automargin=True, tickfont=dict(size=11))
    fig.update_xaxes(ticksuffix=" €", showgrid=True)
    return fig


# ---------------------------------------------------------------- outlook
def forecast_fan(history: pd.DataFrame, fc: pd.DataFrame, anomalies: pd.DataFrame, color: str, theme: str) -> go.Figure:
    t = tokens(theme)
    if history.empty:
        return empty_figure(theme, "No history for this city")
    h = history.assign(period_date=pd.to_datetime(history["period_date"])).sort_values("period_date")
    h = h[h["period_date"] > h["period_date"].max() - pd.DateOffset(months=48)]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=h["period_date"], y=h["median_rent_sqm"], mode="lines", name="Median asking rent",
                             line=dict(color=color, width=2),
                             hovertemplate="%{x|%b %Y}: %{y:.2f} €/m²<extra></extra>"))
    if not fc.empty:
        f = fc.assign(target_month=pd.to_datetime(fc["target_month"])).sort_values("horizon_months")
        x0, y0 = h["period_date"].iloc[-1], h["median_rent_sqm"].iloc[-1]
        xs = [x0, *f["target_month"]]
        fig.add_trace(go.Scatter(x=xs + xs[::-1], y=[y0, *f["p90_rent_sqm"]] + [y0, *f["p10_rent_sqm"]][::-1],
                                 fill="toself", fillcolor=color, opacity=0.18, line=dict(width=0), mode="lines",
                                 name="80% interval", hoverinfo="skip"))
        fig.add_trace(go.Scatter(
            x=xs, y=[y0, *f["p50_rent_sqm"]], mode="lines+markers", name="Forecast (median)",
            line=dict(color=color, width=2, dash="dash"), marker=dict(size=8, line=dict(color=t["surface"], width=2)),
            customdata=np.column_stack([[0, *f["horizon_months"]], [y0, *f["p10_rent_sqm"]], [y0, *f["p90_rent_sqm"]]]),
            hovertemplate="+%{customdata[0]} months: %{y:.2f} €/m²<br>80%: %{customdata[1]:.2f}–%{customdata[2]:.2f}"
            "<extra></extra>"))
    if not anomalies.empty:
        a = anomalies.assign(period_date=pd.to_datetime(anomalies["period_date"]))
        a = a[a["period_date"] >= h["period_date"].min()]
        if not a.empty:
            fig.add_trace(go.Scatter(
                x=a["period_date"], y=a["median_rent_sqm"], mode="markers", name="Anomaly",
                marker=dict(symbol=["triangle-up" if d == "spike" else "triangle-down" for d in a["direction"]],
                            size=13, color=t["surface"], line=dict(color=t["text"], width=2)),
                customdata=a[["mom_pct", "robust_z"]].to_numpy(),
                hovertemplate="Anomaly %{x|%b %Y}: %{customdata[0]:+.1f}% MoM (z = %{customdata[1]:.1f})<extra></extra>"))
    fig.update_layout(**base_layout(theme, showlegend=True, hovermode="x unified", margin=dict(l=48, r=16, t=28, b=36)))
    fig.update_yaxes(ticksuffix=" €", showgrid=True)
    return fig


def backtest_bars(bt: pd.DataFrame, theme: str) -> go.Figure:
    t = tokens(theme)
    names = {"lightgbm": "LightGBM (ours)", "drift_last_12m": "Trend continuation", "naive_no_change": "No change"}
    fig = go.Figure()
    for slot, model in enumerate(["lightgbm", "drift_last_12m", "naive_no_change"]):
        d = bt[bt["model"] == model].sort_values("horizon_months")
        fig.add_trace(go.Bar(
            x=[f"{h} months" for h in d["horizon_months"]], y=d["mape_pct"], name=names[model],
            marker=dict(color=t["series"][slot] if model == "lightgbm" else t["context"] if slot == 2 else t["series"][1],
                        cornerradius=4),
            text=[f"{v:.2f}%" for v in d["mape_pct"]], textposition="outside", textfont=dict(color=t["text_2"], size=11),
            customdata=d[["mae_eur_sqm", "n_forecasts"]].to_numpy(),
            hovertemplate=f"{names[model]}<br>%{{x}}: MAPE %{{y:.2f}}% · MAE %{{customdata[0]:.3f}} €/m²"
            "<br>%{customdata[1]} out-of-sample forecasts<extra></extra>"))
    fig.update_layout(**base_layout(theme, barmode="group", bargap=0.3, bargroupgap=0.08, showlegend=True,
                                    margin=dict(l=40, r=8, t=36, b=36)))
    fig.update_yaxes(ticksuffix="%", showgrid=True, rangemode="tozero")
    return fig
