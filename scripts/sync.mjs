#!/usr/bin/env node
// Keeps the project cards on the site, and the projects table in the profile README,
// in step with each project's GitHub repo. Runs daily in GitHub Actions (.github/workflows/sync.yml)
// and by hand:  node scripts/sync.mjs --site index.html [--readme ../Varun-Kambali/README.md]
//
// Sources for every project in data/projects.json, plus any public repo tagged "portfolio"
// that carries a portfolio.json with an "id":
//   portfolio.json in the project repo        overrides title, tagline, summary, measures, skills, status, evalRow, demo
//   GET /repos/:owner/:repo                   public or not, homepage (demo), default branch
//   GET /repos/:owner/:repo/releases/latest   a v1.0.0 or later release marks the project Shipped
//   evals/results/summary.md                  the headline eval row (same parser as the browser)
// A file is rewritten only when a section's content changes, and its "last change" date moves
// only then, so a quiet day produces no diff and no pull request.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { headline, describe, isV1OrLater } from "../assets/js/summary.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_KEYS = ["title", "tagline", "summary", "measures", "skills", "status", "evalRow", "demo"];
const STATUS_LABEL = { progress: "In progress", next: "Next", planned: "Planned", shipped: "Shipped" };
const README_STATUS = { progress: "🟡 In progress", next: "⚪ Next", planned: "⚪ Planned", shipped: "🟢 Shipped" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseArgs(argv) {
  const args = { data: resolve(ROOT, "data/projects.json") };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    if (!["data", "site", "readme", "offline", "today", "report"].includes(key)) throw new Error(`unknown option ${argv[i]}`);
    args[key] = argv[i + 1];
  }
  return args;
}

export function liveFetcher(token) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "portfolio-sync" };
  if (token) headers.Authorization = `Bearer ${token}`;
  async function get(url, opts, as) {
    const response = await fetch(url, opts);
    if (response.status === 404) return null;
    // Any other failure stops the run, so a rate limit can never blank the cards.
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return as === "json" ? response.json() : response.text();
  }
  return {
    api: (path) => get(`https://api.github.com${path}`, { headers }, "json"),
    raw: (owner, repo, branch, path) =>
      get(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`, {}, "text"),
  };
}

// For tests and dry runs: { api: { "/path": json }, raw: { "repo/branch/path": "text" } }
export function offlineFetcher(fixture) {
  return {
    api: async (path) => fixture.api?.[path] ?? null,
    raw: async (_owner, repo, branch, path) => fixture.raw?.[`${repo}/${branch}/${path}`] ?? null,
  };
}

async function readManifest(fetcher, owner, info, warn) {
  const text = await fetcher.raw(owner, info.name, info.default_branch || "main", "portfolio.json");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    warn(`${info.name}/portfolio.json is not valid JSON; ignored`);
    return null;
  }
}

export async function collect(config, fetcher, warn = () => {}) {
  const owner = config.owner;
  const repos = (await fetcher.api(`/users/${owner}/repos?per_page=100&type=owner`)) || [];
  const byName = new Map(repos.filter((r) => !r.private).map((r) => [r.name.toLowerCase(), r]));
  const projects = config.projects.map((p) => ({ ...p, skills: [...(p.skills || [])] }));

  // A new public repo joins by itself: tag it "portfolio" and give it a portfolio.json with an id.
  const known = new Set(projects.map((p) => p.repo.toLowerCase()));
  for (const info of byName.values()) {
    if (!(info.topics || []).includes("portfolio") || known.has(info.name.toLowerCase())) continue;
    const manifest = await readManifest(fetcher, owner, info, warn);
    if (manifest?.id && manifest?.title) projects.push({ repo: info.name, status: "progress", skills: [], ...manifest });
    else warn(`${info.name} is tagged "portfolio" but has no portfolio.json with an id and title`);
  }

  for (const p of projects) {
    const info = byName.get(p.repo.toLowerCase());
    p.live = { public: Boolean(info) };
    if (!info) continue;
    const manifest = await readManifest(fetcher, owner, info, warn);
    if (manifest) for (const key of MANIFEST_KEYS) if (manifest[key] !== undefined) p[key] = manifest[key];
    const branch = info.default_branch || "main";
    p.live.url = info.html_url;
    const demo = p.demo || info.homepage;
    if (demo && /^https:\/\//.test(demo)) p.live.demo = demo;
    const release = await fetcher.api(`/repos/${owner}/${info.name}/releases/latest`);
    if (release?.tag_name) {
      p.live.release = release.tag_name;
      if (isV1OrLater(release.tag_name)) p.status = "shipped";
    }
    const summary = await fetcher.raw(owner, info.name, branch, "evals/results/summary.md");
    const found = summary ? headline(summary, p.evalRow) : null;
    if (found) {
      p.live.headline = describe(found);
      p.live.results = `${info.html_url}/blob/${branch}/evals/results/summary.md`;
    }
  }

  for (const p of projects) {
    if (!/^P\d+$/.test(p.id)) throw new Error(`project id "${p.id}" must look like P4`);
    if (!STATUS_LABEL[p.status]) throw new Error(`${p.id}: unknown status "${p.status}"`);
  }
  return projects.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function statusLabel(p) {
  return p.status === "shipped" && p.live.release ? `Shipped ${p.live.release}` : STATUS_LABEL[p.status];
}

function pill(p, extra = "") {
  return `<span class="pill" data-status="${p.status}"${extra}>${esc(statusLabel(p))}</span>`;
}

function mapCard(p, labels, warn) {
  const tags = p.skills
    .filter((id) => labels.has(id) || (warn(`${p.id}: skill "${id}" has no chip on the site; left out`), false))
    .map((id) => `                <li data-tag="${esc(id)}">${esc(labels.get(id))}</li>`)
    .join("\n");
  return `            <article class="card card--project" id="map-${p.id}" data-evidence data-kind="project">
              <header class="card__head">
                <span class="id-chip">${p.id}</span>
                <h4 class="card__title">${esc(p.title)}</h4>
                ${pill(p)}
              </header>
              <p>${esc(p.tagline)}</p>
              <ul class="tags" aria-label="Skills it shows">
${tags}
              </ul>
            </article>`;
}

function boardCard(p, owner) {
  const repo = p.live.url ? `<a href="${esc(p.live.url)}">github.com/${owner}/${esc(p.repo)}</a>` : "Not public yet";
  const demo = p.live.demo
    ? `<a href="${esc(p.live.demo)}">${esc(p.live.demo.replace(/^https:\/\//, "").replace(/\/$/, ""))}</a>`
    : "Not live yet";
  const value = p.live.headline
    ? `<span class="slot__value is-live" data-slot-value>${esc(p.live.headline)}</span> <a href="${esc(p.live.results)}">results file</a>`
    : `<span class="slot__value" data-slot-value>Not run yet</span>`;
  const attrs = `${p.evalRow ? ` data-eval-row="${esc(p.evalRow)}"` : ""}${p.demo ? ` data-demo="${esc(p.demo)}"` : ""}`;
  return `        <article class="project" id="${p.id}" data-project data-repo="${esc(p.repo)}"${attrs}>
          <header class="project__head">
            <span class="id-chip">${p.id}</span>
            <h3>${esc(p.title)}</h3>
            ${pill(p, " data-pill")}
          </header>
          <p>${esc(p.summary)}</p>
          <dl class="slots">
            <div><dt>Repo</dt><dd data-slot="repo">${repo}</dd></div>
            <div><dt>Demo</dt><dd data-slot="demo">${demo}</dd></div>
            <div><dt>Headline eval</dt><dd data-slot="eval"><span class="slot__what">${esc(p.measures)}</span> ${value}</dd></div>
            <div><dt>Last push</dt><dd data-slot="updated">${p.live.url ? "See repo" : "Not yet"}</dd></div>
          </dl>
        </article>`;
}

export function readmeTable(projects) {
  const rows = projects.map((p) => {
    const name = p.live.url ? `**[${cell(p.title)}](${p.live.url})**` : `**${cell(p.title)}**`;
    const demo = p.live.demo ? ` · [demo](${p.live.demo})` : "";
    const result = p.live.headline ? `[${cell(p.live.headline)}](${p.live.results})` : "Not run yet";
    const status = p.status === "shipped" && p.live.release ? `🟢 Shipped ${p.live.release}` : README_STATUS[p.status];
    return `| ${p.id} | ${name}${demo} | ${cell(p.tagline)} | ${status} | ${result} |`;
  });
  return ["| | Project | What it is | Status | Headline result |", "|---|---|---|---|---|", ...rows].join("\n");
}

export function setSection(text, name, body) {
  const pattern = new RegExp(`(<!-- sync:${name}:start -->)[\\s\\S]*?(\\n[ \\t]*<!-- sync:${name}:end -->)`);
  if (!pattern.test(text)) throw new Error(`markers for "${name}" not found`);
  return text.replace(pattern, (_m, start, end) => `${start}\n${body}${end}`);
}

const STAMP = /(<!-- sync:stamp:start -->)[\s\S]*?(<!-- sync:stamp:end -->)/g;

// Returns the old text untouched when nothing but the stamp would differ.
export function stamp(oldText, newText, today) {
  const blank = (t) => t.replace(STAMP, "$1$2");
  if (blank(oldText) === blank(newText)) return oldText;
  return newText.replace(STAMP, `$1${formatDate(today)}$2`);
}

export function skillLabels(html) {
  const labels = new Map();
  for (const m of html.matchAll(/<li data-skill="([^"]+)"[^>]*>([^<]+)<\/li>/g)) labels.set(m[1], m[2].trim());
  return labels;
}

// The strip under the hero: the project in progress, or else the next one.
function nowStrip(projects) {
  const p = projects.find((x) => x.status === "progress") || projects.find((x) => x.status === "next");
  if (!p) return "";
  const label = p.status === "progress" ? "Now building" : "Up next";
  return `      <p class="now" data-now data-repo="${esc(p.repo)}"><span class="now__label">${label}</span> <a class="now__project" href="#${p.id}"><span class="id-chip">${p.id}</span> ${esc(p.title)}</a> <span class="now__commit" data-now-commit></span></p>`;
}

export function renderSite(html, projects, owner, today, warn = () => {}) {
  const labels = skillLabels(html);
  let next = setSection(html, "map-projects", projects.map((p) => mapCard(p, labels, warn)).join("\n"));
  next = setSection(next, "board", projects.map((p) => boardCard(p, owner)).join("\n"));
  if (next.includes("<!-- sync:now:start -->")) next = setSection(next, "now", nowStrip(projects));
  return stamp(html, next, today);
}

export function renderReadme(md, projects, today) {
  return stamp(md, setSection(md, "projects", readmeTable(projects)), today);
}

function report(projects, warnings) {
  const lines = projects.map((p) => {
    const bits = [statusLabel(p), p.live.public ? "public" : "not public yet"];
    if (p.live.headline) bits.push(`headline: ${p.live.headline}`);
    return `- ${p.id} ${p.title}: ${bits.join(", ")}`;
  });
  if (warnings.length) lines.push("", "Warnings:", ...warnings.map((w) => `- ${w}`));
  return `Synced the project cards from each project's repo (status, release, demo and the headline row of evals/results/summary.md).\n\n${lines.join("\n")}\n`;
}

async function rewrite(path, render) {
  const before = await readFile(path, "utf8");
  const after = render(before);
  if (after === before) return false;
  await writeFile(path, after);
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await readFile(args.data, "utf8"));
  const fetcher = args.offline
    ? offlineFetcher(JSON.parse(await readFile(args.offline, "utf8")))
    : liveFetcher(process.env.GITHUB_TOKEN);
  const warnings = [];
  const warn = (w) => warnings.includes(w) || warnings.push(w);
  const projects = await collect(config, fetcher, warn);
  const today = args.today || new Date().toISOString().slice(0, 10);
  let changed = false;
  if (args.site) changed = (await rewrite(args.site, (t) => renderSite(t, projects, config.owner, today, warn))) || changed;
  if (args.readme) changed = (await rewrite(args.readme, (t) => renderReadme(t, projects, today))) || changed;
  if (args.report) await writeFile(args.report, report(projects, warnings));
  for (const w of warnings) console.warn(`warning: ${w}`);
  console.log(changed ? "changed" : "no changes");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`sync failed: ${error.message}`);
    process.exit(1);
  });
}
