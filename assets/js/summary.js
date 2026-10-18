// Reads the headline result from a project's evals/results/summary.md.
// Pure functions, so they run in the browser and in `node --test`.

// Splits one Markdown table row into trimmed cells, dropping **, _ and ` marks.
export function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim().replace(/[*_`]/g, ""));
}

// Finds the first Markdown table and returns its header and one row: the row
// whose first cell matches rowName (case-insensitive), or else the first row.
export function headline(markdown, rowName) {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i]) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    const header = cells(lines[i]);
    const rows = [];
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(cells(lines[j]));
    const row = rowName ? rows.find((r) => r[0].toLowerCase() === rowName.toLowerCase()) : rows[0];
    return row ? { header, row } : null;
  }
  return null;
}

// "Metric: baseline → this project" when the table follows the README template,
// otherwise the row's cells joined.
export function describe({ header, row }) {
  const col = (name) => header.findIndex((h) => h.toLowerCase() === name);
  const baseline = col("baseline");
  const ours = col("this project");
  if (baseline > 0 && ours > 0) return `${row[0]}: ${row[baseline]} → ${row[ours]}`;
  return row.join(" · ");
}

// True for release tags v1.0.0 and later: the project counts as shipped.
export function isV1OrLater(tag) {
  const m = /^v?(\d+)\./.exec(tag || "");
  return Boolean(m && Number(m[1]) >= 1);
}
