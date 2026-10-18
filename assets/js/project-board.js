// Project board: fills each project card from its GitHub repo when the page loads.
//   - repo link and last push: GitHub REST API (no token; 60 requests/hour per visitor)
//   - demo: the card's data-demo, or else the repo's "homepage" field
//   - status: becomes "Shipped" once the latest release is v1.0.0 or later
//   - headline eval: first data row of evals/results/summary.md (or the row named
//     in data-eval-row), read from raw.githubusercontent.com
// Everything is written with textContent, never innerHTML. If a request fails,
// the card keeps the honest static text that is already in the HTML.
import { headline, describe, isV1OrLater } from "./summary.js";

const OWNER = "Varun-Kambali";
const CACHE_MS = 10 * 60 * 1000;
const cards = [...document.querySelectorAll("[data-project][data-repo]")];

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const { at, value } = JSON.parse(raw);
    return Date.now() - at < CACHE_MS ? value : undefined;
  } catch (e) {
    return undefined;
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch (e) {
    // Storage can be full or blocked; caching is optional.
  }
}

// Returns { ok: true, body } | { ok: false, missing: boolean }
async function fetchCached(url, as) {
  const cached = cacheGet(url);
  if (cached !== undefined) return cached;
  let result;
  try {
    const response = await fetch(url, { headers: as === "json" ? { Accept: "application/vnd.github+json" } : {} });
    if (response.ok) result = { ok: true, body: as === "json" ? await response.json() : await response.text() };
    else result = { ok: false, missing: response.status === 404 };
  } catch (e) {
    result = { ok: false, missing: false };
  }
  if (result.ok || result.missing) cacheSet(url, result);
  return result;
}

function slot(card, name) {
  return card.querySelector(`[data-slot="${name}"]`);
}

function setLink(el, href, text) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  el.replaceChildren(a);
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}



async function fill(card) {
  const repo = card.dataset.repo;
  const meta = await fetchCached(`https://api.github.com/repos/${OWNER}/${repo}`, "json");
  if (!meta.ok) return meta.missing ? "missing" : "error";

  const info = meta.body;
  setLink(slot(card, "repo"), info.html_url, `github.com/${OWNER}/${repo}`);
  slot(card, "updated").textContent = formatDate(info.pushed_at);

  const demo = card.dataset.demo || info.homepage;
  if (demo && /^https:\/\//.test(demo)) setLink(slot(card, "demo"), demo, demo.replace(/^https:\/\//, "").replace(/\/$/, ""));

  const release = await fetchCached(`https://api.github.com/repos/${OWNER}/${repo}/releases/latest`, "json");
  if (release.ok && isV1OrLater(release.body.tag_name)) {
    for (const pill of [card.querySelector("[data-pill]"), document.querySelector(`#map-${card.id} .pill`)]) {
      if (!pill) continue;
      pill.dataset.status = "shipped";
      pill.replaceChildren();
      const glyph = document.createElement("span");
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = "●";
      pill.append(glyph, ` Shipped ${release.body.tag_name}`);
    }
  }

  const branch = info.default_branch || "main";
  const path = "evals/results/summary.md";
  const summary = await fetchCached(`https://raw.githubusercontent.com/${OWNER}/${repo}/${branch}/${path}`, "text");
  if (summary.ok) {
    const found = headline(summary.body, card.dataset.evalRow);
    const value = card.querySelector("[data-slot-value]");
    if (found && value) {
      value.textContent = describe(found);
      value.classList.add("is-live");
      const source = document.createElement("a");
      source.href = `https://github.com/${OWNER}/${repo}/blob/${branch}/${path}`;
      source.textContent = "results file";
      slot(card, "eval").append(" ", source);
    }
  }
  return "ok";
}

if (cards.length && window.fetch) {
  Promise.all(cards.map((card) => fill(card).catch(() => "error"))).then((results) => {
    if (!results.includes("error")) return;
    const note = document.querySelector("[data-board-note]");
    if (note) note.textContent = "GitHub didn't answer just now, so some cards show their saved status. Reload to try again.";
  });
}
