import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { collect, offlineFetcher, renderSite, renderReadme, stamp, setSection, liveFetcher } from "../scripts/sync.mjs";

const config = JSON.parse(await readFile(new URL("../data/projects.json", import.meta.url), "utf8"));
const site = await readFile(new URL("../index.html", import.meta.url), "utf8");

const SUMMARY = "| Metric | Baseline | This project | How measured |\n|---|---|---|---|\n| Calorie MAPE | 31.2% | 6.4% | make eval |\n";
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

test("a public repo gets its link, demo, headline eval and Shipped status from a v1 release", async () => {
  const projects = await collect(
    config,
    fixture({
      repos: [repo("nutrition-mcp", { homepage: "https://example.org/demo" })],
      api: { "/repos/Varun-Kambali/nutrition-mcp/releases/latest": { tag_name: "v1.0.0" } },
      raw: { "nutrition-mcp/main/evals/results/summary.md": SUMMARY },
    }),
  );
  const p1 = projects[0];
  assert.equal(p1.status, "shipped");
  assert.equal(p1.live.headline, "Calorie MAPE: 31.2% → 6.4%");
  assert.equal(p1.live.demo, "https://example.org/demo");
  const html = renderSite(site, projects, "Varun-Kambali", "2026-11-01");
  assert.match(html, /<span class="pill" data-status="shipped" data-pill>Shipped v1\.0\.0<\/span>/);
  assert.match(html, /Calorie MAPE: 31\.2% → 6\.4%<\/span> <a href="https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/evals\/results\/summary\.md">results file<\/a>/);
  assert.match(html, /<!-- sync:stamp:start -->1 Nov 2026<!-- sync:stamp:end -->/);
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
  assert.match(html, /id="map-P4"/);
  assert.match(html, /id="P4" data-project data-repo="llm-gateway"/);
  assert.ok(warnings.some((w) => w.includes('"not-a-skill"')), "unknown skills are reported, not rendered");
  assert.doesNotMatch(html, /data-tag="not-a-skill"/);
});

test("text from manifests is escaped", async () => {
  const manifest = JSON.stringify({ tagline: '<img src=x onerror="alert(1)">' });
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

test("the README table follows the projects", async () => {
  const md = "x\n<!-- sync:projects:start -->\nold\n<!-- sync:projects:end -->\n<sub>Last change: <!-- sync:stamp:start -->1 Oct 2026<!-- sync:stamp:end --></sub>\n";
  const projects = await collect(config, fixture({ repos: [repo("nutrition-mcp")], raw: { "nutrition-mcp/main/evals/results/summary.md": SUMMARY } }));
  const out = renderReadme(md, projects, "2026-11-02");
  assert.match(out, /\| P1 \| \*\*\[Nutrition MCP server\]\(https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\)\*\* \|/);
  assert.match(out, /\[Calorie MAPE: 31\.2% → 6\.4%\]\(https:\/\/github\.com\/Varun-Kambali\/nutrition-mcp\/blob\/main\/evals\/results\/summary\.md\)/);
  assert.match(out, /\| P2 \| \*\*Meal-planner multi-agent\*\* \|.* Next \| Not run yet \|/);
  assert.doesNotMatch(out, /\p{Extended_Pictographic}/u, "no emoji in the README table");
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

test("the now-building strip follows the project in progress, then the next one", async () => {
  const inProgress = renderSite(site, await collect(config, fixture()), "Varun-Kambali", "2026-11-01");
  assert.match(inProgress, /<span class="now__label">Now building<\/span> <a class="now__project" href="#P1">/);
  const shipped = await collect(
    config,
    fixture({ repos: [repo("nutrition-mcp")], api: { "/repos/Varun-Kambali/nutrition-mcp/releases/latest": { tag_name: "v1.0.0" } } }),
  );
  const html = renderSite(site, shipped, "Varun-Kambali", "2026-11-01");
  assert.match(html, /<p class="now" data-now data-repo="meal-planner-agents"><span class="now__label">Up next<\/span> <a class="now__project" href="#P2">/);
});
