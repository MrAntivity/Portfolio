import test from "node:test";
import assert from "node:assert/strict";
import {
  metrics,
  reviewDue,
  daysUntil,
  chooseQuestions,
  safeText,
} from "../mcat/model.mjs";
test("first-attempt accuracy does not improve when retrying the same question", () => {
  const m = metrics({
    a: {
      kind: "question",
      history: [
        { id: "2", at: 2, correct: true },
        { id: "1", at: 1, correct: false },
      ],
    },
    b: { complete: true },
  });
  assert.equal(m.answered, 1);
  assert.equal(m.accuracy, 0);
  assert.equal(m.attempts, 2);
  assert.equal(m.lessons, 1);
});
test("due dates schedule errors sooner and flags immediately", () => {
  assert.equal(
    reviewDue({ history: [{ id: "1", at: 0, correct: false }] }, 86400000),
    true,
  );
  assert.equal(
    reviewDue({ history: [{ id: "1", at: 0, correct: true }] }, 86400000),
    false,
  );
  assert.equal(reviewDue({ flag: true }, 0), true);
});
test("exam countdown is date-based", () => {
  assert.equal(daysUntil("2027-08-28", "2027-08-27"), 1);
  assert.equal(daysUntil("2027-08-28", "2027-08-29"), 0);
});
test("practice filters exclude seen questions and preserve subject", () => {
  const bank = [
    { id: "a", subject: "bio" },
    { id: "b", subject: "bio" },
    { id: "c", subject: "physics" },
  ];
  assert.deepEqual(
    chooseQuestions(
      bank,
      { a: { history: [{}] } },
      { subject: "bio", filter: "unseen" },
    ).map((q) => q.id),
    ["b"],
  );
  assert.equal(safeText("<script>"), "&lt;script&gt;");
});
