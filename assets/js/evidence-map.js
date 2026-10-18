// Evidence map: links each skill to the resume lines and projects that use it.
// The HTML is the data: skills are <li data-skill> in the skills panel, and each
// evidence card lists its skills as <li data-tag>. Without JavaScript the page
// still reads as a plain resume; this script only adds selection and connectors.
(() => {
  "use strict";

  const map = document.querySelector("[data-map]");
  if (!map) return;

  const statusText = map.querySelector("[data-map-status]");
  const clearButton = map.querySelector("[data-map-clear]");
  const svg = map.querySelector("[data-connectors]");
  const wide = window.matchMedia("(min-width: 960px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";

  const chips = new Map(); // skill id -> button
  const labels = new Map(); // skill id -> label
  const listedIn = new Map(); // skill id -> resume skills row (K1..K5) when no line names it
  const cardsBySkill = new Map(); // skill id -> cards
  const skillsByCard = new Map(); // card -> skill ids
  const cards = [...map.querySelectorAll("[data-evidence]")];
  const roles = [...map.querySelectorAll("[data-role-group]")];

  let state = null; // { type: "skill", id } | { type: "card", card }
  let drawn = false;

  // Upgrade skill list items into toggle buttons.
  for (const item of map.querySelectorAll(".map__skills [data-skill]")) {
    const id = item.dataset.skill;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skill";
    button.dataset.skill = id;
    button.setAttribute("aria-pressed", "false");
    button.textContent = item.textContent.trim();
    item.textContent = "";
    item.removeAttribute("data-skill");
    item.appendChild(button);
    chips.set(id, button);
    labels.set(id, button.textContent);
    if (item.dataset.listed) listedIn.set(id, item.dataset.listed);
    cardsBySkill.set(id, []);
    button.addEventListener("click", () => {
      if (state && state.type === "skill" && state.id === id) clear();
      else selectSkill(id);
    });
  }

  // Index each card's skills and upgrade its tags and title into buttons.
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
        selectSkill(id);
        if (!wide.matches) card.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
      });
    }
    skillsByCard.set(card, ids);

    const title = card.querySelector(".card__title");
    if (title) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      button.textContent = title.textContent.trim();
      title.textContent = "";
      title.appendChild(button);
      button.addEventListener("click", () => {
        if (state && state.type === "card" && state.card === card) clear();
        else selectCard(card);
      });
    }
  }

  function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
  }

  function resetClasses() {
    for (const chip of chips.values()) {
      chip.setAttribute("aria-pressed", "false");
      chip.classList.remove("is-related", "is-dim");
    }
    for (const card of cards) {
      card.classList.remove("is-match", "is-dim", "is-selected");
      const titleButton = card.querySelector(".card__title button");
      if (titleButton) titleButton.setAttribute("aria-pressed", "false");
      for (const b of card.querySelectorAll(".tags button")) b.classList.remove("is-active");
    }
    for (const role of roles) role.classList.remove("is-empty");
    map.classList.remove("has-selection", "is-filtering");
  }

  function selectSkill(id, { updateUrl = true } = {}) {
    resetClasses();
    state = { type: "skill", id };
    drawn = false;
    chips.get(id).setAttribute("aria-pressed", "true");

    const matches = cardsBySkill.get(id);
    for (const card of cards) {
      const isMatch = matches.includes(card);
      card.classList.toggle("is-match", isMatch);
      card.classList.toggle("is-dim", !isMatch);
      for (const b of card.querySelectorAll(`.tags button[data-skill="${id}"]`)) b.classList.add("is-active");
    }
    for (const role of roles) {
      role.classList.toggle("is-empty", !role.querySelector("[data-evidence].is-match"));
    }
    map.classList.add("has-selection", "is-filtering");

    const lines = matches.filter((c) => c.dataset.kind === "line").length;
    const projects = matches.filter((c) => c.dataset.kind === "project").length;
    const parts = [];
    if (lines) parts.push(plural(lines, "resume line", "resume lines"));
    if (projects) parts.push(plural(projects, "project in progress or planned", "projects in progress or planned"));
    let text = `${labels.get(id)}: ${parts.join(", ") || "no linked evidence"}.`;
    if (listedIn.has(id)) {
      text += ` Listed in my resume's skills (${listedIn.get(id)}); no single resume line names it.`;
    }
    announce(text);
    if (updateUrl) setUrl("skill", id);
    draw();
  }

  function selectCard(card, { updateUrl = true } = {}) {
    resetClasses();
    state = { type: "card", card };
    drawn = false;
    const ids = skillsByCard.get(card);
    for (const [id, chip] of chips) {
      chip.classList.toggle("is-related", ids.includes(id));
      chip.classList.toggle("is-dim", !ids.includes(id));
    }
    for (const other of cards) other.classList.toggle("is-dim", other !== card);
    card.classList.add("is-match", "is-selected");
    const titleButton = card.querySelector(".card__title button");
    if (titleButton) titleButton.setAttribute("aria-pressed", "true");
    map.classList.add("has-selection");

    const chipId = card.querySelector(".id-chip");
    const name = `${chipId ? chipId.textContent + " " : ""}${titleButton ? titleButton.textContent : card.id}`;
    announce(`${name} uses ${plural(ids.length, "skill", "skills")}: ${ids.map((i) => labels.get(i)).join(", ")}.`);
    if (updateUrl) setUrl("line", card.id);
    draw();
  }

  function clear({ updateUrl = true } = {}) {
    resetClasses();
    state = null;
    svg.replaceChildren();
    announce("Select a skill or a resume line.");
    if (updateUrl) setUrl(null);
  }

  function announce(text) {
    statusText.textContent = text;
    clearButton.hidden = state === null;
  }

  function setUrl(key, value) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("skill");
      url.searchParams.delete("line");
      if (key) url.searchParams.set(key, value);
      history.replaceState(null, "", url);
    } catch (e) {
      // Some embedded previews block history changes; the map still works.
    }
  }

  // Connectors: curves from the selected chip to its cards, or from the
  // selected card to its chips. Wide screens only; purely decorative.
  function draw() {
    svg.replaceChildren();
    if (!state || !wide.matches) return;
    // The SVG covers only the gutter between the columns, so it never sits over
    // text (an overlay there would stop contrast checkers reading the background).
    const box = map.getBoundingClientRect();
    const panel = map.querySelector(".map__skills").getBoundingClientRect();
    const column = map.querySelector(".map__evidence").getBoundingClientRect();
    const left = panel.right - box.left;
    svg.style.left = `${left}px`;
    svg.style.width = `${Math.max(0, column.left - panel.right)}px`;
    const pairs = [];

    if (state.type === "skill") {
      const chip = chips.get(state.id);
      for (const card of cardsBySkill.get(state.id)) pairs.push([chip, card]);
    } else {
      for (const id of skillsByCard.get(state.card)) pairs.push([chips.get(id), state.card]);
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
    if (previous && previous.type === "skill") chips.get(previous.id).focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state) clear();
  });

  // Deep links: ?skill=rag or ?line=E3
  const params = new URLSearchParams(window.location.search);
  const skill = params.get("skill");
  const line = params.get("line");
  if (skill && chips.has(skill)) selectSkill(skill, { updateUrl: false });
  else if (line) {
    const card = cards.find((c) => c.id === line);
    if (card) selectCard(card, { updateUrl: false });
  }
})();
