import test from "node:test";
import assert from "node:assert/strict";
import { buildBank } from "../mcat/bank.mjs";
import { practiceArt, PRACTICE_ART_FAMILIES } from "../mcat/practice-art.mjs";
const bank = buildBank();
const examples = [...new Map(bank.map((q) => [q.family, q])).values()];
test("every question family has a specific, accessible conceptual setup", () => {
  assert.equal(examples.length, 54);
  assert.deepEqual(
    [...PRACTICE_ART_FAMILIES].sort(),
    examples.map((q) => q.family).sort(),
  );
  for (const q of examples) {
    const html = practiceArt(q);
    assert.match(html, /role="img"/);
    assert.match(html, /<figcaption>[^<]+<\/figcaption>/);
    assert.doesNotMatch(html, /undefined|NaN|<script|onload=/);
  }
});
test("unrevealed diagrams cannot inspect answer choices, answers, or explanations", () => {
  for (const q of examples) {
    const trap = { ...q };
    for (const key of ["answer", "explanation", "choices"])
      Object.defineProperty(trap, key, {
        get() {
          throw Error("Solution leaked");
        },
      });
    assert.equal(practiceArt(trap), practiceArt(q));
    assert.doesNotMatch(practiceArt(trap), /visual-takeaway/);
  }
});
test("worked formulas are shown only after revealing a solution", () => {
  assert.doesNotMatch(
    practiceArt({ family: "clearance" }),
    /urine concentration × urine flow/,
  );
  assert.match(
    practiceArt({ family: "clearance" }, { revealed: true }),
    /urine concentration × urine flow/,
  );
  assert.equal(practiceArt({ family: "unknown" }), "");
});
test("question-derived labels are escaped", () => {
  assert.doesNotMatch(
    practiceArt({ family: "force", topic: '"><script>alert(1)</script>' }),
    /<script>/,
  );
});
