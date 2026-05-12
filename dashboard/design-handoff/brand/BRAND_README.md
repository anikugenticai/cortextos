# SaijeIQ — Brand Assets (Concept 01 · Neural Node)

## Files

| File | Use |
| --- | --- |
| `saijeiq-logo-onDark.svg` | Primary lockup, dark backgrounds |
| `saijeiq-logo-onLight.svg` | Primary lockup, light backgrounds |
| `saijeiq-logo-mono-white.svg` | Single-color lockup (white on photo, video, etc.) |
| `saijeiq-logo-mono-black.svg` | Single-color lockup (navy/black on light) |
| `saijeiq-mark.svg` | Icon only — white outline + blue node (on dark) |
| `saijeiq-mark-onlight.svg` | Icon only — navy outline + blue node (on light) |
| `saijeiq-mark-mono.svg` | Icon only — inherits `currentColor` for any host |
| `favicon.svg` | 48×48 rounded-square favicon, navy ground |
| `brand-guide.html` | Visual spec sheet — open in any browser |

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| Ink (Navy) | `#0B1A33` | Primary surface · type on light |
| Paper | `#F2F4F9` | Light surface |
| White | `#FFFFFF` | Type on dark |
| Signal Blue | `#3B82F6` | Accent — used on **ai** + **IQ** + node |

## Typography

- **Family:** Inter (Google Fonts — weights 300, 600, 900)
- **Wordmark size in lockup:** 56 px (icon = 56 px square)
- **Letter-spacing:** -0.025em (-1.4 px @ 56 px)
- **"S" + "je":** weight 300, base color
- **"ai":** weight 900, Signal Blue (#3B82F6) — load-bearing emphasis
- **"IQ":** weight 600, ~46% of cap height, Signal Blue, raised as superscript

## Production notes

The SVGs reference Inter via Google Fonts `@import` for live editing. **Before final production export (print, embedded in apps, used as image assets), convert text to outlines** in Figma / Illustrator / Inkscape so rendering is font-independent.

To outline in Figma: import the SVG → select the text node → right-click → **Outline Stroke** / **Flatten**.

## Clear space

Minimum clear space around the lockup = the height of the "S" cap (≈ 38 px at 56 px font-size, ≈ 0.7× the icon size). Don't crowd it.

## Minimum sizes

- Full lockup: 120 px wide (digital) · 30 mm wide (print)
- Mark only: 16 px (favicon at 16 px is acceptable; below that, simplify)

## Do not

- Don't recolor the **ai** or **IQ** anything other than Signal Blue
- Don't separate the wordmark — it reads as one word
- Don't change letter weights between **ai** and the surrounding letters — the contrast is the brand
- Don't add gradients, glows, drop shadows, or strokes to the wordmark
- Don't place the icon on the right of the wordmark
