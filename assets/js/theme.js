// Theme toggle: auto (follow the OS) → light → dark. The choice is remembered
// when storage is available. The inline script in <head> applies it before paint.
(() => {
  "use strict";

  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  const root = document.documentElement;
  const order = ["auto", "light", "dark"];

  function current() {
    return root.getAttribute("data-theme") || "auto";
  }

  function render() {
    const theme = current();
    button.textContent = `Theme: ${theme}`;
    button.setAttribute("aria-label", `Theme: ${theme}. Switch theme`);
  }

  button.addEventListener("click", () => {
    const next = order[(order.indexOf(current()) + 1) % order.length];
    if (next === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch (e) {
      // Private windows can block storage; the theme still applies for this visit.
    }
    render();
  });

  button.hidden = false;
  render();
})();
