import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  conceptArt,
  subjectArt,
  supportedConceptIds,
} from "../mcat/concept-art.mjs";
const curriculum = JSON.parse(
  await readFile(new URL("../mcat/curriculum.json", import.meta.url)),
);
test("every curriculum lesson has an explicit accessible visual", () => {
  assert.equal(supportedConceptIds.length, 70);
  assert.deepEqual(
    [...supportedConceptIds].sort(),
    curriculum.lessons.map((l) => l.id).sort(),
  );
  for (const lesson of curriculum.lessons) {
    const html = conceptArt(lesson);
    assert.ok(html.includes('role="img"'), lesson.id);
    assert.ok(html.includes("<desc>"), lesson.id);
    assert.ok(html.includes("<figcaption>"), lesson.id);
    assert.ok(!html.includes("NaN"), lesson.id);
    assert.ok(!html.includes("undefined"), lesson.id);
    assert.ok(
      !/(?:<script|onload=|onclick=|<foreignObject|<image)/i.test(html),
      lesson.id,
    );
  }
});
test("subject thumbnails cover all seven subjects without network assets or duplicate IDs", () => {
  for (const subject of curriculum.subjects) {
    const html = subjectArt(subject.id);
    assert.ok(html.startsWith("<svg"), subject.id);
    assert.ok(!/\bid=|https?:/.test(html));
  }
});
test("unknown lesson and subject IDs fail closed", () => {
  assert.equal(conceptArt({ id: "missing" }), "");
  assert.equal(subjectArt("missing"), "");
});
test("kinetics and kidney models preserve essential scientific distinctions", () => {
  assert.match(
    conceptArt({ id: "biochemistry-enzyme-kinetics" }),
    /apparent Km increases while Vmax stays the same/,
  );
  assert.match(
    conceptArt({ id: "biology-kidney" }),
    /filtered amount − reabsorbed amount \+ secreted amount/,
  );
});
