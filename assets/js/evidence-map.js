// Evidence map: links each skill to the resume lines and projects that use it.
// The HTML is the data: skills are <li data-skill> in the skills panel, each evidence
// card lists its skills as <li data-tag>, a hiring lens is <li data-lens data-skills>,
// and a career step is <li data-role-filter> pointing at a role section. Without
// JavaScript the page still reads as a plain resume; this script adds selection,
// connectors and shareable links (?skill=, ?line=, ?lens=, ?role=).
(() => {
  "use strict";

  const map = document.querySelector("[data-map]");
  if (!map) return;

  const statusText = map.querySelector("[data-map-status]");
  const clearButton = map.querySelector("[data-map-clear]");
  const copyButton = map.querySelector("[data-map-copy]");
  const svg = map.querySelector("[data-connectors]");
  const wide = window.matchMedia("(min-width: 1024px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const IDLE = "Nothing highlighted yet.";

  const chips = new Map(); // skill id -> button
  const labels = new Map(); // skill id -> label
  const listedIn = new Map(); // skill id -> resume skills row (K1..K5) when no line names it
  const cardsBySkill = new Map(); // skill id -> cards
  const skillsByCard = new Map(); // card -> skill ids
  const lenses = new Map(); // lens id -> { button, label, skills }
  const roles = new Map(); // role section id -> { button, label, section }
  const cards = [...map.querySelectorAll("[data-evidence]")];
  const roleGroups = [...map.querySelectorAll("[data-role-group]")];

  let state = null; // { kind: "skill" | "card" | "lens" | "role", id }
  let drawn = false;

  function toggleButton(item, className) {
    const button = document.createElement("button");
    button.type = "button";
    if (className) button.className = className;
    button.setAttribute("aria-pressed", "false");
    button.append(...item.childNodes);
    item.appendChild(button);
    return button;
  }

  // Skill chips.
  for (const item of map.querySelectorAll(".map__skills [data-skill]")) {
    const id = item.dataset.skill;
    const button = toggleButton(item, "skill");
    button.dataset.skill = id;
    item.removeAttribute("data-skill");
    chips.set(id, button);
    labels.set(id, button.textContent.trim());
    if (item.dataset.listed) listedIn.set(id, item.dataset.listed);
    cardsBySkill.set(id, []);
    button.addEventListener("click", () => toggle("skill", id));
  }

  // Cards: index their skills, turn tags into skill buttons and titles into line toggles.
  for (const card of cards) {
    const ids = [];
    for (const tag of card.querySelectorAll("[data-tag]")) {
      const id = tag.dataset.tag;
      if (!cardsBySkill.has(id)) {
        console.warn(`Evidence map: card ${card.id} uses unknown skill "${id}"`);
        continue;
      }
      ids.push(id);
      cardsBySkill.get(id).push(card);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.skill = id;
      button.textContent = tag.textContent.trim();
      button.setAttribute("aria-label", `Show all evidence for ${labels.get(id)}`);
      tag.textContent = "";
      tag.appendChild(button);
      button.addEventListener("click", () => {
        select("skill", id);
        if (!wide.matches) card.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
      });
    }
    skillsByCard.set(card, ids);
    const title = card.querySelector(".entry__title");
    if (title) toggleButton(title).addEventListener("click", () => toggle("card", card.id));
  }

  // Hiring lenses: named sets of skills.
  for (const item of document.querySelectorAll("[data-lens]")) {
    const skills = item.dataset.skills.split(/\s+/).filter((id) => chips.has(id));
    const button = toggleButton(item, "lens");
    lenses.set(item.dataset.lens, { button, label: button.textContent.trim(), skills });
    button.addEventListener("click", () => toggle("lens", item.dataset.lens));
  }

  // Career steps: each points at a role section in the map.
  for (const item of document.querySelectorAll("[data-role-filter]")) {
    const id = item.dataset.roleFilter;
    const section = map.querySelector(`[data-role-group][aria-labelledby="${id}"]`);
    if (!section) continue;
    const button = toggleButton(item);
    roles.set(id, { button, label: button.textContent.trim().split(" · ")[0], section });
    button.addEventListener("click", () => {
      toggle("role", id);
      // A role's cards can sit far below the timeline, so bring them into view.
      if (state?.kind === "role") section.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
    });
  }

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const kinds = { skill: "skill", card: "line", lens: "lens", role: "role" };

  function counts(matches) {
    const lines = matches.filter((c) => c.dataset.kind === "line").length;
    const projects = matches.filter((c) => c.dataset.kind === "project").length;
    const parts = [];
    if (lines) parts.push(plural(lines, "resume line", "resume lines"));
    if (projects) parts.push(plural(projects, "project", "projects"));
    return parts.join(" and ") || "no linked evidence";
  }

  function resetClasses() {
    for (const chip of chips.values()) {
      chip.setAttribute("aria-pressed", "false");
      chip.classList.remove("is-related", "is-dim");
    }
    for (const { button } of [...lenses.values(), ...roles.values()]) button.setAttribute("aria-pressed", "false");
    for (const card of cards) {
      card.classList.remove("is-match", "is-dim", "is-selected");
      const titleButton = card.querySelector(".entry__title button");
      if (titleButton) titleButton.setAttribute("aria-pressed", "false");
      for (const b of card.querySelectorAll(".tags button")) b.classList.remove("is-active");
    }
    for (const group of roleGroups) group.classList.remove("is-empty");
    map.classList.remove("has-selection", "is-filtering");
  }

  function highlight(matches, related, filter) {
    for (const card of cards) {
      const isMatch = matches.includes(card);
      card.classList.toggle("is-match", isMatch);
      card.classList.toggle("is-dim", !isMatch);
    }
    if (related) {
      for (const [id, chip] of chips) {
        chip.classList.toggle("is-related", related.includes(id));
        chip.classList.toggle("is-dim", !related.includes(id));
      }
    }
    if (filter) {
      for (const group of roleGroups) group.classList.toggle("is-empty", !group.querySelector("[data-evidence].is-match"));
      map.classList.add("is-filtering");
    }
    map.classList.add("has-selection");
  }

  function select(kind, id, { updateUrl = true } = {}) {
    resetClasses();
    state = { kind, id };
    drawn = false;
    let text = "";

    if (kind === "skill") {
      const matches = cardsBySkill.get(id);
      chips.get(id).setAttribute("aria-pressed", "true");
      for (const card of matches) for (const b of card.querySelectorAll(`.tags button[data-skill="${id}"]`)) b.classList.add("is-active");
      highlight(matches, null, true);
      text = `${labels.get(id)}: ${counts(matches)}.`;
      if (listedIn.has(id)) text += ` Listed in my resume's skills (${listedIn.get(id)}); no single resume line names it.`;
    } else if (kind === "card") {
      const card = cards.find((c) => c.id === id);
      const ids = skillsByCard.get(card);
      highlight([card], ids, false);
      card.classList.add("is-selected");
      card.querySelector(".entry__title button")?.setAttribute("aria-pressed", "true");
      const name = card.querySelector(".entry__title")?.textContent.trim().replace(/\s+/g, " ") || id;
      text = `${name} uses ${plural(ids.length, "skill", "skills")}: ${ids.map((i) => labels.get(i)).join(", ")}.`;
    } else if (kind === "lens") {
      const lens = lenses.get(id);
      const matches = cards.filter((c) => skillsByCard.get(c).some((s) => lens.skills.includes(s)));
      lens.button.setAttribute("aria-pressed", "true");
      highlight(matches, lens.skills, true);
      text = `Hiring for ${lens.label}: ${counts(matches)} match.`;
    } else if (kind === "role") {
      const role = roles.get(id);
      const matches = cards.filter((c) => role.section.contains(c));
      const related = [...new Set(matches.flatMap((c) => skillsByCard.get(c)))];
      role.button.setAttribute("aria-pressed", "true");
      highlight(matches, related, true);
      text = `${role.label}: ${counts(matches)}, using ${plural(related.length, "skill", "skills")}.`;
    }

    announce(text);
    if (updateUrl) setUrl(kinds[kind], id);
    draw();
  }

  function toggle(kind, id) {
    if (state && state.kind === kind && state.id === id) clear();
    else select(kind, id);
  }

  function clear({ updateUrl = true } = {}) {
    resetClasses();
    state = null;
    svg.replaceChildren();
    announce(IDLE);
    if (updateUrl) setUrl(null);
  }

  function announce(text) {
    statusText.textContent = text;
    clearButton.hidden = state === null;
    if (copyButton) copyButton.hidden = state === null || !navigator.clipboard;
  }

  function setUrl(key, value) {
    try {
      const url = new URL(window.location.href);
      for (const k of Object.values(kinds)) url.searchParams.delete(k);
      if (key) url.searchParams.set(key, value);
      history.replaceState(null, "", url);
    } catch (e) {
      // Some embedded previews block history changes; the map still works.
    }
  }

  // Connectors: curves from the selected chip to its cards, or from the selected card
  // to its chips. Wide screens only, and only for single skills or lines; lenses and
  // roles light up many items at once, where lines would only add noise.
  function draw() {
    svg.replaceChildren();
    if (!state || !wide.matches || (state.kind !== "skill" && state.kind !== "card")) return;
    // The SVG covers only the gutter between the columns, so it never sits over
    // text (an overlay there would stop contrast checkers reading the background).
    const box = map.getBoundingClientRect();
    const panel = map.querySelector(".map__skills").getBoundingClientRect();
    const column = map.querySelector(".map__evidence").getBoundingClientRect();
    const left = panel.right - box.left;
    svg.style.left = `${left}px`;
    svg.style.width = `${Math.max(0, column.left - panel.right)}px`;
    const pairs = [];

    if (state.kind === "skill") {
      const chip = chips.get(state.id);
      for (const card of cardsBySkill.get(state.id)) pairs.push([chip, card]);
    } else {
      const card = cards.find((c) => c.id === state.id);
      for (const id of skillsByCard.get(card)) pairs.push([chips.get(id), card]);
    }

    for (const [chip, card] of pairs) {
      const c = chip.getBoundingClientRect();
      const k = card.getBoundingClientRect();
      // Start at the panel's edge, level with the chip, so curves never cross other chips.
      const x1 = 3;
      const y1 = clamp(c.top + c.height / 2, panel.top + 4, panel.bottom - 4) - box.top;
      const x2 = k.left - box.left - left;
      const y2 = k.top + 28 - box.top;
      const dx = Math.max(24, (x2 - x1) / 2);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      svg.appendChild(path);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cx", x1);
      dot.setAttribute("cy", y1);
      dot.setAttribute("r", 3);
      svg.appendChild(dot);
      if (!drawn && !reducedMotion.matches) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.getBoundingClientRect();
        path.style.strokeDashoffset = "0";
      }
    }
    drawn = true;
  }

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  let frame = 0;
  function scheduleDraw() {
    if (frame || !state) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }
  window.addEventListener("scroll", scheduleDraw, { passive: true });
  map.querySelector(".map__skills").addEventListener("scroll", scheduleDraw, { passive: true });
  window.addEventListener("resize", scheduleDraw);
  wide.addEventListener("change", scheduleDraw);
  for (const d of map.querySelectorAll("details")) d.addEventListener("toggle", scheduleDraw);

  clearButton.addEventListener("click", () => {
    const previous = state;
    clear();
    if (previous?.kind === "skill") chips.get(previous.id).focus();
    else if (previous?.kind === "lens") lenses.get(previous.id).button.focus();
    else if (previous?.kind === "role") roles.get(previous.id).button.focus();
  });

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      statusText.textContent = `${statusText.textContent} Link copied.`;
    } catch (e) {
      statusText.textContent = "Couldn't copy here; copy the address bar instead.";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state) clear();
  });

  // On phones the full skills index starts folded, so the page opens on the person, not a list.
  // On wide screens it is always open (its toggle is hidden there).
  const index = document.querySelector("[data-skills-index]");
  if (index) {
    index.open = wide.matches;
    wide.addEventListener("change", () => {
      index.open = wide.matches;
    });
  }

  // Deep links: ?skill=rag, ?line=E3, ?lens=agents or ?role=role-searce
  const params = new URLSearchParams(window.location.search);
  const skill = params.get("skill");
  const line = params.get("line");
  const lens = params.get("lens");
  const role = params.get("role");
  if (skill && chips.has(skill)) select("skill", skill, { updateUrl: false });
  else if (line && cards.some((c) => c.id === line)) select("card", line, { updateUrl: false });
  else if (lens && lenses.has(lens)) select("lens", lens, { updateUrl: false });
  else if (role && roles.has(role)) select("role", role, { updateUrl: false });
  else announce(IDLE);
})();
