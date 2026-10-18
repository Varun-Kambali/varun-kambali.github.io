# Design System Master File

> Page-specific rules go in `design-system/varun-kambali-portfolio/pages/[page-name].md` and take precedence over this file.
> The tokens live in `assets/css/tokens.css`. Build from them, never from ad-hoc values.

---

**Project:** Varun Kambali portfolio site
**Written:** 2026-10-18. Base style: Swiss Modernism 2.0 (grid, rational spacing), with subtle motion and standard density.
**Direction:** v2 (2026-10-18) is a "warm report": the evidence-map bones of v1, with warm paper tones, a display serif and a first-person voice. Where it departs from a stock Swiss palette, typeface or motion, the reason is given under each section.

---

## Direction: an eval report, not a landing page

The site reads like a clean engineering report about one engineer. Every claim carries an ID chip (`E3`, `K2`, `P1`) that matches the resume, numbers are set in monospace with tabular figures, and there is exactly one accent colour, used for links, selection and focus.

- **Calm and dense enough to scan.** Recruiters skim. Headings, IDs and numbers carry the page; body text stays short.
- **Evidence over decoration.** No hero illustrations, gradients, glow, stock icons or skill-level bars. The only graphics are the evidence-map connectors and the pipeline stage strips, and both carry meaning.
- **Honest states.** "In progress", "next", "planned" and "not run yet" look deliberate, not like errors.

## Color

One accent. Neutral greys carry the structure. Status colours appear only in status pills, and each pill also has a dot shape and a text label, so colour is never the only signal.

All text pairs below pass WCAG 2.2 AA (4.5:1 for text, 3:1 for UI boundaries), checked on 2026-10-18.

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Page | `--color-bg` | `#FBF7F0` | `#17130F` | Page background (warm paper / warm near-black) |
| Surface | `--color-surface` | `#FFFDF9` | `#211B16` | Cards, panels |
| Surface 2 | `--color-surface-2` | `#F3ECE1` | `#2A231D` | Table headers, code, stage boxes |
| Text | `--color-text` | `#1C1917` | `#F1EBE3` | Body and headings |
| Muted text | `--color-text-muted` | `#57534E` | `#B5AB9F` | Meta lines, captions, dimmed items |
| Border | `--color-border` | `#E5DCCF` | `#3A3129` | Dividers, card edges (decorative) |
| Strong border | `--color-border-strong` | `#8A7F72` | `#7E7366` | Edges of controls such as chips and buttons (≥3:1) |
| Accent (terracotta) | `--color-accent` | `#9A3412` | `#F4A47C` | Links, selected state, focus ring, connectors (6.8:1 / 9.2:1 on page) |
| Accent soft | `--color-accent-soft` | `#F7E3D7` | `#3B2418` | Background of selected or highlighted items |
| On accent | `--color-on-accent` | `#FFFFFF` | `#17130F` | Text on a solid accent fill |
| In progress | `--status-progress-fg` / `-bg` | `#8A4B08` / `#FBEFD5` | `#F4C873` / `#33270F` | Pill: half dot, In progress |
| Shipped | `--status-ok-fg` / `-bg` | `#14532D` / `#DCF2E3` | `#8FE0A8` / `#13291B` | Pill: filled dot, Shipped (green is reserved for this) |
| Planned | `--status-plan-fg` / `-bg` | `#44403C` / `#ECE6DC` | `#D6CEC4` / `#2E2721` | Pill: ring, Next or Planned |

**Why terracotta on warm paper (v2):** v2 aims for a look that feels natural and personal. A warm palette (terracotta on cream, green kept for success) adds warmth without losing the single-accent discipline of v1, whose cool blue read as a dashboard. All pairs were rechecked against WCAG AA on 2026-10-18; none fail.

**Theme:** light and dark both ship. The page follows `prefers-color-scheme` and a toggle overrides it (`data-theme="light|dark"` on `<html>`, remembered in `localStorage` when available).

## Typography

- **Display (h1, the headline, section headings):** Fraunces 500–600, optical size on. A warm, slightly soft serif: the human-warmth layer of a display serif + sans + mono stack.
- **Sans (body, UI, card titles):** IBM Plex Sans 400, 500, 600.
- **Mono (IDs, numbers, code, metrics):** IBM Plex Mono 400, 500.
- **Why:** Plex was drawn for technical documentation, and its mono pairs exactly with the sans. Inter is fine but generic, and it has no matching mono.
- **Loading:** Google Fonts with `display=swap` and `preconnect`. The system fallback stack keeps the layout stable if the fonts fail to load.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

| Token | Size / line height | Use |
|---|---|---|
| `--text-xs` | 12px / 1.4 | ID chips, pill labels |
| `--text-sm` | 14px / 1.5 | Meta lines, skill chips, captions |
| `--text-md` | 16px / 1.6 | Body (never smaller for paragraphs) |
| `--text-lg` | 18px / 1.5 | Lead paragraph, card titles |
| `--text-xl` | 22px / 1.3 | Section headings (h2) |
| `--text-2xl` | 28px / 1.2 | Name (h1) on phones |
| `--text-3xl` | 36px / 1.15 | Name (h1) on wide screens |
| `--text-display` | 32–52px fluid / 1.1 | The first-person headline in the hero |

Numbers use `font-variant-numeric: tabular-nums`. Line length stays at 60–75 characters (`max-width: 68ch` on prose).

## Spacing, radius, elevation

Spacing scale (standard density): `--space-xs` 4px, `--space-sm` 8px, `--space-md` 16px, `--space-lg` 24px, `--space-xl` 32px, `--space-2xl` 48px, `--space-3xl` 64px. Page gutter: 16px on phones, 32px from 768px.

- **Radius:** `--radius-sm` 4px (ID chips, stage boxes), `--radius-md` 12px (cards, panels), `--radius-pill` (skill chips, lens buttons, the now-building strip). v2 rounds the interactive pieces so they feel friendly, while ID chips stay square as the "report" detail.
- **Elevation:** borders, not shadows. `--shadow-focus` is the only shadow-like token. Cards do not lift on hover, because a lift on every card adds noise and shifts layout.

## Layout

- Content width `--content-max` 1120px, centred.
- **Evidence map:** from 960px, two columns: skills (about 1/3, sticky under the header) and evidence (about 2/3), with SVG connectors in the gutter between them. Below 960px, one column: skills as a wrapping chip list above the evidence, with no connectors, and a live count ("RAG: 2 resume lines, 1 project").
- Breakpoints checked: 375, 768, 1024, 1440. No horizontal page scroll at any width; wide tables scroll inside their own container.

## Components

### ID chip
Mono, `--text-xs`, 1px `--color-border-strong` edge, `--radius-sm`, padding 1px 6px. Text is the resume's line ID. When it is a link, it shows the accent and an underline on hover.

### Skill chip (toggle button)
`<button aria-pressed>` in the sans at `--text-sm`, 1px `--color-border-strong` edge, `--radius-sm`, min height 32px (44px on touch screens via `@media (pointer: coarse)`).
- **Pressed:** `--color-accent-soft` fill, `--color-accent` edge and text, and a leading `●` glyph, so the state shows without colour too.
- **Related (lit by a selected evidence item):** accent edge, no fill.
- **Dimmed (not related to the current selection):** text switches to `--color-text-muted` and the edge to `--color-border`. Never dim with opacity: 55% opacity drops body text to about 3.6:1, below AA.

### Evidence card
`<article>` on `--color-surface` with a 1px `--color-border` edge and `--radius-md`. Header row: ID chip, title (`--text-lg`, 600), meta line (role and dates, muted). Body: the resume line. Footer: metric list and skill tags.
- **Highlighted** (matches the selected skill): accent edge plus a 3px accent left rule drawn as `box-shadow: inset 3px 0 0`. **Dimmed:** muted text, no opacity change (same rule as chips). Below 960px, unrelated cards are hidden instead, so matches sit right under the chips.
- **Details:** a `<details>` disclosure ("How it works") holds the stage strip where there is one.

### Metric
The value in mono at 500 weight, then its label in muted sans. Numbers are copied exactly from the resume (`92%`, `500+`, `10M+`); never round or restate them.

### Status pill
`--text-xs`, `--radius-sm`, a CSS-drawn dot plus a label: filled for Shipped, half-filled for In progress, a ring for Next and Planned. Colours from the status tokens.

### Stage strip (pipeline diagram)
An `<ol>` of boxes on `--color-surface-2`, joined by `→` (CSS generated, hidden from screen readers). It wraps to a vertical list under 600px. A loop-back step (for example "repair → validate") is a final line of plain text starting "Loop:". Stage names come only from words on the resume.

### Project slot
A card with three labelled slots: **Repo**, **Demo**, **Headline eval**. An empty slot shows a muted "Not public yet" or "Not run yet", never a dummy number.

### Buttons and links
- Links: accent text, underline offset 3px. Underline always on in body text; on hover only in nav and chips.
- Button (theme toggle, "clear selection"): transparent, 1px `--color-border-strong` edge, `--radius-sm`, `--text-sm`.

### Hiring lens (v2)
A row labelled "Hiring for" of pill toggle buttons (RAG, Agents, Evals, Search, Data & cloud). Each lens is a named set of skills (`data-skills`), and selecting one lights up every card that uses any of them. Same pressed style as skill chips. Deep link: `?lens=rag`.

### Career timeline (v2)
An ordered list of roles on a thin rule with dots: date (mono), role (sans 600), note (muted). Each item is a toggle that lights up that role's cards and the union of their skills. Horizontal from 768px, vertical below. Deep link: `?role=role-searce`.

### Now-building strip (v2)
A pill-shaped strip under the hero: "Now building", the project ID chip and name, plus the latest commit message and its age when the repo is public. Written by the daily sync; the commit is fetched live. A small pulsing dot in the progress colour, which stops under reduced motion.

### Copy link (v2)
In the map's status bar, shown only while something is selected. Copies the current URL (which encodes the selection) and announces "Link copied".

### Focus
Every interactive element shows `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible`. Never remove an outline without a replacement.

## Motion (motion 3/10: subtle)

- Colour, opacity and border changes: `--duration-fast` 150ms, `--ease-out`.
- Connector lines draw in over `--duration-base` 220ms (`stroke-dashoffset`).
- No scroll reveals. **Why not GSAP:** it is a ~70 KB dependency for an effect that hides content until scrolled, and the brief asks for a light page.
- `@media (prefers-reduced-motion: reduce)`: every duration becomes 0, connectors appear without drawing, and smooth scrolling is off.

## Accessibility rules

- Semantic landmarks (`header`, `nav`, `main`, `footer`) and a "Skip to content" link as the first focusable element.
- All interaction works by keyboard: Tab to a chip, Enter or Space toggles it, Escape clears the selection.
- Selection changes are announced in an `aria-live="polite"` region.
- The page is fully readable without JavaScript. JavaScript only adds filtering, connectors and live project data.
- Decorative SVG gets `aria-hidden="true"`. Status never relies on colour alone.
- **Keep contrast measurable.** Automated checkers (axe) can't read a background under an overlay, a pseudo-element with a fill or icon-like text glyphs, and pa11y reports those as errors. So: connectors live only in the gutter between the columns, accent rules are inset box-shadows, status dots are drawn in CSS, and placeholders are words ("Not yet"), not a lone dash.
- Touch targets are at least 44×44px on coarse pointers.

## Anti-patterns (do not use)

- Skill percentage bars or star ratings (they claim precision nobody can measure).
- Invented or rounded numbers, client names, phone numbers.
- Emojis as icons, or Unicode symbols (◐ ○ ↺) as visible text. Use CSS shapes or inline SVG.
- Hover lifts, parallax, scroll-jacking, typewriter effects, auto-playing media.
- Content that is invisible until JavaScript or scrolling reveals it.
- More than one accent colour.

## Pre-delivery checklist

- [ ] Every colour and size comes from `assets/css/tokens.css`
- [ ] Text contrast at least 4.5:1, control edges at least 3:1, in both themes
- [ ] Visible focus on every interactive element; full keyboard path works
- [ ] `prefers-reduced-motion` respected
- [ ] Readable with JavaScript off
- [ ] No horizontal page scroll at 375, 768, 1024 and 1440px
- [ ] No emoji icons; `cursor: pointer` on clickable elements
- [ ] Every number matches the resume or a committed eval results file
