# Handoff: saijeIQ — Agent Operations Dashboard

## Overview
`saijeIQ` is a personal chief-of-staff AI operating system. This handoff covers the **Overview / Command dashboard** — a full-screen, always-on dashboard meant to live on a dedicated monitor. It surfaces the agent fleet, today's progress, current focus, system health, live activity, and the upcoming queue at a glance.

The defining hero element is an **Agent Orb Field**: each agent is represented as a softly drifting orb whose glow encodes status (working / queued / blocked / offline), with constellation lines drawn between nearby orbs and a faint particle field behind them.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look, structure, and motion. They are not production code to lift directly.

Your task is to **recreate this design in the saijeIQ codebase's existing environment** (React/Next/Tailwind, Vue, SwiftUI — whatever the team uses) using its established patterns, components, and design tokens. If the project has no frontend yet, pick the most appropriate framework for the team and implement there. Treat the HTML as the visual + behavioral spec.

Anywhere the prototype hard-codes static data (agents, activity entries, goals, etc.), wire it to the real data source.

## Fidelity
**High-fidelity (hifi).** Exact colors, typography, spacing, motion, and interactions are specified. Reproduce pixel-faithfully using the codebase's existing component primitives — don't reinvent buttons / cards / etc. if there's already a library in place.

---

## Screens / Views

There is one screen in this handoff: **Overview Dashboard**.

### Layout
- Two-column page: fixed **sidebar 232 px** + flexible **main**.
- Main column = top bar (60 px) + scrollable content area.
- Content area max width is fluid; designed against 1920×1080 minimum.
- Page background is `#0a0d1a` with two large ambient radial glows (blue top-left, teal bottom-right) layered as a fixed `::before` pseudo-element behind everything.

### Top-level regions (top → bottom inside `main > content`)
1. **Hero — Agent Orb Field** (height 280 px, radius 16 px)
2. **Stat row** (4 cards, 1fr grid, gap 14 px)
3. **Two-column grid** — left ≈ 1.85fr, right ≈ 1fr, gap 18 px
   - Left column: Current Focus → Today's Progress → Live Activity Feed
   - Right column: System Health → Quick Actions → Upcoming Queue

---

### 1. Sidebar

- Background `#0e1220`, 1 px right border `rgba(255,255,255,0.08)`, top-to-bottom soft blue tint overlay.
- Brand at top: **icon + wordmark** (see Branding section below).
- Three nav sections with uppercase 10 px / 1.2 px tracked labels in `#4a5170`:
  - **(unlabeled top)** — Overview · Agents (badge "7") · Tasks · Activity
  - **Operations** — Comms · Approvals (amber dot) · Workflows · Strategy · Analytics · Meta Ads
  - **Intelligence** — Knowledge Base · Experiments · Skills
- Bottom: Settings · Logout (pushed to bottom with `margin-top: auto`).
- **Nav item**: 9×10 px padding, 8 px radius, 13 px text, `#6b7494` default, `#e8eaf2` on hover.
- **Active state**: blue tinted gradient background `linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,0.04))`, 1 px `rgba(59,130,246,0.25)` border, and a **3×16 px blue bar accent** glowing on the left edge (`box-shadow: 0 0 8px #3B82F6`).
- Icons: 16×16, 1.8 stroke, inherit color from text. Use existing icon library — these are lucide-style.

### 2. Top Bar

- Height 60 px, border-bottom `rgba(255,255,255,0.08)`, background `rgba(10,13,26,0.6)` + `backdrop-filter: blur(20px)`, z-index above content.
- Left → right:
  - **Breadcrumb**: `Workspace / Overview` — slash in `#4a5170`, current page `#e8eaf2`.
  - **Search**: 380 px max-width, 7×12 px padding, 1 px border `rgba(255,255,255,0.08)`, search icon 14 px, placeholder "Search agents, tasks, decisions…", trailing `⌘ K` chip in JetBrains Mono.
  - **Spacer**.
  - **Live pill**: green dot pulsing every 2 s, text "SYSTEMS NOMINAL", colors `#22c55e` on `rgba(34,197,94,0.18)`.
  - **Clock**: live HH:MM:SS · UTC offset, JetBrains Mono 12 px.
  - **Avatar**: 30 px circle, blue→teal gradient, initials inside dark text.

### 3. Hero — Agent Orb Field (the centerpiece)

A 280-px tall card containing **3 stacked layers**:

| Layer | Element | Purpose |
| --- | --- | --- |
| 0 | Card surface + ambient radial gradient | Visual ground |
| 1 | `<canvas id="constellation">` | Particles + lines between orbs |
| 2 | `.orb-layer` containing absolutely positioned orb elements | Orbs + tooltips |

**Header (absolutely positioned, top: 18 px / left+right 22 px)**
- Title: `Agent Fleet` (16 px / 600), followed by mono `<count> of 7 active · uplink stable` — the `<count>` is the live count of working agents in `#22c55e`.
- Actions (right): `Snapshot` (ghost button) and `Deploy Agent` (primary tinted blue button).

**Orbs**
- 7 orbs positioned at `{x%, y%, size px}`:
  ```
  [ {14, 60, 72}, {26, 35, 60}, {40, 68, 78}, {52, 42, 64},
    {64, 70, 56}, {76, 38, 62}, {88, 64, 58} ]
  ```
- Each orb is a `div` whose `transform` is animated by a **unique `drift{i}` keyframe** generated at runtime — random duration 8 – 15 s, random delay 0 – 10 s, random translate offsets 8 – 18 px. Direction alternates infinitely.
- Inside the orb:
  - `.orb-ring` — outer ring at `inset: -5px`, 1.5 px border.
  - `.orb-core` — main filled circle, JetBrains Mono 11 px / 600, holds the 3-letter agent code.
  - `.orb-tooltip` — hidden by default, shown on hover (positioned above orb, arrow pointing down). Shows `<name>` + ` · <role>` (muted), task in mono, and a status pill.
- **State styling** (set via `s-working` / `s-queued` / `s-blocked` / `s-offline` classes on the orb root):
  | State | Color | Effects |
  | --- | --- | --- |
  | working | `#22c55e` | Radial green gradient fill, green ring, 2.6 s `orbPulse` (box-shadow + inset glow swelling) |
  | queued | `#f59e0b` | Amber gradient fill, dashed ring spinning 8 s |
  | blocked | `#ef4444` | Red gradient fill, 1.6 s `orbBlocked` pulse (faster, more urgent) |
  | offline | `#6b7494` | 32 % opacity, gray gradient, static |
- Hover: `transform: scale(1.12) !important`, z-index raised, tooltip slides into view with 200 ms ease.

**Constellation canvas**
- Drawn at device pixel ratio for crispness.
- Two systems run inside one `requestAnimationFrame` loop:
  1. **Particles**: count = `floor(W * H / 9000)`, random pos/velocity (±0.15 px/frame) and radius 0.4 – 1.6 px, alternating purple and teal hue, opacity oscillates with `sin(time + pos)`. Wrap at edges.
  2. **Orb-to-orb lines**: every frame, read orb element centers (relative to canvas rect — important, because orbs drift via CSS transform). For each pair within 180 px draw a 1 px line with a linear gradient. Lines between two active orbs use blue→teal at higher alpha; otherwise blue→blue at lower alpha.
- On `resize` re-seed particles.

### 4. Stat Row

Four glass-morphism tiles in a 4-column grid.

| Card | Variant | Label | Value | Delta | Spark color |
| --- | --- | --- | --- | --- | --- |
| Agents Online | `v-green` | AGENTS ONLINE | `3 / 7` | ▲ 1 since last hour | `#22c55e` |
| Tasks Today | `v-purple` (blue) | TASKS TODAY | `48 / 64` | ▲ 12 vs yesterday | `#3B82F6` |
| Approvals | `v-amber` | APPROVALS | `4` | ● Awaiting · oldest 23m | `#f59e0b` |
| Blocked | `v-red` | BLOCKED | `1` | ▼ 2 resolved overnight | `#ef4444` |

Per-card spec:
- `padding: 16 18`, radius 12, border 1 px `rgba(255,255,255,0.08)`, bg `rgba(255,255,255,0.035)`, `backdrop-filter: blur(8)`.
- Top-left to bottom-right gradient overlay tinted to the variant's accent color at 12 % alpha.
- **Icon chip** top-right: 30 px square, 8 px radius, tinted bg + bordered, 14 px icon in accent color.
- **Label**: 10 px / 500 / uppercase / 1.4 px tracking / `#6b7494`.
- **Value**: 30 px / 600 / `-1px` tracking, with optional small `/ N` suffix at 16 px in `#6b7494`.
- **Delta**: 11 px, ▲ ▼ ● glyphs in the appropriate green/red/amber.
- **Sparkline**: 70×22 px SVG bottom-right, 1.5 px stroke in accent + matching gradient fill at 30 % opacity.
- Hover: border lifts to `rgba(255,255,255,0.14)`, `translateY(-1px)`.
- **Count-up animation** on load: cubic ease-out, 1200 ms.

### 5. Current Focus card

Two-column grid (1.5fr / 1fr):
- **Left**: amber pill label `BOTTLENECK · THIS WEEK` (alert icon), 19 px / 500 headline, 12 px muted subhead, primary blue CTA "Route to legal review →".
- **Right** "Active Goals" list — 4 rows, each: monospace 2-digit index in dim, goal name, 4 px tall progress bar with blue→teal gradient fill + glow, mono percentage right-aligned.

Sample copy:
- Headline: "Q3 campaign launch is gated on legal review of three creative variants."
- Sub: "Mira flagged this 2h ago — copy edits queued, but the Meta Ads workflow can't ship until counsel signs off. Approve or delegate from the queue."
- Goals: `01 Ship Q3 brand refresh — 72%`, `02 Cut weekly meeting load — 48%`, `03 Inbox below 25 by Friday — 91%`, `04 Hire principal engineer — 35%`.

### 6. Today's Progress card

Two-column grid (160 px / 1fr):
- **Left**: 140 px SVG progress ring.
  - Background ring: stroke `rgba(255,255,255,0.06)`, 10 px wide.
  - Foreground ring: stroke = linear gradient `#3B82F6 → #2dd4bf`, 10 px, `stroke-linecap: round`, drop-shadow blue glow. Animated `stroke-dashoffset` over 1200 ms cubic-ease-out.
  - Center: `XX` (26 px / 600 / -1px tracking) + small `%`, then 9.5 px uppercase label "COMPLETED".
- **Right**: 5 stat rows separated by 1 px hairlines: Completed 48 / In progress 11 / Queued 4 / Blocked 1 / Avg. cycle time 14m 22s. Each row has a tinted dot in front of the label.

Target percentage: **75 %**.

### 7. Live Activity Feed card

- Min-height 360 px, internal scroll capped at 360 px.
- **Header**: green dot title "Live Activity Feed", right side "Last 24h · streaming" with `streaming` in teal.
- **Row layout**: grid `70px / 90px / 1fr`, items: 11 px padding, hairline bottom border, hover background.
  - `act-time`: JetBrains Mono 10.5 px in dim.
  - `act-agent`: mono 10 px in tinted pill (blue default; teal/amber/red/green variants per agent).
  - `act-text`: JetBrains Mono 11.5 px / 1.5 line-height. Inline spans: `.hl` teal · `.dim` muted · `.num` blue.
- **Seeded items** (12 entries): see prototype `ACTIVITIES` constant.
- **Live streaming**: every 18 s prepend a new entry from a small rotating set, animate in with `slideUp` (translateY 10 → 0, opacity 0 → 1, cubic 0.34 1.56 0.64 1, 400 ms). Trim list at 18 items.

### 8. System Health card

Seven horizontal rows, each:
- Status dot (7 px circle with glow) → name (120 px) → 3 px progress bar → mono % right-aligned (36 px).
- States: `s-ok` green, `s-warn` amber, `s-down` red, `s-idle` gray (value displays "idle").

Data: Comms 98 %, Workflows 94 %, Knowledge Base 72 % (warn), Approvals 91 %, Strategy 88 %, Meta Ads 64 % (warn), Experiments idle.

### 9. Quick Actions card

2×3 grid of buttons. Each button: bg `rgba(255,255,255,0.025)`, 1 px border, 10 px radius, 12 px padding, gap 8 px column. Inside: 28 px tinted icon chip + 12 px / 500 label. Hover: lifts 1 px + applies a faint variant gradient.

Actions: **New Task** (blue) · **Message Agent** (teal) · **View Approvals** (amber) · **Run Workflow** (blue) · **Ask Brain** (teal) · **Halt Fleet** (red).

### 10. Upcoming Queue card

3 rows, hairline-separated:
- Priority chip (`p-1` red, `p-2` amber, `p-3` blue), then title (12.5 px, ellipsised), then mono meta "AGENT_CODE · due TIME · est. DURATION".
- Header right: "Next 3 of 11".

Sample data:
- P1 — Counter-offer for Atlas Labs partnership — MIRA · due 14:30 · est. 22m
- P2 — Compile weekly investor update draft — ORI · due 16:00 · est. 41m
- P3 — Refresh competitive intel on tier-2 vendors — SCOUT · due Wed 09:00 · est. 1h 10m

---

## Interactions & Behavior

- **Clock** ticks every second, format `HH:MM:SS · UTC−4`.
- **Count-up** animation for the four stat values on mount.
- **Progress ring** animates `stroke-dashoffset` from full (314.16) to target on mount; the percentage label tweens with cubic ease-out (1300 ms).
- **Orb drift**: each orb has its own injected `@keyframes drift{i}` with randomized magnitudes 8 – 18 px and duration 8 – 15 s. Alternate infinite.
- **Orb pulse**: `orbPulse` (2.6 s, working state) and `orbBlocked` (1.6 s, blocked state) animate `box-shadow` swell.
- **Orb hover**: scale 1.12, tooltip slides in from 4 px below → -12 px above the orb (200 ms).
- **Constellation** redraws every frame via `requestAnimationFrame`.
- **Live activity** new-row arrival every 18 s, animated with `slideUp` keyframe.
- **All transitions** default 200 – 300 ms ease unless specified.

## State Management

The prototype hard-codes the data — in production each piece should be reactive:

- `agents`: array of `{ code, name, role, status, task }`. The hero count and orb states should bind directly to this.
- `stats`: `{ agentsOnline, agentsTotal, tasksToday, tasksTotalToday, approvalsPending, oldestApprovalAgeMin, blocked, blockedDeltaResolved }`.
- `currentFocus`: `{ headline, sub, ctaLabel, ctaHref, flaggedBy, flaggedAgo }`.
- `goals`: array of `{ id, name, pct }`.
- `progress`: `{ pct, completed, inProgress, queued, blocked, avgCycleSec }`.
- `activityFeed`: append-only log of `{ ts, agentCode, tone, text }`.
- `health`: array of `{ subsystem, status, value }`.
- `queue`: array of `{ priority, title, agentCode, dueAt, estimateMin }`.
- WebSocket / SSE recommended for the activity feed and orb state updates; everything else can poll every 30 – 60 s.

## Design Tokens

### Colors
| Token | Hex | Notes |
| --- | --- | --- |
| `bg` | `#0a0d1a` | Page background |
| `bg-elev` | `#0e1220` | Sidebar |
| `bg-card` | `rgba(255,255,255,0.035)` | Default card surface |
| `bg-card-strong` | `rgba(255,255,255,0.05)` | Emphasis surface |
| `border` | `rgba(255,255,255,0.08)` | Default 1 px border |
| `border-strong` | `rgba(255,255,255,0.14)` | Hover / focus |
| `text` | `#e8eaf2` | Primary text |
| `text-muted` | `#6b7494` | Secondary text |
| `text-dim` | `#4a5170` | Tertiary / labels |
| **Signal Blue** | `#3B82F6` | **Brand accent — used wherever the prototype uses `--purple`** |
| Teal | `#2dd4bf` | Secondary accent (links, streaming, gradients) |
| Green | `#22c55e` | Healthy / online |
| Amber | `#f59e0b` | Warning / queued |
| Red | `#ef4444` | Danger / blocked |

> Per the brand guide, **only Signal Blue (#3B82F6)** is the brand accent. Teal/green/amber/red are functional status colors. The wordmark's `ai` and `IQ` characters must remain Signal Blue.

### Spacing
- Card padding: 18 × 20
- Grid gap (column): 18
- Stat row gap: 14
- Section vertical rhythm: 22

### Border radius
- Cards: 14
- Hero: 16
- Stat cards: 12
- Buttons / pills: 7 – 10
- Chips / badges: 4 – 6
- Status dots / orbs: 50 %

### Typography
- Family: **Inter** (300 / 400 / 500 / 600 / 700) — Google Fonts
- Mono: **JetBrains Mono** (400 / 500) — used for clock, agent codes, timestamps, metrics, activity log text
- Antialiasing: `-webkit-font-smoothing: antialiased`
- Letter-spacing: tight for numerals (-0.3 to -1 px), 1.2 – 1.4 px tracking for uppercase labels

### Shadows / glows
- Live pill dot: `0 0 8px <accent>`
- Active nav indicator: `0 0 8px #3B82F6`
- Orb working: `0 0 20px rgba(34,197,94,0.35), inset 0 0 12px rgba(34,197,94,0.18)` → swells to `0 0 32px / inset 0 0 16px` at midpoint
- Progress ring: `filter: drop-shadow(0 0 6px rgba(59,130,246,0.5))`
- Tooltip card: `0 12px 32px rgba(0,0,0,0.6)`

### Z-index
- Page ambient bg: 0
- App content: 1
- Sidebar / topbar: 1 / 5
- Constellation canvas: 1 inside hero
- Orb layer: 2
- Active orb on hover: 10
- Tooltip: 20

---

## Branding

The brand assets live under `brand/`. See `brand/BRAND_README.md` and `brand/brand-guide.html` for the canonical spec. Summary:

- **Wordmark** is built from spans, not a single text run, because two characters carry different weights:
  - `S` — Inter 300
  - `ai` — Inter 900, color `#3B82F6` — load-bearing brand emphasis
  - `je` — Inter 300
  - `IQ` — Inter 600, color `#3B82F6`, superscript (≈ 55 % of cap height, baseline-aligned to top)
  - Letter-spacing: -0.025em
- **Mark** is the Neural Node glyph: 4 white outer nodes at the corners of a rectangle, all connecting through a central Signal Blue node. Rendered inline as SVG so it inherits color for monochrome contexts; use `brand/saijeiq-mark.svg` (on dark) or `saijeiq-mark-onlight.svg` (on light).
- Do **not** recolor `ai` or `IQ`. Do **not** add gradients/glows/strokes to the wordmark. Do **not** put the mark to the right of the wordmark.
- Favicon: `brand/favicon.svg`.

---

## Assets included

```
design_handoff_saijeIQ_dashboard/
├─ README.md                       ← this file
├─ saijeIQ Dashboard.html          ← the design reference (open in any browser)
└─ brand/
   ├─ BRAND_README.md
   ├─ brand-guide.html
   ├─ favicon.svg
   ├─ saijeiq-logo-onDark.svg
   ├─ saijeiq-logo-onLight.svg
   ├─ saijeiq-logo-mono-white.svg
   ├─ saijeiq-logo-mono-black.svg
   ├─ saijeiq-mark.svg
   ├─ saijeiq-mark-onlight.svg
   └─ saijeiq-mark-mono.svg
```

The dashboard HTML is **self-contained** — all CSS and JS are inline; the only external dependency is the Google Fonts CSS for Inter + JetBrains Mono. The orb-field constellation runs on Canvas 2D, no WebGL.

## Implementation notes for the developer

- Treat the orb field as its own component (`<AgentFleetCanvas agents={...} />`). The drift keyframes are generated per orb at mount — in React this is a `useMemo` over the agent list, returning an array of `{ position, durationSec, delaySec, dx, dy }`. Render the keyframes once via a `<style>` tag injected by the component, or skip CSS keyframes entirely and animate via `requestAnimationFrame` if the team prefers JS-driven motion.
- The constellation canvas reads orb element centers each frame via `getBoundingClientRect` — fine for 7 orbs, but if the fleet grows beyond ~30 cache positions per frame from the same JS-driven motion source instead of probing the DOM.
- Replace placeholder data and copy with bindings to the real agent / task / approval / health subsystems. Headlines (e.g. Current Focus) should come from whatever your bottleneck-detection service exposes; if none exists, the empty state in the prototype is intentionally elegant — keep it.
- Accessibility: orbs need keyboard focusability + a non-hover way to reveal status (the tooltip is currently hover-only). Recommend tab focus → show tooltip via `:focus-visible`, and a screen-reader-only list of agents.
- Make sure the live pill, clock, and activity feed pause/handle properly when the tab is backgrounded (use `document.visibilitychange`).
- The dashboard is target-sized for 1920×1080. Below 1280 px wide the two-column grid should collapse to a single column; below 900 the orb field should be replaced with a compact agent strip (out of scope here — confirm with design before implementing).
