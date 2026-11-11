# Design rationale

Why the site looks and behaves the way it does. The values themselves (every colour, size and spacing step) live in [`design-system/varun-kambali-portfolio/MASTER.md`](../design-system/varun-kambali-portfolio/MASTER.md) and [`assets/css/tokens.css`](../assets/css/tokens.css); this file records the reasons.

## Brief and mood

- **Who uses it, on what:** recruiters and hiring managers, often on a phone between other tabs, sometimes on a laptop when they are comparing candidates.
- **The one task:** find out what I have built and see the proof for a skill they care about, quickly.
- **Three feeling words:** plain, specific, trustworthy.
- **Must never happen:** a claim with nothing behind it, or a page that breaks on a small phone.
- **Looks like:** a printed resume someone went over with a highlighter; a well-kept engineering notebook. **Must not look like:** a generated landing page (cream and terracotta, big serif headline, cards and pills everywhere).

## Palette

A neutral page with ink-coloured text and one accent: highlighter yellow. Colour has one job here, marking evidence, so nothing else gets a colour.

- **Page, surfaces and rules** are near-neutral. In light mode they all lean very slightly warm (a touch less blue than red and green): page `#FBFBFA`, surface `#FDFDFC`, hover `#F2F2F0`. That warm lean is the same direction as the yellow marker, so the paper and the highlighter look like they belong together.
- **Surface was pure white until 2026-11.** Next to a warm off-white page, `#FFFFFF` reads as slightly cold and bright, a different material from the rest of the paper. `#FDFDFC` keeps it the lightest layer (the phone status bar still sits "above" the page) while sharing the page's hue.
- **The marker** (`#FDE68A` light, `#5B4A10` dark) is the only accent. Text on it switches to full ink, never muted grey, because muted text on the dark-mode marker fails contrast.
- **Status words** (shipped, planned) use green, orange and grey. They are words as well as colours, so colour is never the only signal.
- **Dark mode** is its own palette, not an inversion: a dark marker brown instead of a glowing yellow, and lighter text greys that keep the same contrast.

## Type

- **One family, IBM Plex Sans,** with Plex Mono only for dates. One family means hierarchy has to come from size, weight and colour, which keeps the page calm.
- **Scale:** 12, 14, 16, 18, 22, 32px. Body is 16px with a 1.65 line height and lines capped at 66 characters, so paragraphs stay comfortable to read.
- **The ranks:** my name at 32px is the single largest thing. Section heads (About, Experience) are 22px. Role and project titles are 18px. Lines of work inside a role are 16px semibold, set apart from their muted 16px descriptions by weight and colour.
- **Why section heads went from 18 to 22px (2026-11):** at 18px they were barely bigger than a role title and sat 14px below my name, so the eye had no clear second step. 22px gives three distinct steps (32, 22, 18). I did not go larger: a section head bigger than my name would turn the hierarchy upside down and push the page toward an oversized-headline landing page, which is exactly what this design avoids.
- **Headings use `text-wrap: balance`,** so a heading that wraps splits into even lines instead of leaving one word alone.

## Spacing and layout

- **Spacing steps:** 4, 8, 16, 24, 32, 48, 64px. Space inside a group is always smaller than space between groups, so grouping comes from proximity rather than boxes.
- **Layout:** one column on phones. From 1024px, a sticky sidebar (identity, skills) and a scrolling resume column.
- **`overflow-x: clip` on `html` and `body`:** a safety net so nothing can ever cause sideways scrolling on a phone. I used `clip` rather than `hidden` on purpose: `hidden` turns the element into a scroll container, which would stop the sidebar from sticking. `clip` just cuts off anything that pokes out.
- **Long labels wrap on purpose, not by accident:**
  - A role title is split into the role and the company. When the column is narrower than about 31rem (phones, and the narrow column at 1024px), the company moves to its own line and the dot between them is hidden from the eye but still read out by screen readers. Below 18rem the title steps down to 16px so "Senior Machine Learning Engineer" keeps to one line.
  - A skill with a qualifier, like "Model benchmarking (quality, latency, cost)", drops the bracket under the name when the skills panel is narrower than 20rem. The break lands where the meaning splits, never mid-phrase.
  - Both use container queries: the component decides based on its own width, not the screen's, because the same list is full-width on a phone and 21rem wide in the desktop sidebar.
  - Long credential names wrap with balanced lines and a tighter line height (1.4) inside an item than the space between items, so each credential reads as one unit. At 320px some names still take two or three lines; that is the honest result of a 69-character name on a 272px line, and shortening the official names was not an option.

## Components

- **Text buttons, not pills.** Skills, areas, tags and titles are plain words with a dotted underline that turns solid on hover. Only Copy link and Clear have a border, because they are actions rather than filters.
- **Every control is at least 44px tall to tap or click (2026-11).** Before, most controls were the height of their text, 21 to 23px. 44px is the size a fingertip needs (Apple's guidance and WCAG 2.5.5).
  - For text buttons and links, the button itself is now the 44px target, with invisible padding above and below. The words and their marks sit in a label inside it. This matters because the highlighter mark is painted on the label: if the whole 44px button carried it, a pressed skill would become a tall yellow block instead of a stroke across the words.
  - The two bordered buttons keep their 32px box so the status line stays light, and an invisible layer centred on each makes the clickable area 44px tall. What you see and what you can tap don't have to be the same size.
  - Short words such as "SQL" also get a 44px minimum width.
  - The cost is more vertical space between rows of skills and tags. I accepted that: air between rows is not visual weight, and a list you can't tap reliably is worse than a slightly longer one.
- **States.** Every control has default, hover, focus, pressed (`:active`) and disabled styles.
  - Pressing shows a light grey under the label, or behind the bordered buttons, one step darker than the hover grey, so a press registers before its result appears. Links thicken their underline while pressed.
  - Nothing is disabled on the site today. If something ever is, it turns muted, loses its hover and press responses and shows a not-allowed cursor, while staying readable.
  - The focus ring is a 2px ink outline around the whole control, so it also shows how big the target is.

## Motion

Only background and colour changes (150ms) and the connector lines drawing in (220ms). They confirm an action; nothing moves for decoration. With reduced motion turned on, every duration is zero and smooth scrolling is off.

## Accessibility results

Checked on 2026-11-11.

| Pair | Light | Dark |
|---|---|---|
| Text on page | 17.1:1 | 17.2:1 |
| Muted text on surface | 7.6:1 | (unchanged) |
| Strong border (button edges) on surface | 3.3:1 | (unchanged) |
| Text on the press grey | 14.0:1 | 12.3:1 |
| Muted text on the press grey | 6.1:1 | 5.3:1 |
| Marker text on the press grey | 14.0:1 | 12.1:1 |
| Focus ring on hover grey | 15.8:1 | 14.8:1 |

- **Tap targets:** every standalone control measures 44px or more at 320, 375, 1024 and 1440px. The only exceptions are links inside sentences, which WCAG 2.5.8 exempts.
- **Keyboard:**
  - At desktop width: Tab reaches the skip link, section links, areas, skills and titles in order, each with a visible ring. Enter presses an area, which highlights its 5 entries. Escape clears everything.
  - At phone width (375px): Tab reaches the areas, then "All skills" (Enter opens it), then each skill. Space presses one, and the status bar pins to the bottom. Tab reaches Clear, and Enter clears both the highlight and the link.
- **Automated checks:** axe and HTML_CodeSniffer (WCAG 2 AA) on 8 states, light and dark, desktop and phone: 0 errors. HTML validation: clean. No sideways scroll at any tested width.

## Tried and rejected

- **Making every button 44px with padding and leaving the marks on the button:** the highlighter turned into tall yellow slabs. Moving the marks onto an inner label fixed it.
- **Expanding hit areas with invisible layers on the text buttons too:** it keeps rows tight, but stacked rows would then have overlapping targets, so a tap between two rows could hit either one. Real 44px rows avoid that.
- **Keeping the focus ring tight around the words** while the target was larger: it looked neater, but it hid how big the target is, and it relied on removing the control's own outline. The ring now goes around the whole control.
- **Section heads at 40px or more:** larger than my name, which inverts the hierarchy.
- **Letting long labels wrap wherever the line ran out:** "Model benchmarking (quality," / "latency, cost)" splits the meaning. The planned break points read better.
