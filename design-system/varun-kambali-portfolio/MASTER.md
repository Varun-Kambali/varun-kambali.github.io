# Design System Master File

> Page-specific rules go in `design-system/varun-kambali-portfolio/pages/[page-name].md` and take precedence over this file.
> The tokens live in `assets/css/tokens.css`. Build from them, never from ad-hoc values.

---

**Project:** Varun Kambali portfolio site
**Written:** 2026-10-18. Base style: Swiss Modernism 2.0 (grid, rational spacing), with subtle motion and standard density.
**Direction:** an "eval report". Where it departs from a stock Swiss palette, typeface or motion, the reason is given under each section.

---

## Direction: an eval report, not a landing page

The site reads like a clean engineering report about one engineer. Every claim carries an ID chip (`E3`, `K2`, `P1`) that matches the resume, numbers are set in monospace with tabular figures, and there is exactly one accent colour, used for links, selection and focus.

- **Calm and dense enough to scan.** Recruiters skim. Headings, IDs and numbers carry the page; body text stays short.
- **Evidence over decoration.** No hero illustrations, gradients, glow, stock icons or skill-level bars. The only graphics are the evidence-map connectors and the pipeline stage strips, and both carry meaning.
- **Honest states.** "In progress", "next", "planned" and "not run yet" look deliberate, not like errors.

## Color

One accent. Neutral greys carry the structure. Status colours appear only in status pills, and each pill also has a glyph and a text label, so colour is never the only signal.

All text pairs below were checked against WCAG 2.2 AA (4.5:1 for text, 3:1 for UI boundaries) on 2026-10-18.

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Page | `--color-bg` | `#F6F7F9` | `#0E1116` | Page background |
| Surface | `--color-surface` | `#FFFFFF` | `#151A21` | Cards, panels |
| Surface 2 | `--color-surface-2` | `#EDF0F4` | `#1C232C` | Table headers, code, stage boxes |
| Text | `--color-text` | `#111827` | `#E7EAEE` | Body and headings (16.5:1 / 15.7:1 on page) |
| Muted text | `--color-text-muted` | `#4A5361` | `#A4ADB9` | Meta lines, captions (7.3:1 / 8.3:1) |
| Border | `--color-border` | `#D4D9E0` | `#2C3440` | Dividers, card edges (decorative) |
| Strong border | `--color-border-strong` | `#7D8796` | `#6B7685` | Edges of controls such as chips and buttons (3.4:1 / 4.1:1) |
| Accent | `--color-accent` | `#1F4ED8` | `#8AAEFF` | Links, selected state, focus ring, connectors (6.2:1 / 8.6:1) |
| Accent soft | `--color-accent-soft` | `#E3EAFE` | `#1B2A48` | Background of selected or highlighted items |
| On accent | `--color-on-accent` | `#FFFFFF` | `#0E1116` | Text on a solid accent fill |
| In progress | `--status-progress-fg` / `-bg` | `#8A4B08` / `#FDF1D8` | `#F4C873` / `#33270F` | Pill: ◐ In progress (6.1:1 / 9.3:1) |
| Shipped | `--status-ok-fg` / `-bg` | `#13612E` / `#DDF5E4` | `#8FE0A8` / `#122A1B` | Pill: ● Shipped (6.6:1 / 9.8:1) |
| Planned | `--status-plan-fg` / `-bg` | `#3B4554` / `#E6E9EE` | `#C9D1DC` / `#252D38` | Pill: ○ Next, ○ Planned (8.0:1 / 9.0:1) |

**Why not a stock blue-and-purple palette:** a purple accent next to a blue primary gives two competing accents, and a blue-on-blue foreground (`#1E40AF` body text) reads as a link everywhere. A report needs neutral ink with one accent.

**Theme:** light and dark both ship. The page follows `prefers-color-scheme` and a toggle overrides it (`data-theme="light|dark"` on `<html>`, remembered in `localStorage` when available).

## Typography

- **Sans (headings, body):** IBM Plex Sans 400, 500, 600.
- **Mono (IDs, numbers, code, metrics):** IBM Plex Mono 400, 500.
- **Why:** Plex was drawn for technical documentation, and its mono pairs exactly with the sans. Inter is fine but generic, and it has no matching mono.
- **Loading:** Google Fonts with `display=swap` and `preconnect`. The system fallback stack keeps the layout stable if the fonts fail to load.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
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

Numbers use `font-variant-numeric: tabular-nums`. Line length stays at 60–75 characters (`max-width: 68ch` on prose).

## Spacing, radius, elevation

Spacing scale (standard density): `--space-xs` 4px, `--space-sm` 8px, `--space-md` 16px, `--space-lg` 24px, `--space-xl` 32px, `--space-2xl` 48px, `--space-3xl` 64px. Page gutter: 16px on phones, 32px from 768px.

- **Radius:** `--radius-sm` 4px (chips, pills, stage boxes), `--radius-md` 8px (cards, panels). Small radii read as precise; 12–16px radii read as consumer app.
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
- **Dimmed (not related to the current selection):** 55% opacity, still focusable and readable.

### Evidence card
`<article>` on `--color-surface` with a 1px `--color-border` edge and `--radius-md`. Header row: ID chip, title (`--text-lg`, 600), meta line (role and dates, muted). Body: the resume line. Footer: metric list and skill tags.
- **Highlighted** (matches the selected skill): 2px `--color-accent` left rule plus an accent-soft header. **Dimmed:** 55% opacity.
- **Details:** a `<details>` disclosure ("How it works") holds the stage strip where there is one.

### Metric
The value in mono at 500 weight, then its label in muted sans. Numbers are copied exactly from the resume (`92%`, `500+`, `10M+`); never round or restate them.

### Status pill
`--text-xs`, `--radius-sm`, glyph plus label: `● Shipped`, `◐ In progress`, `○ Next`, `○ Planned`. Colours from the status tokens.

### Stage strip (pipeline diagram)
An `<ol>` of boxes on `--color-surface-2`, joined by `→` (CSS generated, hidden from screen readers). It wraps to a vertical list under 600px. A loop-back step (for example "repair → validate") is a final row with a `↺` glyph and plain text. Stage names come only from words on the resume.

### Project slot
A card with three labelled slots: **Repo**, **Demo**, **Headline eval**. An empty slot shows a muted "Not public yet" or "Not run yet", never a dummy number.

### Buttons and links
- Links: accent text, underline offset 3px. Underline always on in body text; on hover only in nav and chips.
- Button (theme toggle, "clear selection"): transparent, 1px `--color-border-strong` edge, `--radius-sm`, `--text-sm`.

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
- Touch targets are at least 44×44px on coarse pointers.

## Anti-patterns (do not use)

- Skill percentage bars or star ratings (they claim precision nobody can measure).
- Invented or rounded numbers, client names, phone numbers.
- Emojis as icons. Use text glyphs or inline SVG.
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
