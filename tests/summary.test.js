import { test } from "node:test";
import assert from "node:assert/strict";
import { cells, headline, describe, isV1OrLater } from "../assets/js/summary.js";

const SUMMARY = `# Eval results
Date: 2026-11-01 · model: example · commit: abc1234

| Metric | Baseline | This project | How measured |
|---|---|---|---|
| **Calorie MAPE** | 31.2% | 6.4% | \`make eval\` |
| Protein within ±10% | 40% | 88% | same run |
`;

test("cells trims and strips Markdown emphasis", () => {
  assert.deepEqual(cells("| **a** | `b` | _c_ |"), ["a", "b", "c"]);
});

test("headline takes the first data row by default", () => {
  assert.equal(describe(headline(SUMMARY)), "Calorie MAPE: 31.2% → 6.4%");
});

test("headline can pick a named row, case-insensitively", () => {
  assert.equal(describe(headline(SUMMARY, "protein within ±10%")), "Protein within ±10%: 40% → 88%");
});

test("headline returns null when there is no table or no such row", () => {
  assert.equal(headline("No results yet."), null);
  assert.equal(headline(SUMMARY, "latency"), null);
});

test("describe falls back to joined cells for other table shapes", () => {
  assert.equal(describe(headline("| A | B |\n|---|---|\n| x | y |")), "x · y");
});

test("isV1OrLater marks v1.0.0 and later as shipped", () => {
  assert.equal(isV1OrLater("v1.0.0"), true);
  assert.equal(isV1OrLater("2.3.0"), true);
  assert.equal(isV1OrLater("v0.4.2"), false);
  assert.equal(isV1OrLater(undefined), false);
});
