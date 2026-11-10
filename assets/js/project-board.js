// Project board: small live refreshes between the daily syncs, when the page loads.
//   - status: becomes "Shipped" once the latest release is v1.0.0 or later
//   - "Code" link: added once the repo is public
//   - the "right now" line: the latest commit on the project being built
// The words themselves (story, result) come only from the daily sync, so a number on the
// page is always one the results file backs. Everything is written with textContent, never
// innerHTML. If a request fails, the entry keeps the text already in the HTML.
import { isV1OrLater } from "./summary.js";

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

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function fill(card) {
  const repo = card.dataset.repo;
  const meta = await fetchCached(`https://api.github.com/repos/${OWNER}/${repo}`, "json");
  if (!meta.ok) return;

  if (!card.querySelector(".entry__links")) {
    const p = document.createElement("p");
    p.className = "entry__links";
    const a = document.createElement("a");
    a.href = meta.body.html_url;
    a.textContent = "Code";
    p.append(a);
    card.querySelector(".entry__skills")?.before(p);
  }

  const release = await fetchCached(`https://api.github.com/repos/${OWNER}/${repo}/releases/latest`, "json");
  const pill = card.querySelector("[data-pill]");
  if (pill && release.ok && isV1OrLater(release.body.tag_name)) {
    pill.dataset.status = "shipped";
    pill.textContent = `Shipped ${release.body.tag_name}`;
  }
}

function since(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return days < 30 ? `${days} days ago` : formatDate(iso);
}

// The now-building strip: the latest commit on that project's default branch, once it's public.
async function fillNow() {
  const strip = document.querySelector("[data-now][data-repo]");
  const slotEl = strip?.querySelector("[data-now-commit]");
  if (!slotEl) return;
  const result = await fetchCached(`https://api.github.com/repos/${OWNER}/${strip.dataset.repo}/commits?per_page=1`, "json");
  const latest = result.ok && Array.isArray(result.body) ? result.body[0] : null;
  if (!latest) return;
  const message = latest.commit.message.split("\n")[0];
  slotEl.textContent = `Latest commit ${since(latest.commit.committer.date)}: “${message}”.`;
}

if (window.fetch) fillNow().catch(() => {});

if (window.fetch) for (const card of cards) fill(card).catch(() => {});
