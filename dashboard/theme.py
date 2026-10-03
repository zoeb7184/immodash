"""Design tokens and Plotly templates (light + dark), shared by every figure.

Palette: validated categorical order (blue, orange, aqua, yellow, magenta, green, violet, red),
single-hue blue sequential ramp, blue<->red diverging pair with a neutral grey midpoint.
"""

from __future__ import annotations

import plotly.graph_objects as go

TOKENS = {
    "light": {
        "surface": "#fcfcfb",
        "surface_2": "#f4f3f0",
        "text": "#0b0b0b",
        "text_2": "#52514e",
        "muted": "#8a8984",
        "grid": "#e6e5e1",
        "axis": "#c9c8c2",
        "context": "#c9c8c2",  # non-highlighted marks
        "series": ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
        "seq": ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
        "div": ["#d03b3b", "#e88a84", "#f3c5c0", "#f0efec", "#b7d3f6", "#5598e7", "#1c5cab"],
    },
    "dark": {
        "surface": "#1a1a19",
        "surface_2": "#242422",
        "text": "#ffffff",
        "text_2": "#c3c2b7",
        "muted": "#8f8e86",
        "grid": "#33332f",
        "axis": "#4a4a45",
        "context": "#4a4a45",
        "series": ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
        "seq": ["#0d366b", "#104281", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#b7d3f6"],
        "div": ["#e66767", "#a8504d", "#5e3a38", "#383835", "#2d4a73", "#3f78c4", "#86b6ef"],
    },
}

FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
MAX_SERIES = 6


def tokens(theme: str) -> dict:
    return TOKENS["dark" if theme == "dark" else "light"]


def colorscale(stops: list[str]) -> list[list]:
    n = len(stops) - 1
    return [[i / n, c] for i, c in enumerate(stops)]


def base_layout(theme: str, **overrides) -> dict:
    t = tokens(theme)
    layout = dict(
        font=dict(family=FONT, size=12, color=t["text_2"]),
        paper_bgcolor=t["surface"],
        plot_bgcolor=t["surface"],
        margin=dict(l=48, r=16, t=8, b=36),
        hoverlabel=dict(bgcolor=t["surface_2"], bordercolor=t["axis"], font=dict(color=t["text"], family=FONT)),
        xaxis=dict(gridcolor=t["grid"], linecolor=t["axis"], zeroline=False, tickcolor=t["axis"],
                   showgrid=False, ticks="outside"),
        yaxis=dict(gridcolor=t["grid"], linecolor=t["axis"], zeroline=False, showline=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.0, xanchor="left", x=0,
                    font=dict(color=t["text_2"]), bgcolor="rgba(0,0,0,0)"),
        showlegend=False,
    )
    layout.update(overrides)
    return layout


def empty_figure(theme: str, message: str) -> go.Figure:
    t = tokens(theme)
    fig = go.Figure()
    fig.update_layout(**base_layout(theme))
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    fig.add_annotation(text=message, showarrow=False, font=dict(color=t["muted"], size=13))
    return fig
