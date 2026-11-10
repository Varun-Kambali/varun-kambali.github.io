import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collect, offlineFetcher, renderSite, renderReadme, stamp, setSection, liveFetcher, unbackedNumbers } from "../scripts/sync.mjs";

const config = JSON.parse(await readFile(new URL("../data/projects.json", import.meta.url), "utf8"));
const site = await readFile(new URL("../index.html", import.meta.url), "utf8");

const SUMMARY = "| Metric | Baseline | This project | How measured |\n|---|---|---|---|\n| Other row | 1 | 2 | make eval |\n| Calorie error against the dataset totals, MAPE (%) | 31.2% | 6.4% | make eval |\n";
const repo = (name, extra = {}) => ({
  name,
  private: false,
  html_url: `https://github.com/Varun-Kambali/${name}`,
  default_branch: "main",
  topics: [],
  homepage: "",
  ...extra,
});

function fixture({ repos = [], raw = {}, api = {} } = {}) {
  return offlineFetcher({ api: { "/users/Varun-Kambali/repos?per_page=100&type=owner": repos, ...api }, raw });
}

test("nothing public: every project stays 'not public yet'", async () => {
  const projects = await collect(config, fixture());
  assert.deepEqual(projects.map((p) => [p.id, p.live.public]), [["P1", false], ["P2", false], ["P3", false]]);
});

test("a public repo gets its links, demo and Shipped status from a v1 release", async () => {
  const warnings = [];
  const projects = await collect(
    config,
    fixture({
      repos: [repo("nutrition-mcp", { homepage: "https://example.org/demo" })],
      api: { "/repos/Varun-Kambali/nutrition-mcp/releases/latest": { tag_name: "v1.0.0" } },
      raw: { "nutrition-mcp/main/evals/results/summary.md": SUMMARY },
    }),
    (w) => warnings.push(w),
  );
  const p1 = projects[0];
  assert.equal(p1.status, "shipped");
  assert.equal(p1.live.headline, "Calorie error against the dataset totals, MAPE (%): 31.2% → 6.4%", "the row named in evalRow, not the first");
  assert.equal(p1.live.demo, "https://example.org/demo");
  const html = renderSite(site, projects, "Varun-Kambali", "2026-11-01");
  assert.match(html, /<p class="entry__status" data-pill data-status="shipped">Shipped v1\.0\.0<\/p>/);
  assert.match(html, /<p class="entry__links"><a href="https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp">Code<\/a> · <a href="https:\/\/example\.org\/demo">Live demo<\/a> · <a href="https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/evals\/results\/summary\.md">Eval results<\/a><\/p>/);
  assert.match(html, /<!-- sync:stamp:start -->1 Nov 2026<!-- sync:stamp:end -->/);
  assert.doesNotMatch(html, /id-chip/, "no resume line IDs on project entries");
});

test("the hand-written result shows only while the results file backs every number in it", async () => {
  const summary = "| Measure | Baseline | This project |\n|---|---|---|\n| Calorie error against the dataset totals, MAPE (%) | 16.0 | 0.0 |\n| Questions | 26 / 26 | 26 / 26 |\n| Dishes | 18 | 18.7 |\n";
  const backed = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/evals/results/summary.md": summary } }));
  assert.equal(backed[0].live.result, config.projects[0].result);
  assert.match(renderSite(site, backed, "Varun-Kambali", "2026-11-01"), /<p class="entry__result">From memory, Gemini was off by 16\.0% on calories\./);

  const warnings = [];
  const rerun = summary.replace("| 16.0 |", "| 14.2 |");
  const stale = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/evals/results/summary.md": rerun } }), (w) => warnings.push(w));
  assert.equal(stale[0].live.result, undefined);
  assert.ok(warnings.some((w) => w.startsWith("P1: result names 16.0")), warnings.join("; "));
  const html = renderSite(site, stale, "Varun-Kambali", "2026-11-01");
  assert.match(html, /<p class="entry__result">Latest eval: Calorie error against the dataset totals, MAPE \(%\): 14\.2 → 0\.0\.<\/p>/, "falls back to the results row");
  assert.doesNotMatch(html, /off by 16\.0%/);
});

test("numbers are matched whole, so 26 is not found inside 2026", () => {
  assert.deepEqual(unbackedNumbers("26 of 26 questions", "run on 2026-10-21"), ["26"]);
  assert.deepEqual(unbackedNumbers("479 of 553, 86.6%", "| 86.6% (479 of 553) |"), []);
  assert.deepEqual(unbackedNumbers("16.0% error", "| 16.05 |"), ["16.0"]);
  assert.deepEqual(unbackedNumbers("1,000 pages", "1,000"), []);
});

test("portfolio.json in the project repo overrides the site's text", async () => {
  const manifest = JSON.stringify({ tagline: "Updated from the repo.", status: "progress", skills: ["mcp", "python"] });
  const projects = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/portfolio.json": manifest } }));
  assert.equal(projects[0].tagline, "Updated from the repo.");
  assert.deepEqual(projects[0].skills, ["mcp", "python"]);
});

test("a new repo tagged 'portfolio' with a manifest joins the board", async () => {
  const manifest = JSON.stringify({ id: "P4", title: "LLM gateway", tagline: "Routing and budgets.", summary: "S.", measures: "M.", skills: ["python", "not-a-skill"] });
  const warnings = [];
  const projects = await collect(
    config,
    fixture({ repos: [repo("llm-gateway", { topics: ["portfolio"] })], raw: { "llm-gateway/main/portfolio.json": manifest } }),
    (w) => warnings.push(w),
  );
  assert.deepEqual(projects.map((p) => p.id), ["P1", "P2", "P3", "P4"]);
  const html = renderSite(site, projects, "Varun-Kambali", "2026-11-01", (w) => warnings.push(w));
  assert.match(html, /id="P4" data-evidence data-kind="project" data-project data-repo="llm-gateway"/);
  assert.ok(warnings.some((w) => w.includes('"not-a-skill"')), "unknown skills are reported, not rendered");
  assert.doesNotMatch(html, /data-tag="not-a-skill"/);
});

test("text from manifests is escaped", async () => {
  const manifest = JSON.stringify({ story: '<img src=x onerror="alert(1)">' });
  const projects = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/portfolio.json": manifest } }));
  const html = renderSite(site, projects, "Varun-Kambali", "2026-11-01");
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("a quiet day leaves the file byte-identical", async () => {
  const projects = await collect(config, fixture());
  const once = renderSite(site, projects, "Varun-Kambali", "2026-10-18");
  assert.equal(renderSite(once, projects, "Varun-Kambali", "2026-12-25"), once);
});

test("stamp moves only when content changes", () => {
  const before = "a <!-- sync:stamp:start -->1 Oct 2026<!-- sync:stamp:end -->";
  assert.equal(stamp(before, before.replace("1 Oct", "9 Oct"), "2026-10-20"), before);
  assert.equal(stamp(before, before.replace("a ", "b "), "2026-10-20"), "b <!-- sync:stamp:start -->20 Oct 2026<!-- sync:stamp:end -->");
});

test("the README lists shipped and active projects in first person, then what's next", async () => {
  const md = "x\n<!-- sync:projects:start -->\nold\n<!-- sync:projects:end -->\n<sub>Updated <!-- sync:stamp:start -->1 Oct 2026<!-- sync:stamp:end --></sub>\n";
  const projects = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/evals/results/summary.md": SUMMARY } }));
  const out = renderReadme(md, projects, "2026-11-02");
  assert.match(out, /### \[Nutrition MCP server\]\(https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\) · shipped\n\nWhen I asked AI assistants/);
  assert.match(out, /Latest eval: Calorie error against the dataset totals, MAPE \(%\): 31\.2% → 6\.4%\.\n\n\[Eval results\]\(https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/evals\/results\/summary\.md\)/);
  assert.match(out, /### Meal-planner multi-agent · in progress\n\nI follow a meal plan/, "a project that isn't public yet has no link");
  assert.match(out, /Up next: \*\*Household docs vault\*\*, private document AI that runs locally/);
  assert.doesNotMatch(out, /\| P\d \|/, "no table of IDs");
  assert.doesNotMatch(out, /\p{Extended_Pictographic}/u, "no emoji in the README");
  assert.match(out, /2 Nov 2026/);
});

test("missing markers fail loudly", () => {
  assert.throws(() => setSection("no markers here", "board", "x"), /markers for "board" not found/);
});

test("an API failure stops the run instead of blanking the cards", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 403 });
  try {
    await assert.rejects(collect(config, liveFetcher()), /HTTP 403/);
  } finally {
    globalThis.fetch = original;
  }
});

test("the right-now line follows the project in progress, then the next one", async () => {
  const inProgress = renderSite(site, await collect(config, fixture()), "Varun-Kambali", "2026-11-01");
  assert.match(inProgress, /<p class="now" data-now data-repo="meal-planner-agents">Right now I'm building <a href="#P2">Meal-planner multi-agent<\/a>\./);
  const later = { ...config, projects: config.projects.map((p) => ({ ...p, status: { P1: "shipped", P2: "shipped", P3: "next" }[p.id] })) };
  const html = renderSite(site, await collect(later, fixture()), "Varun-Kambali", "2026-11-01");
  assert.match(html, /<p class="now" data-now data-repo="household-docs-vault">Next I'm building <a href="#P3">Household docs vault<\/a>\./);
});

test("a case study in the repo is linked from the site entry and the README", async () => {
  const projects = await collect(
    config,
    fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/docs/case-study.md": "# Case study: Nutrition MCP server" } }),
  );
  const url = "https://github.com/Varun-Kambali/nutrition-mcp/blob/main/docs/case-study.md";
  assert.equal(projects[0].live.caseStudy, url);
  const html = renderSite(site, projects, "Varun-Kambali", "2026-11-01");
  assert.match(html, /<a href="https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/docs\/case-study\.md">Why I built it<\/a>/);
  const p3 = html.slice(html.indexOf('id="P3"'));
  assert.doesNotMatch(p3.slice(0, p3.indexOf("</article>")), /entry__links/, "a project that isn't public has no links yet");
  const md = "<!-- sync:projects:start -->\nold\n<!-- sync:projects:end -->\n<!-- sync:stamp:start -->1 Oct 2026<!-- sync:stamp:end -->\n";
  assert.match(renderReadme(md, projects, "2026-11-01"), /\[Why I built it\]\(https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/docs\/case-study\.md\)/);
});
