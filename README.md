# varun-kambali.github.io

Portfolio site for Varun Kambali, AI Engineer in Bengaluru: **https://varun-kambali.github.io**

It is an **evidence map**. Pick a skill and the resume lines and projects that back it light up; pick a line and its skills light up. The IDs (`E3`, `K2`, `P1`) match the resume. A project board reads each open-source project's repo, demo and headline eval result from GitHub when the page loads, so a project appears on the site as soon as it ships.

Plain HTML, CSS and JavaScript: no framework, no build step, hosted on GitHub Pages.

## How it works
- **The HTML is the data.** Skills are `<li data-skill="rag">` items in the skills panel. Each evidence card is an `<article data-evidence data-kind="line|project">` that lists its skills as `<li data-tag="rag">`. Without JavaScript the page reads as a plain resume; `assets/js/evidence-map.js` turns those lists into toggle buttons and draws the connectors.
- **Skills no single resume line names** (for example LangGraph, listed in the resume's skills row K2) carry `data-listed="K2"`, and the map says so instead of inventing a link.
- **Deep links:** `?skill=rag` or `?line=E3` opens the map with that selection. `?theme=dark` or `?theme=light` forces a theme.
- **Project board** (`assets/js/project-board.js`), per card with `data-repo`:

  | Slot | Source |
  |---|---|
  | Repo, last push | GitHub REST API, `GET /repos/Varun-Kambali/<repo>` (no token, 60 requests an hour per visitor, cached for 10 minutes) |
  | Demo | The card's `data-demo`, or else the repo's homepage field |
  | Status | Turns to **Shipped** when the latest release is `v1.0.0` or later |
  | Headline eval | First data row of `evals/results/summary.md` on the default branch (or the row named in `data-eval-row`), read from `raw.githubusercontent.com` |

  Everything is written as text, never as HTML. If GitHub doesn't answer, the card keeps its static text ("Not public yet", "Not run yet"), which is always true.

## Common changes
- **A project ships:** in the project repo, make `evals/results/summary.md` start with the README template's results table (`Metric | Baseline | This project | How measured`), with the headline metric in the first row. Then, here, update the card's pill and text if needed, add `data-demo` once there's a demo, and open a PR.
- **A new resume line:** add an `<article data-evidence data-kind="line">` with the line's ID, the text exactly as on the resume, its metrics and its `data-tag` list. If it is the first line to use a skill marked `data-listed`, remove that attribute (the check enforces this).
- **A new skill:** add `<li data-skill="id">Label</li>` to the right group in the skills panel and tag the cards that use it.

## Run locally
```bash
python3 -m http.server 8765
```
Then open http://localhost:8765/.

## Checks (CI runs all of them on every PR)
| Check | Command |
|---|---|
| Evidence map integrity and public safety (no unknown or orphaned skills, every in-page link resolves, https only, no phone numbers) | `python3 scripts/check_site.py` |
| Unit tests for the eval summary parser | `node --test tests/` |
| HTML validation | `npx html-validate@11.16.4 "*.html"` |
| Accessibility, WCAG 2 AA with axe and HTML_CodeSniffer, light and dark, desktop and phone | `npx pa11y-ci@5.0.0 --config .pa11yci.json` (with the local server running) |
| Secrets scan | gitleaks |

## Design system
`design-system/varun-kambali-portfolio/MASTER.md` holds the rules and `assets/css/tokens.css` the tokens: one accent colour, IBM Plex Sans and Mono, light and dark themes checked against WCAG AA. Build from the tokens, never ad-hoc values.

## Structure
```
index.html                  the page (and the evidence data)
assets/css/tokens.css       design tokens (light and dark)
assets/css/site.css         layout and components
assets/js/evidence-map.js   selection, connectors, deep links
assets/js/project-board.js  live repo, demo, status and eval slots
assets/js/summary.js        parser for evals/results/summary.md
assets/js/theme.js          auto, light or dark theme toggle
scripts/check_site.py       integrity and public-safety check
tests/                      node --test unit tests
design-system/              design system (MASTER.md)
```

## License
Code: MIT (see `LICENSE`).
