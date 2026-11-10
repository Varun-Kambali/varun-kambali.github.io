# varun-kambali.github.io

Portfolio site for Varun Kambali, AI Engineer in Bengaluru: **https://varun-kambali.github.io**

It reads like an annotated resume: a sticky sidebar with who I am and how to find things, and a scrolling column with my own words, experience, projects and credentials. Its one signature is an **evidence map** that works like a highlighter: pick a skill or an area (RAG, agents, evals, search, data and cloud), and the work that used it gets marked. Pick a line or a role to see the skills it used. Each open-source project is written up in first person (why I built it and its measured result) and kept current from its GitHub repo, so a project appears on the site as soon as it ships.

Plain HTML, CSS and JavaScript: no framework, no build step, hosted on GitHub Pages.

## How it works
- **The HTML is the data.** Skills are `<li data-skill="rag">` items in the skills panel. Each evidence card is an `<article data-evidence data-kind="line|project">` that lists its skills as `<li data-tag="rag">`. Without JavaScript the page reads as a plain resume; `assets/js/evidence-map.js` turns those lists into toggle buttons and draws the connectors.
- **Skills no single resume line names** (for example LangGraph, listed in the resume's skills row K2) carry `data-listed="K2"`, and the map says so instead of inventing a link.
- **Hiring lenses** are `<li data-lens="rag" data-skills="rag citations …">` in the sidebar; **roles** are `<h3 data-role-filter="role-searce">` headings, each pointing at its role section. `check_site.py` fails if a lens names an unknown skill or a step points at a missing role.
- **Deep links:** `?skill=rag`, `?line=E3`, `?lens=agents` or `?role=role-searce` opens the map with that selection, and "Copy link" shares the current view. `?theme=dark` or `?theme=light` forces a theme.
- **Right now:** the last line of About names the project in progress (or the next one), and disappears when nothing is. The sync writes it; the page adds the latest commit once the repo is public.
- **Projects keep themselves current.** `data/projects.json` lists the projects. A daily Action (`.github/workflows/sync.yml`) runs `scripts/sync.mjs`, which reads each project's repo and rewrites the project cards between the `<!-- sync:… -->` markers in `index.html`. It opens a PR and merges it only when something changed, after `check_site.py` and the tests pass. The profile README (`Varun-Kambali/Varun-Kambali`) runs the same script on its own projects section.
  - **The words are written by hand.** Each project in `data/projects.json` has a `story` (why I built it and what it does, first person) and a `result` (one sentence with the measured result). Every number in `result` must appear in the project's `evals/results/summary.md`; if a re-run changes one, the sync leaves the sentence out, shows the results file's own row instead and says so in its report, until someone rewrites it.
  - A project repo can carry a **`portfolio.json`** (`title`, `tagline`, `summary`, `story`, `result`, `measures`, `skills`, `status`, `evalRow`, `demo`) to update its own entry without touching this repo. A new public repo with the topic **`portfolio`** and a `portfolio.json` that has an `id` joins by itself.
  - A release `v1.0.0` or later marks a project **Shipped**. Projects that are planned or next get one "Up next" line in the profile README.
  - If the repo has `docs/case-study.md`, the entry and the README link it as "Why I built it".
- **Live layer** (`assets/js/project-board.js`): between syncs the page turns a project's status to **Shipped** when its latest release is `v1.0.0` or later, adds a "Code" link once the repo is public, and shows the latest commit on the project being built. It uses the GitHub REST API without a token (60 requests an hour per visitor, cached for 10 minutes) and writes text, never HTML. The story and result only ever come from the sync, so every number on the page is one the results file backs.

## Common changes
- **A project ships:** in the project repo, keep `portfolio.json` current, set the repo's homepage to the demo URL and tag `v1.0.0`. Here, write its `story` and `result` in `data/projects.json`, copying every number from its `evals/results/summary.md`. The next daily sync (or a manual run of the `sync` workflow) updates the site and the profile README.
- **Run the sync by hand:** `node scripts/sync.mjs --site index.html` (add `--readme <path>` for the profile README). With `GITHUB_TOKEN` set, it gets a higher API rate limit.
- **A new resume line:** add an `<article data-evidence data-kind="line">` with the line's ID as its `id`, the text exactly as on the resume, its metrics and its `data-tag` list. If it is the first line to use a skill marked `data-listed`, remove that attribute (the check enforces this).
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
| Unit tests for the eval summary parser and the project sync | `node --test "tests/*.test.js"` |
| HTML validation | `npx html-validate@11.16.4 "*.html"` |
| Accessibility, WCAG 2 AA with axe and HTML_CodeSniffer, light and dark, desktop and phone | `npx pa11y-ci@5.0.0 --config .pa11yci.json` (with the local server running) |
| Secrets scan | gitleaks |

## Design system
`design-system/varun-kambali-portfolio/MASTER.md` holds the rules (including the list of looks to avoid) and `assets/css/tokens.css` the tokens: ink on off-white, a highlighter yellow as the only accent, IBM Plex Sans with Plex Mono for dates and IDs, light and dark themes checked against WCAG AA. Build from the tokens, never ad-hoc values.

## Structure
```
index.html                  the page (and the evidence data)
assets/css/tokens.css       design tokens (light and dark)
assets/css/site.css         layout and components
assets/js/evidence-map.js   selection, connectors, deep links
assets/js/project-board.js  live status, code link and latest commit
assets/js/summary.js        parser for evals/results/summary.md
assets/js/theme.js          auto, light or dark theme toggle
assets/js/nav.js            marks the section being read in the sidebar nav
data/projects.json          the projects on the board (P1, P2, …)
scripts/sync.mjs            daily project sync for the site and the profile README
scripts/check_site.py       integrity and public-safety check
tests/                      node --test unit tests
design-system/              design system (MASTER.md)
```

## License
Code: MIT (see `LICENSE`).
