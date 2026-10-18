// Marks the sidebar link for the section being read, with the same highlighter
// mark the evidence map uses. Purely an enhancement: links work without it.
(() => {
  "use strict";

  const links = new Map(
    [...document.querySelectorAll('.nav a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a]),
  );
  const sections = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length || !("IntersectionObserver" in window)) return;

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      const current = sections.find((s) => visible.has(s.id));
      for (const [id, link] of links) {
        if (current && id === current.id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
    },
    { rootMargin: "-35% 0px -60% 0px" },
  );
  for (const section of sections) observer.observe(section);
})();
