"""Figure builders. Pure functions: DataFrame in, plotly Figure out - easy to test.

Conventions: colour follows the city (slot store), one y-axis per chart, thin marks,
selective direct labels, hover on every mark, recessive grid.
"""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from .theme import base_layout, colorscale, empty_figure, tokens


def _city_color(city: str, slots: dict, theme: str) -> str | None:
    slot = (slots or {}).get(city)
    return None if slot is None else tokens(theme)["series"][slot]


def _city_label(df: pd.DataFrame) -> dict[str, str]:
    return dict(zip(df["city"], df["city_en"], strict=True))


# ---------------------------------------------------------------- cities tab
def rent_trend_lines(df: pd.DataFrame, slots: dict, theme: str) -> go.Figure:
    if df.empty:
        return empty_figure(theme, "Pick at least one city")
    t = tokens(theme)
    df = df.copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    fig = go.Figure()
    labels = _city_label(df)
    last_points = []
    for city, g in df.groupby("city", sort=False):
        color = _city_color(city, slots, theme) or t["context"]
        fig.add_trace(
            go.Scatter(
                x=g["period_date"],
                y=g["median_rent_sqm"],
                name=labels[city],
                mode="lines",
                line=dict(color=color, width=2),
                customdata=g[["index_yoy_pct"]].fillna(0).to_numpy(),
                hovertemplate=f"<b>{labels[city]}</b> %{{y:.2f}} €/m²"
                "<span style='color:" + t["muted"] + "'> · %{customdata[0]:+.1f}% YoY</span><extra></extra>",
            )
        )
        last = g.iloc[-1]
        last_points.append((last["median_rent_sqm"], labels[city], color, last["period_date"]))
    # Direct labels at the line ends (<= 6 series), nudged apart to avoid collisions
    last_points.sort()
    placed: list[float] = []
    span = df["median_rent_sqm"].max() - df["median_rent_sqm"].min()
    min_gap = max(span * 0.055, 0.25)
    for y, name, color, x in last_points:
        y_lab = y if not placed or y - placed[-1] >= min_gap else placed[-1] + min_gap
        placed.append(y_lab)
        fig.add_annotation(x=x, y=y_lab, text=f"{name} {y:.1f}", showarrow=False, xanchor="left", xshift=6,
                           font=dict(color=t["text_2"], size=11))
        fig.add_trace(go.Scatter(x=[x], y=[y], mode="markers", hoverinfo="skip", showlegend=False,
                                 marker=dict(color=color, size=8, line=dict(color=t["surface"], width=2))))
    fig.update_layout(**base_layout(theme, hovermode="x unified", showlegend=True,
                                    margin=dict(l=48, r=120, t=28, b=36)))
    fig.update_yaxes(ticksuffix=" €", showgrid=True)
    fig.update_xaxes(showspikes=True, spikecolor=t["axis"], spikethickness=1, spikedash="solid")
    return fig


def city_range_dots(snap: pd.DataFrame, slots: dict, focus: str, theme: str) -> go.Figure:
    t = tokens(theme)
    snap = snap.sort_values("median_rent_sqm")
    colors = [_city_color(c, slots, theme) or t["context"] for c in snap["city"]]
    fig = go.Figure()
    # P25-P75 band per city as thin horizontal segments
    xs, ys = [], []
    for r in snap.itertuples():
        xs += [r.p25_rent_sqm, r.p75_rent_sqm, None]
        ys += [r.city_en, r.city_en, None]
    fig.add_trace(go.Scatter(x=xs, y=ys, mode="lines", line=dict(color=t["context"], width=4), opacity=0.55,
                             hoverinfo="skip"))
    fig.add_trace(
        go.Scatter(
            x=snap["median_rent_sqm"],
            y=snap["city_en"],
            mode="markers",
            marker=dict(
                color=colors,
                size=[12 if c == focus else 8 for c in snap["city"]],
                line=dict(color=[t["text"] if c == focus else t["surface"] for c in snap["city"]], width=2),
            ),
            customdata=snap[["city", "p25_rent_sqm", "p75_rent_sqm", "index_yoy_pct"]].to_numpy(),
            hovertemplate="<b>%{y}</b><br>Median %{x:.2f} €/m²<br>P25–P75 %{customdata[1]:.2f}–"
            "%{customdata[2]:.2f} €<br>%{customdata[3]:+.1f}% YoY<extra></extra>",
        )
    )
    fig.update_layout(**base_layout(theme, margin=dict(l=8, r=12, t=8, b=36)))
    fig.update_yaxes(tickfont=dict(size=11), automargin=True, tickmode="array", tickvals=list(snap["city_en"]),
                     range=[-0.8, len(snap) - 0.2])
    fig.update_xaxes(ticksuffix=" €", showgrid=True,
                     range=[snap["p25_rent_sqm"].min() - 1, snap["p75_rent_sqm"].max() + 1])
    return fig


def rent_burden_scatter(snap: pd.DataFrame, slots: dict, focus: str, theme: str) -> go.Figure:
    t = tokens(theme)
    fig = go.Figure()
    sel = snap["city"].isin((slots or {}).keys())
    size = 8 + 22 * (snap["population"] / snap["population"].max()) ** 0.5
    hover = ("<b>%{customdata[1]}</b><br>Rent burden %{y:.1f}%<br>YoY %{x:+.1f}%<br>"
             "Median %{customdata[2]:.2f} €/m²<extra></extra>")
    positions = _label_positions(snap[sel], "index_yoy_pct", "asking_rent_burden_pct")
    for mask, is_sel in ((~sel, False), (sel, True)):
        part = snap[mask]
        fig.add_trace(
            go.Scatter(
                x=part["index_yoy_pct"],
                y=part["asking_rent_burden_pct"],
                mode="markers+text" if is_sel else "markers",
                text=part["city_en"] if is_sel else None,
                textposition=[positions.get(c, "top center") for c in part["city"]] if is_sel else None,
                textfont=dict(color=t["text_2"], size=11),
                marker=dict(
                    size=size[mask],
                    color=[_city_color(c, slots, theme) for c in part["city"]] if is_sel else t["context"],
                    opacity=0.95 if is_sel else 0.7,
                    line=dict(color=[t["text"] if c == focus else t["surface"] for c in part["city"]], width=2),
                ),
                customdata=part[["city", "city_en", "median_rent_sqm"]].to_numpy(),
                hovertemplate=hover,
            )
        )
    med = snap["asking_rent_burden_pct"].median()
    fig.add_hline(y=med, line=dict(color=t["axis"], width=1, dash="dot"))
    fig.add_annotation(x=1, xref="paper", y=med, text=f"median {med:.1f}%", showarrow=False, xanchor="right",
                       yanchor="bottom", font=dict(color=t["muted"], size=11))
    fig.update_layout(**base_layout(theme))
    fig.update_xaxes(title=dict(text="Asking rent change, YoY %", font=dict(size=11)), ticksuffix="%",
                     zeroline=True, zerolinecolor=t["axis"])
    fig.update_yaxes(title=dict(text="Rent burden %", font=dict(size=11)), ticksuffix="%", showgrid=True)
    return fig


def _label_positions(df: pd.DataFrame, xcol: str, ycol: str) -> dict[str, str]:
    """Greedy label placement: alternate above/below/right/left when a neighbour is close."""
    if df.empty:
        return {}
    xr = (df[xcol].max() - df[xcol].min()) or 1
    yr = (df[ycol].max() - df[ycol].min()) or 1
    order = ["top center", "bottom center", "middle right", "middle left"]
    placed: list[tuple[float, float, str]] = []
    out: dict[str, str] = {}
    for r in df.sort_values(ycol, ascending=False).itertuples():
        x, y = getattr(r, xcol), getattr(r, ycol)
        near = [p for p in placed if abs(p[0] - x) / xr < 0.12 and abs(p[1] - y) / yr < 0.12]
        used = {p[2] for p in near}
        pos = next((o for o in order if o not in used), "top center")
        out[r.city] = pos
        placed.append((x, y, pos))
    return out


def pressure_lines(df: pd.DataFrame, slots: dict, theme: str) -> go.Figure:
    if df.empty:
        return empty_figure(theme, "No market-pressure data for this selection")
    t = tokens(theme)
    df = df.copy()
    df["period_date"] = pd.to_datetime(df["period_date"])
    fig = go.Figure()
    for city, g in df.groupby("city", sort=False):
        name = g["city_en"].iloc[0]
        fig.add_trace(
            go.Scatter(
                x=g["period_date"], y=g["time_on_market_days_4q"], name=name, mode="lines+markers",
                line=dict(color=_city_color(city, slots, theme) or t["context"], width=2),
                marker=dict(size=5),
                customdata=(100 * g[["share_closed_within_week_4q"]]).to_numpy(),
                hovertemplate=f"<b>{name}</b> %{{y:.0f}} days · %{{customdata[0]:.0f}}% gone in a week<extra></extra>",
            )
        )
    fig.update_layout(**base_layout(theme, hovermode="x unified", showlegend=True, margin=dict(l=40, r=12, t=28, b=36)))
    fig.update_yaxes(ticksuffix=" d", showgrid=True, rangemode="tozero")
    return fig


# ---------------------------------------------------------------- map tab
def choropleth(df: pd.DataFrame, geojson: dict, metric: str, selected: str | None, theme: str) -> go.Figure:
    t = tokens(theme)
    if metric == "afford":
        z = df["affordability_index"]
        lo, hi = 50, 150  # symmetric around 100 so the grey midpoint means "median"
        cs, zmid, suffix, fmt = colorscale(t["div"]), 100, "", ".0f"
        bar_title = "Index"
    elif metric == "sd":
        z = df["supply_demand_index"]
        lo, hi = -3, 3  # red = tight (demand outpaces supply), blue = slack
        cs, zmid, suffix, fmt = colorscale(t["div"][::-1]), 0, "", "+.2f"
        bar_title = "Tightness"
    else:
        z = df["rent_eur_sqm"] if metric == "rent" else df["estimated_asking_rent_eur_sqm"]
        lo, hi = float(z.quantile(0.02)), float(z.quantile(0.98))
        cs, zmid, suffix, fmt = colorscale(t["seq"]), None, " €", ".2f"
        bar_title = "€/m²"
    custom = df[["kreis_name", "land_name", "rent_eur_sqm", "affordability_index", "rent_burden_pct"]].to_numpy()
    fig = go.Figure(
        go.Choropleth(
            geojson=geojson,
            locations=df["ags"],
            z=z,
            zmin=lo,
            zmax=hi,
            zmid=zmid,
            colorscale=cs,
            marker=dict(line=dict(color=t["surface"], width=0.5)),
            colorbar=dict(title=dict(text=bar_title, font=dict(size=11, color=t["text_2"])), thickness=10,
                          len=0.6, ticksuffix=suffix, tickfont=dict(color=t["text_2"], size=10),
                          outlinewidth=0),
            customdata=custom,
            hovertemplate="<b>%{customdata[0]}</b><br>%{customdata[1]}<br>"
            f"Value %{{z:{fmt}}}{suffix}<br>Zensus rent %{{customdata[2]:.2f}} €/m²<br>"
            "Affordability %{customdata[3]:.0f} · burden %{customdata[4]:.1f}%<extra></extra>",
        )
    )
    if selected and selected in set(df["ags"]):
        fig.add_trace(
            go.Choropleth(
                geojson=geojson, locations=[selected], z=[0], showscale=False,
                colorscale=[[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]],
                marker=dict(line=dict(color=t["text"], width=2)), hoverinfo="skip",
            )
        )
    fig.update_geos(fitbounds="locations", visible=False, bgcolor=t["surface"], projection_type="mercator")
    fig.update_layout(**base_layout(theme, margin=dict(l=0, r=0, t=0, b=0), clickmode="event"))
    return fig


def kreis_rooms_bars(rooms: pd.DataFrame, theme: str, labels: list[str] | None = None) -> go.Figure:
    """Grouped bars per segment: Zensus 2022 rent vs. estimated asking rent, national mean as a tick.

    `rooms` is either the rooms breakdown (column `rooms`) or the floor-area breakdown with `labels`.
    """
    t = tokens(theme)
    if labels is None:
        r = rooms[rooms["rooms"] != "total"]  # API returns rows ordered by room count
        labels = [f"{x} room" + ("" if x == "1" else "s") for x in r["rooms"]]
    else:
        r = rooms
    fig = go.Figure()
    fig.add_trace(go.Bar(x=labels, y=r["rent_eur_sqm"], name="Zensus 2022 (existing contracts)",
                         marker=dict(color=t["series"][0], cornerradius=4),
                         hovertemplate="%{x}: %{y:.2f} €/m² (2022)<extra></extra>"))
    fig.add_trace(go.Bar(x=labels, y=r["estimated_asking_rent_eur_sqm"], name="Est. asking rent today",
                         marker=dict(color=t["series"][1], cornerradius=4),
                         hovertemplate="%{x}: %{y:.2f} €/m² (estimate)<extra></extra>"))
    fig.add_trace(go.Scatter(x=labels, y=r["national_mean_rent_eur_sqm"], mode="markers", name="National mean 2022",
                             marker=dict(symbol="line-ew", size=22, line=dict(color=t["text_2"], width=2)),
                             hovertemplate="%{x}: national mean %{y:.2f} €/m²<extra></extra>"))
    fig.update_layout(**base_layout(theme, barmode="group", bargap=0.35, bargroupgap=0.08, showlegend=True,
                                    margin=dict(l=40, r=8, t=36, b=36)))
    fig.update_yaxes(ticksuffix=" €", showgrid=True, rangemode="tozero")
    return fig


# ---------------------------------------------------------------- affordability + financing
def affordability_ranking(aff: pd.DataFrame, theme: str, n: int = 10) -> go.Figure:
    t = tokens(theme)
    worst = aff.nlargest(n, "rent_burden_pct")
    best = aff.nsmallest(n, "rent_burden_pct").iloc[::-1]
    df = pd.concat([best, worst.iloc[::-1]])
    df["label"] = df["kreis_name"].str.split(",").str[0]
    colors = [t["div"][-2]] * len(best) + [t["div"][1]] * len(worst)
    fig = go.Figure(
        go.Bar(
            x=df["rent_burden_pct"], y=df["label"], orientation="h",
            marker=dict(color=colors, cornerradius=4),
            text=[f"{v:.1f}%" for v in df["rent_burden_pct"]], textposition="outside",
            textfont=dict(color=t["text_2"], size=11), cliponaxis=False,
            customdata=df[["kreis_name", "rent_eur_sqm", "disposable_income_per_resident_eur", "land_name"]].to_numpy(),
            hovertemplate="<b>%{customdata[0]}</b> (%{customdata[3]})<br>Burden %{x:.1f}%<br>"
            "Rent %{customdata[1]:.2f} €/m² · income %{customdata[2]:,.0f} €<extra></extra>",
        )
    )
    med = aff["rent_burden_pct"].median()
    fig.add_vline(x=med, line=dict(color=t["axis"], dash="dot", width=1))
    fig.add_annotation(x=med, y=1.0, yref="paper", text=f"median {med:.1f}%", showarrow=False, yanchor="bottom",
                       font=dict(color=t["muted"], size=11))
    fig.update_layout(**base_layout(theme, margin=dict(l=8, r=40, t=20, b=36), bargap=0.3))
    fig.update_yaxes(automargin=True, tickfont=dict(size=11))
    fig.update_xaxes(ticksuffix="%", showgrid=True)
    return fig


def _single_line(x, y, theme: str, suffix: str, hover: str, color_slot: int = 0) -> go.Figure:
    t = tokens(theme)
    fig = go.Figure(go.Scatter(x=x, y=y, mode="lines", line=dict(color=t["series"][color_slot], width=2),
                               hovertemplate=hover + "<extra></extra>"))
    fig.add_trace(go.Scatter(x=[x.iloc[-1]], y=[y.iloc[-1]], mode="markers+text", text=[f"{y.iloc[-1]:,.2f}{suffix}"
                             if suffix.strip() == "%" else f"{y.iloc[-1]:,.0f}{suffix}"],
                             textposition="middle left", textfont=dict(color=t["text_2"], size=11),
                             marker=dict(color=t["series"][color_slot], size=8,
                                         line=dict(color=t["surface"], width=2)), hoverinfo="skip"))
    fig.update_layout(**base_layout(theme, hovermode="x"))
    fig.update_yaxes(ticksuffix=suffix, showgrid=True)
    fig.update_xaxes(showspikes=True, spikecolor=t["axis"], spikethickness=1)
    return fig


def mortgage_rate_line(df: pd.DataFrame, theme: str) -> go.Figure:
    df = df.assign(period_date=pd.to_datetime(df["period_date"]))
    return _single_line(df["period_date"], df["rate_pct"], theme, "%", "%{x|%b %Y}: %{y:.2f}%")


def mortgage_payment_line(df: pd.DataFrame, theme: str) -> go.Figure:
    df = df.assign(period_date=pd.to_datetime(df["period_date"]))
    return _single_line(df["period_date"], df["monthly_payment_reference_loan_eur"], theme, " €",
                        "%{x|%b %Y}: %{y:,.0f} €/month", color_slot=1)
