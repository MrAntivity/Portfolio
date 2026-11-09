import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
globalThis.window = dom.window;
const { renderAI } = await import("../mcat/ai-format.mjs");
function fragment(text) {
  return JSDOM.fragment(renderAI(text));
}
test("renders headings, lists, emphasis, and accessible equations", () => {
  const result = fragment(String.raw`### Renal clearance

Use **concentration** and flow.

\[ C = \frac{U \cdot V}{P} \]

- \(U\): urine concentration
- \(V\): flow rate`);
  assert.equal(result.querySelector("h3").textContent, "Renal clearance");
  assert.equal(result.querySelectorAll("li").length, 2);
  assert.equal(result.querySelector("strong").textContent, "concentration");
  assert.equal(result.querySelectorAll(".katex").length, 3);
  assert.ok(result.querySelector("math mfrac"));
});
test("removes executable markup, unsafe URLs, and remote images", () => {
  const result = fragment(
    "<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![remote](https://example.com/a.png)\n\n<script>alert(1)</script>",
  );
  assert.equal(result.querySelector("img,script,iframe"), null);
  assert.equal(result.querySelector('[onerror], [href^="javascript:"]'), null);
});
test("supports dollar math and preserves code without evaluating it", () => {
  const result = fragment("$$x^2$$ and $y$\n\n`\\(code\\)`");
  assert.equal(result.querySelectorAll(".katex").length, 2);
  assert.equal(result.querySelector("code").textContent, "\\(code\\)");
});
test("malformed or untrusted math remains safe and readable", () => {
  const result = fragment(
    String.raw`\[\invalid{x}\] \(\href{javascript:alert(1)}{click}\)`,
  );
  assert.ok(result.querySelector(".math-fallback"));
  assert.equal(result.querySelector('[href^="javascript:"]'), null);
});
