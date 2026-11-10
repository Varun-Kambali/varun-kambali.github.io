#!/usr/bin/env node
// Keeps the project entries on the site, and the projects section of the profile README,
// in step with each project's GitHub repo. Runs daily in GitHub Actions (.github/workflows/sync.yml)
// and by hand:  node scripts/sync.mjs --site index.html [--readme ../Varun-Kambali/README.md]
//
// Sources for every project in data/projects.json, plus any public repo tagged "portfolio"
// that carries a portfolio.json with an "id":
//   data/projects.json "story" and "result"   the words shown, written by hand in first person
//   portfolio.json in the project repo        overrides title, tagline, summary, story, result, measures,
//                                             skills, status, evalRow, demo
//   GET /repos/:owner/:repo                   public or not, homepage (demo), default branch
//   GET /repos/:owner/:repo/releases/latest   a v1.0.0 or later release marks the project Shipped
//   evals/results/summary.md                  every number in "result" must appear in it; if one doesn't,
//                                             the result is left out and the headline row shown instead
//   docs/case-study.md                        when present, linked as the project's case study (the why)
// A file is rewritten only when a section's content changes, and its "last updated" date moves
// only then, so a quiet day produces no diff and no pull request.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { headline, describe, isV1OrLater } from "../assets/js/summary.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_KEYS = ["title", "tagline", "summary", "story", "result", "measures", "skills", "status", "evalRow", "demo"];
const STATUS_LABEL = { progress: "In progress", next: "Next", planned: "Planned", shipped: "Shipped" };
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

// The numbers in a hand-written result sentence that the results file doesn't contain as a
// whole number ("26" doesn't count as found inside "2026"). A re-run that changes a number
// takes the sentence off the page until someone rewrites it.
export function unbackedNumbers(sentence, summary) {
  const numbers = sentence.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || [];
  return [...new Set(numbers)].filter((n) => {
    const pattern = new RegExp(`(?<![\\d.,])${n.replace(/[.,]/g, "\\$&")}(?![\\d]|[.,]\\d)`);
    return !pattern.test(summary);
  });
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
    if (await fetcher.raw(owner, info.name, branch, "docs/case-study.md")) {
      p.live.caseStudy = `${info.html_url}/blob/${branch}/docs/case-study.md`;
    }
    const summary = await fetcher.raw(owner, info.name, branch, "evals/results/summary.md");
    const found = summary ? headline(summary, p.evalRow) : null;
    if (found) {
      p.live.headline = describe(found);
      p.live.results = `${info.html_url}/blob/${branch}/evals/results/summary.md`;
    }
    if (p.result && summary) {
      const missing = unbackedNumbers(p.result, summary);
      if (missing.length) warn(`${p.id}: result names ${missing.join(", ")}, which evals/results/summary.md no longer has; showing the results row instead`);
      else p.live.result = p.result;
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

export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function statusLabel(p) {
  return p.status === "shipped" && p.live.release ? `Shipped ${p.live.release}` : STATUS_LABEL[p.status];
}

function skillTags(p, labels, warn, indent) {
  return p.skills
    .filter((id) => labels.has(id) || (warn(`${p.id}: skill "${id}" has no chip on the site; left out`), false))
    .map((id) => `${indent}<li data-tag="${esc(id)}">${esc(labels.get(id))}</li>`)
    .join("\n");
}

// Links a reader can follow, in the order they'd want them. Empty until the repo is public.
function links(p) {
  if (!p.live.url) return [];
  const out = [["Code", p.live.url]];
  if (p.live.demo) out.push(["Live demo", p.live.demo]);
  if (p.live.caseStudy) out.push(["Why I built it", p.live.caseStudy]);
  if (p.live.results) out.push(["Eval results", p.live.results]);
  return out;
}

// The measured result: the hand-written sentence when the results file still backs every
// number in it, else the results file's own headline row, else nothing.
function resultText(p) {
  if (p.live.result) return p.live.result;
  if (p.live.headline) return `Latest eval: ${p.live.headline}.`;
  return "";
}

const isActive = (p) => p.status === "shipped" || p.status === "progress";

// One entry per project: it is both the project's card and its evidence on the map.
function projectEntry(p, labels, warn) {
  const result = resultText(p);
  const linkList = links(p);
  const attrs = `${p.evalRow ? ` data-eval-row="${esc(p.evalRow)}"` : ""}${p.demo ? ` data-demo="${esc(p.demo)}"` : ""}`;
  const lines = [
    `          <article class="entry entry--project" id="${p.id}" data-evidence data-kind="project" data-project data-repo="${esc(p.repo)}"${attrs}>`,
    `            <h3 class="entry__title">${esc(p.title)}</h3>`,
    `            <p class="entry__status" data-pill data-status="${p.status}">${esc(statusLabel(p))}</p>`,
    `            <p>${esc(p.story || p.summary)}</p>`,
  ];
  if (result) lines.push(`            <p class="entry__result">${esc(result)}</p>`);
  if (linkList.length) {
    const anchors = linkList.map(([text, href]) => `<a href="${esc(href)}">${text}</a>`).join(" · ");
    lines.push(`            <p class="entry__links">${anchors}</p>`);
  }
  lines.push(
    `            <div class="entry__skills">`,
    `              <ul class="tags" aria-label="Skills it shows">`,
    skillTags(p, labels, warn, "                "),
    `              </ul>`,
    `            </div>`,
    `          </article>`,
  );
  return lines.join("\n");
}

// The README section: a short first-person entry per shipped or active project, then one
// line for what's coming. Plain Markdown, so it reads well on GitHub and in a text view.
export function readmeProjects(projects) {
  const blocks = projects.filter(isActive).map((p) => {
    const title = p.live.url ? `[${p.title}](${p.live.url})` : p.title;
    const status = statusLabel(p).replace(/^\w/, (c) => c.toLowerCase());
    const parts = [`### ${title} · ${status}`, p.story || p.summary];
    const result = resultText(p);
    if (result) parts.push(result);
    const linkList = links(p).slice(1);
    if (linkList.length) parts.push(linkList.map(([text, href]) => `[${text}](${href})`).join(" · "));
    return parts.join("\n\n");
  });
  const upcoming = projects.filter((p) => !isActive(p));
  if (upcoming.length) {
    const names = upcoming.map((p) => `**${p.title}**, ${p.tagline.replace(/^\w/, (c) => c.toLowerCase()).replace(/\.$/, "")}`);
    blocks.push(`Up next: ${names.join("; ")}.`);
  }
  return blocks.join("\n\n");
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

// The "right now" line in About: the project in progress, or else the next one.
function nowLine(projects) {
  const p = projects.find((x) => x.status === "progress") || projects.find((x) => x.status === "next");
  if (!p) return "";
  const lead = p.status === "progress" ? "Right now I'm building" : "Next I'm building";
  return `          <p class="now" data-now data-repo="${esc(p.repo)}">${lead} <a href="#${p.id}">${esc(p.title)}</a>. <span class="now__commit" data-now-commit></span></p>`;
}

export function renderSite(html, projects, owner, today, warn = () => {}) {
  const labels = skillLabels(html);
  let next = setSection(html, "board", projects.map((p) => projectEntry(p, labels, warn)).join("\n"));
  if (next.includes("<!-- sync:now:start -->")) next = setSection(next, "now", nowLine(projects));
  return stamp(html, next, today);
}

export function renderReadme(md, projects, today) {
  return stamp(md, setSection(md, "projects", readmeProjects(projects)), today);
}

function report(projects, warnings) {
  const lines = projects.map((p) => {
    const bits = [statusLabel(p), p.live.public ? "public" : "not public yet"];
    if (p.live.result) bits.push(`result: ${p.live.result}`);
    else if (p.live.headline) bits.push(`results row: ${p.live.headline}`);
    return `- ${p.id} ${p.title}: ${bits.join(", ")}`;
  });
  if (warnings.length) lines.push("", "Warnings:", ...warnings.map((w) => `- ${w}`));
  return `Synced the project entries from each project's repo (status, release, demo, case study and evals/results/summary.md).\n\n${lines.join("\n")}\n`;
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
