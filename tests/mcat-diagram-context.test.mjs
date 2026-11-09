import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { JSDOM } = createRequire(import.meta.url)("jsdom");
import { conceptArt } from "../mcat/concept-art.mjs";
import { practiceArt } from "../mcat/practice-art.mjs";
import {
  diagramContext,
  withDiagramContext,
} from "../mcat/diagram-context.mjs";
test("tutor receives actual enzyme legend colors rather than inventing them", () => {
  const dom = new JSDOM(
    '<main><div class="lesson-stage">' +
      conceptArt({ id: "biochemistry-enzyme-kinetics" }) +
      "</div></main>",
  );
  const data = diagramContext(dom.window.document);
  assert.deepEqual(
    data.diagramLabels.find((x) => x.label === "Uninhibited"),
    { label: "Uninhibited", color: "blue / cyan" },
  );
  assert.equal(
    data.diagramLabels.find((x) => x.label.includes("Competitive inhibitor"))
      .color,
    "orange / amber",
  );
  assert.match(
    withDiagramContext({ lesson: "Background" }, data).lesson,
    /exact labels/,
  );
});
test("practice visual context excludes worked formulas before the answer is checked", () => {
  const html = practiceArt({ family: "ohm", topic: "Circuits" });
  const dom = new JSDOM('<div class="practice-stage">' + html + "</div>");
  const data = diagramContext(dom.window.document);
  const context = withDiagramContext(
    { question: { prompt: "What voltage?" } },
    data,
  );
  assert.equal(JSON.stringify(context).includes("V = IR"), false);
  assert.equal(context.question.displayedVisual.diagramLabels.length > 0, true);
});
