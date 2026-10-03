---
name: ImmoDash
description: German rents, explained. An editorial data guide built from open data.
colors:
  bg: "#f6f6f7"
  surface: "#fdfdfd"
  surface-2: "#eeeef0"
  ink: "#18181b"
  ink-2: "#4a4a52"
  muted: "#66666f"
  line: "#e2e2e6"
  accent: "#2563c9"
  good: "#0b7a32"
  warn: "#9a5b00"
  bad: "#c03030"
  series-1: "#2a78d6"
  series-2: "#eb6834"
  series-3: "#1baf7a"
  series-4: "#eda100"
  diverging-neg: "#d03b3b"
  diverging-mid: "#ececee"
  diverging-pos: "#1c5cab"
  seq-1: "#cde2fb"
  seq-3: "#5598e7"
  seq-5: "#0d366b"
  dark-bg: "#0f1012"
  dark-surface: "#17181b"
  dark-ink: "#ededef"
  dark-accent: "#5b93ea"
typography:
  display:
    fontFamily: "Geist, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 56px)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(26px, 3vw, 38px)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(17px, 1.6vw, 20px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12.5px"
rounded:
  field: "10px"
  box: "16px"
  pill: "999px"
spacing:
  gutter: "24px"
  section: "88px"
  wide: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.box}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
---

# Design System: ImmoDash

## Overview

**Creative North Star: "The data desk's explainer"**

ImmoDash reads like a well-edited newspaper data page about housing: a calm cool-grey ground, one cobalt accent, and charts that do the visual work. Every section asks a reader's question in a plain headline, answers it with a number, and explains the number beside it. The data is the imagery; there are no stock photos and no decoration.

Density is moderate. Prose sits in a 65 character measure, charts break out to the full 1200 px container, and key figures are set as ruled sentences rather than dashboard tiles. Light and dark themes follow the system preference, with a manual toggle.

**Key Characteristics:**
- One typeface (Geist) for everything, Geist Mono only for code-like labels and measurement scales.
- One accent (cobalt) for links, focus and primary emphasis; data colours are a separate validated palette.
- Sections alternate between stacked heads with full-width figures, text beside a chart, and tinted bands.
- Explanations live in place: glossary terms, "How to read this chart", "Show the numbers".

## Colors

Cool zinc neutrals with a single cobalt accent; chart colours come from a validated categorical, diverging and sequential set.

### Primary
- **Cobalt** (#2563c9, dark #5b93ea): links on hover, focus rings, the glossary underline, the "What this means" label, range sliders. Used sparingly.

### Neutral
- **Ground** (#f6f6f7 / #0f1012): page background.
- **Surface** (#fdfdfd / #17181b): panels, widgets, inputs.
- **Band** (#eeeef0 / #1f2024): tinted sections for key figures and tables.
- **Ink** (#18181b / #ededef), **Ink 2** (#4a4a52 / #b4b4bb), **Muted** (#66666f / #8b8b94): text levels. All pass 4.5:1 on every surface.
- **Line** (#e2e2e6 / #2a2b30): hairlines and table rules.

### Data
- **Series** 1 to 6 (#2a78d6, #eb6834, #1baf7a, #eda100, #e87ba4, #008300): cities in charts, assigned in fixed order and kept per city.
- **Diverging** (#d03b3b, #ececee, #1c5cab): tight versus slack, expensive versus affordable.
- **Sequential** (#cde2fb to #0d366b): rent levels on maps and grids.
- **Status** (good #0b7a32, warn #9a5b00, bad #c03030): affordability verdicts only.

### Named Rules
**The One Accent Rule.** Cobalt is the only interface accent. Data colours never style controls, and status colours never mark chart series.

## Typography

**Display, body and label font:** Geist (self-hosted via the `geist` package)
**Mono:** Geist Mono, for formulas, step numbers, pipeline tags and meter scales only.

**Character:** A neutral, precise grotesque that keeps numbers legible and lets the data carry the voice.

### Hierarchy
- **Display** (650, clamp 34 to 56 px, 1.04, -0.035em): page titles, two lines at most.
- **Headline** (650, clamp 26 to 38 px, 1.1, -0.03em): one per section, phrased as the reader's question or the answer.
- **Lead** (400, 17 to 20 px, 1.55): the one-paragraph answer under a headline, max 56ch.
- **Body** (400, 17 px, 1.7): explanations, max 65ch.
- **Figure title** (600, 16 px) and **figure sub** (400, 14 px, muted).
- **Label** (500, 13 px): form labels, legends, metadata. Sentence case, no uppercase eyebrows.

### Named Rules
**The No Eyebrow Rule.** No small uppercase labels above headings. The heading carries its own weight.

## Layout

A 1200 px container with 24 px gutters (18 px under 480 px). Sections have 88 px top padding. Layout families: split hero (7:5, text and live map), ruled fact list in a tinted band, stacked head with a full-width figure, text-beside-chart splits (5:7 and 7:5, the text column sticks while the chart scrolls), and a ruled link list. Every split collapses to one column under 920 px.

## Elevation & Depth

Hybrid. Surfaces are flat; interactive widgets and panels use one soft, offset shadow (`0 1px 2px` plus `0 12px 32px -16px`, tinted toward ink). Elevation is declared once: shadow, never shadow plus border.

### Named Rules
**The Single Elevation Rule.** A container has either a shadow or a hairline, never both.

## Shapes

Three radii only: 10 px for inputs and tooltips, 16 px for panels and cards, full pills for interactive controls (buttons, chips, segmented controls). Chart marks use 3 to 4 px rounded data ends.

## Components

### Buttons
- **Shape:** full pill.
- **Primary:** ink background, ground text, 12 px by 20 px; one per view.
- **Text link:** 600 weight with a Phosphor arrow; turns cobalt on hover.
- **Press:** scale 0.98 and 1 px down.

### Chips and segmented controls
- **Chips:** surface background, hairline border, ink-2 text; selected state has an ink border. 44 px tall on touch screens.
- **Segmented:** band-coloured track, selected segment lifts to surface with a small shadow.

### Panels
- **Corner Style:** 16 px. **Background:** surface. **Shadow:** the single soft shadow. **Padding:** 24 to 28 px.

### Inputs
- **Style:** surface background, hairline border, 10 px radius, 42 px tall (44 px on touch). Labels always above.
- **Focus:** 2 px cobalt outline with 2 px offset.

### Navigation
Sticky top bar on a blurred ground, brand mark plus wordmark left, six text links right with a pill highlight for the current page, theme toggle at the end. Under 920 px the links move into a menu.

### Rent check (signature component)
City, size and income controls; the monthly rent at 52 px; a verdict pill and a 0 to 100% meter with the 30% and 40% thresholds; a dot strip of the same flat in all 37 cities against the 30% budget line.

### Fact list
Key figures set as ruled rows: the number at 24 px, then a bold lead-in and one explanatory sentence.

## Do's and Don'ts

### Do:
- **Do** explain each number where it appears (glossary term, how-to-read note, numbers table).
- **Do** keep text generated from the data; never hard-code a figure in copy.
- **Do** use Phosphor icons for every glyph-like control.
- **Do** keep one authored motion moment: the hero map painting from the cheapest to the dearest district.

### Don't:
- **Don't** use em or en dashes in visible copy.
- **Don't** put eyebrows or section numbers above headings.
- **Don't** set key figures as big-number dashboard tiles.
- **Don't** add per-section entrance animations.
- **Don't** use stock imagery; the data visual is the image.
