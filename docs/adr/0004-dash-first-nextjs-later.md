# 0004 – Plotly Dash first, Next.js later, with the API as the contract

**Status:** accepted · 2026-10

## Decision
The Phase 1 dashboard is Plotly Dash. It talks **only** to the FastAPI layer, never to the warehouse,
so the planned Next.js frontend can reuse the same typed endpoints without backend changes.

Dashboard conventions:
- A validated categorical palette, with colour assigned to a city (the slot store) rather than to its
  rank.
- Single-hue sequential and blue/red diverging scales with a grey midpoint at index 100.
- Light and dark themes are built from the same tokens.
- Plotly base-map topojson is served from `/assets` so the choropleth works offline and under strict
  CSPs.
