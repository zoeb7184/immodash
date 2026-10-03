# 0006 – Grounded LLM market summaries

**Status:** accepted · 2026-10

## Decision
- The API assembles a facts object for each city from the gold and ml layers: level, momentum,
  rank, burden, days on market, vacancy, population growth, forecast range, rate and recent anomalies.
- With `GROQ_API_KEY` set, Groq (`openai/gpt-oss-120b`, falling back to `openai/gpt-oss-20b`) writes 90–130 words from those facts only.
- **Grounding check**: every number in the generated text must match a fact (±0.05 for values under
  100, ±0.6 % above). Any unmatched number causes the draft to be rejected, and a deterministic
  template summary is served instead. The response states which path produced it and lists any
  rejected numbers, and the dashboard shows the facts.
- Without a key the template is used, so the feature works offline and in CI.

## Consequences
The model can paraphrase and order the facts but cannot introduce figures. Causal claims are
discouraged by the prompt; the number check cannot catch them, so the prompt forbids them explicitly.
