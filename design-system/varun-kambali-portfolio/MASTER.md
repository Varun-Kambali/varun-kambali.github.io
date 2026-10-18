# Design System Master File

> Page-specific rules go in `design-system/varun-kambali-portfolio/pages/[page-name].md` and take precedence over this file.
> The tokens live in `assets/css/tokens.css`. Build from them, never from ad-hoc values.

---

**Project:** Varun Kambali portfolio site
**Version:** v3, "annotated resume" (2026-10-18). It replaces v2 (warm paper, terracotta, display serif), which read as machine-made: cream with a rust accent and a big serif headline has become a stock look of generated sites.

---

## Direction: a resume someone has annotated

The page reads like a printed resume that someone went over with a highlighter. A person's voice opens it, the work follows as dated lists, and the one memorable thing is the evidence map: pick a skill or a lens and the lines that prove it get marked.

What the portfolios people admire have in common, and what this follows:
- **A voice, not a tagline.** First person, specific, a little personal. The About text is Varun's own words.
- **Restraint.** Text, lists, rules and whitespace. No cards, pills, badges or boxes inside boxes. A background appears only on hover.
- **One typeface.** Hierarchy comes from size, weight and colour, not from mixing display fonts.
- **A palette chosen for the person,** not the trend: ink on off-white, with a highlighter yellow as the single accent.
- **One signature detail made with care,** instead of decoration everywhere.

## Color

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Page | `--color-bg` | `#FBFBFA` | `#111113` | Background: a neutral off-white, not cream |
| Surface | `--color-surface` | `#FFFFFF` | `#18181B` | The fixed status bar on phones |
| Surface 2 | `--color-surface-2` | `#F2F2F0` | `#202024` | Hover and selected entry background |
| Text | `--color-text` | `#18181B` | `#F4F4F5` | Body, titles |
| Muted text | `--color-text-muted` | `#52525B` | `#A1A1AA` | Descriptions, dates, meta (7.5:1 / 7.4:1) |
| Border | `--color-border` | `#E4E4E7` | `#2E2E33` | Rules |
| Strong border | `--color-border-strong` | `#8B8B94` | `#75757F` | Button edges, link underlines (≥3:1) |
| Accent | `--color-accent` | `#18181B` | `#F4F4F5` | Focus rings: ink, not a colour |
| Marker | `--color-marker` | `#FDE68A` | `#5B4A10` | The highlighter. The only accent colour |
| Marker text | `--color-marker-text` | `#18181B` | `#FEF3C7` | Text on a full marker (14.2:1 / 7.8:1) |
| Status | `--status-progress` / `-ok` / `-plan` | `#9A3412` / `#166534` / `#52525B` | `#FDBA74` / `#86EFAC` / `#A1A1AA` | Project status words |

All pairs pass WCAG 2.2 AA, checked on 2026-10-18. Rule: muted text never sits on the marker (it fails in dark mode); anything marked switches to `--color-text` or `--color-marker-text`.

## Typography

- **IBM Plex Sans** 400, 500, 600 (and 400 italic) for everything readable. **IBM Plex Mono** only for dates and resume IDs (E1, K2, P1). Numbers inside sentences stay in the sans, weight 500.
- Sizes: name 32px/600, role line 18px/500, body 16px/1.65, meta and lists 14px, tags and dates 12px. No display font, no italic serif headline, no all-caps labels above headings.

## Layout

- **Phones (below 1024px):** one column: name, role, one-line description, the evidence controls (lenses, status, a folded "All skills"), links, then About, Experience, Building in public, Credentials. The section nav is hidden (the sections follow directly).
- **Desktop (1024px and up):** a sticky sidebar (about 21rem) and a scrolling resume column, 64px apart. The sidebar holds identity, the section nav, the evidence controls and the links; it scrolls on its own if it runs long.
- **Experience** is a dated list: a mono date column (8.5rem) beside each role; the role's lines are entries under it.

## Components

### Highlighter
- **Full mark** (pressed skill, pressed lens, a skill tag that matches): `--color-marker` background, `--color-marker-text`.
- **Half mark** (matching entry titles, related skills, the current nav item, a pressed role): `box-shadow: inset 0 -0.45em 0 var(--color-marker)`, like a pen stroke across the lower part of the text. It's an inset shadow rather than a gradient so contrast checkers can still read the background.
- **Dim** (not matching): titles turn muted; descriptions are already muted, and they brighten when an entry matches.

### Text buttons (lenses, skills, tags, entry and role titles)
Plain text with a dotted underline, solid on hover. No borders, no pills. Touch screens get 44px targets through padding.

### Entry
A resume line or a project: ID (mono, muted) and title (600), the description (muted), an optional "How it works" disclosure, and its skills as a run of small text buttons. Hover and selection add a `--color-surface-2` background with an 8px radius; nothing else.

### Stage list ("How it works")
An inline ordered list: "Question → Generate SQL → Validate → Execute", with the arrows drawn in CSS and hidden from screen readers. Stage names come only from the resume.

### Project entry
Like an entry, plus a status word in mono and the colour of its state ("In progress", "Next", "Planned", "Shipped v1.0.0"), and a small definition list (Repo, Demo, Headline eval, Last push). Written by the daily sync.

### Status line
"LangGraph: 2 resume lines and 1 project." with Copy link and Clear. It sits under the lenses on desktop; on phones it's fixed to the bottom of the screen while something is highlighted.

### Connectors
Thin (1px) muted ink curves in the gutter between the sidebar and the resume, from the picked skill to its lines. Wide screens only, single skills or lines only.

## Motion

Only what explains an action: background and colour changes at 150ms, connectors drawing in at 220ms. No pulsing, blinking, scroll reveals or hover zooms. `prefers-reduced-motion` turns every duration to 0.

## Accessibility

Landmarks, a skip link, full keyboard use (Tab, Enter or Space, Escape clears), `aria-pressed` on every toggle, an `aria-live` status, visible ink focus rings, and the page fully readable without JavaScript. Checked with axe on 8 states: no violations, nothing left for review.

## Avoid (these read as machine-made)

- Cream or beige backgrounds with a terracotta, rust or acid-green accent; purple-to-blue gradients; gradient text; glow halos.
- Display serifs, italic serif headlines, oversized hero headlines, all-caps eyebrow labels above headings, tracked-out body text.
- Cards in identical grids, cards inside cards, pills everywhere, thick coloured stripes on card edges, hairline border plus soft shadow.
- Pulsing status dots, blinking cursors, bouncy easing, content hidden until an entrance animation runs.
- Emoji anywhere, marketing phrases ("supercharge", "world-class"), forced contrasts ("Not X. Y."), em-dash-heavy copy.
- Any credit line for the tools used to build the site.

## Pre-delivery checklist

- [ ] Colours and sizes from `tokens.css`; nothing on the avoid list
- [ ] Text contrast ≥4.5:1 and control edges ≥3:1 in both themes; muted text never on the marker
- [ ] Keyboard path works; focus visible; Escape clears
- [ ] Readable with JavaScript off; no horizontal scroll at 375, 768, 1024 and 1440px
- [ ] Every number matches the resume or a committed eval results file
