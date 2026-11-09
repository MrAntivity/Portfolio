import { test } from "node:test";
import assert from "node:assert/strict";
import { activityDays } from "../mcat/study-layout.mjs";
test("activity uses dated records across year boundaries and stays empty for a fresh account", () => {
  const rows = activityDays({}, "2027-01-05");
  assert.equal(rows.length, 28);
  assert.equal(rows[0].date, "2026-12-09");
  assert.equal(rows.at(-1).date, "2027-01-05");
  assert.equal(
    rows.reduce((n, r) => n + r.count, 0),
    0,
  );
  const actual = activityDays(
    {
      a: { kind: "lesson", completedDay: "2027-01-05" },
      b: {
        kind: "question",
        history: [
          { id: "1", at: 1, day: "2027-01-05" },
          { id: "2", at: 2, day: "2027-01-04" },
        ],
      },
      c: { kind: "lesson", complete: true },
    },
    "2027-01-05",
  );
  assert.equal(actual.at(-1).count, 2);
  assert.equal(actual.at(-2).count, 1);
});
