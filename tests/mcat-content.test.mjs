import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync(new URL("../mcat/curriculum.json", import.meta.url)),
);
test("all seven subjects have ten complete original foundation lessons", () => {
  assert.equal(data.subjects.length, 7);
  assert.equal(data.lessons.length, 70);
  const ids = new Set();
  for (const s of data.subjects)
    assert.equal(
      data.lessons.filter((l) => l.subject === s.id).length,
      10,
      s.id,
    );
  for (const l of data.lessons) {
    assert.ok(!ids.has(l.id));
    ids.add(l.id);
    assert.ok(l.summary.length > 100);
    assert.ok(l.keyPoints.length >= 2);
    assert.ok(l.workedExample.steps.length >= 2);
    assert.ok(l.visual.nodes.length >= 3);
    assert.ok(l.source.startsWith("https://"));
    for (const q of [l.check, l.transfer]) {
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
      assert.ok(q.explanation.length > 20);
    }
  }
});
test("all check and transfer stems are distinct", () => {
  const qs = data.lessons.flatMap((l) => [l.check, l.transfer]);
  assert.equal(new Set(qs.map((q) => q.prompt)).size, qs.length);
});
test("CARS checks and transfers supply their own passage evidence", () => {
  for (const l of data.lessons.filter((l) => l.subject === "cars"))
    for (const q of [l.check, l.transfer])
      assert.ok(q.passage?.length > 100, l.id);
});
