import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { labHTML, labModel, supportedLabIds } from "../mcat/visuals.js";
const curriculum = JSON.parse(
  readFileSync(new URL("../mcat/curriculum.json", import.meta.url)),
);
test("all 15 labs target real lessons across all seven subjects", () => {
  assert.equal(supportedLabIds.length, 15);
  const subjects = new Set();
  for (const id of supportedLabIds) {
    const lesson = curriculum.lessons.find((l) => l.id === id);
    assert.ok(lesson, id);
    subjects.add(lesson.subject);
    assert.match(labHTML(id), /class="concept-lab"/);
    assert.match(labModel(id).graphic, /role="img"/);
    assert.ok(!/NaN|undefined/.test(JSON.stringify(labModel(id))), id);
  }
  assert.equal(subjects.size, 7);
  assert.equal(labHTML("biology"), "");
  assert.equal(labModel("unknown"), null);
});
test("competitive inhibition preserves Vmax and shifts apparent Km", () => {
  const base = labModel("biochemistry-enzyme-kinetics", {
    substrate: 2,
    inhibitor: 0,
  }).data;
  const inhibited = labModel("biochemistry-enzyme-kinetics", {
    substrate: 2,
    inhibitor: 1,
  }).data;
  assert.equal(base.rate, 50);
  assert.equal(base.apparentKm, 2);
  assert.equal(inhibited.apparentKm, 4);
  assert.equal(inhibited.vmax, base.vmax);
  assert.ok(inhibited.rate < base.rate);
});
test("Mendelian square keeps independent 25-percent gamete pairings", () => {
  assert.equal(
    labModel("biology-inheritance", { parent1: 1, parent2: 1 }).data.chance,
    0.25,
  );
  assert.equal(
    labModel("biology-inheritance", { parent1: 0, parent2: 2 }).data.chance,
    0,
  );
  assert.equal(
    labModel("biology-inheritance", { parent1: 2, parent2: 2 }).data.chance,
    1,
  );
});
test("osmotic direction respects equal concentrations", () => {
  assert.equal(
    labModel("biology-membranes", { outside: 5 }).data.direction,
    "balanced",
  );
  assert.equal(
    labModel("biology-membranes", { outside: 8 }).data.direction,
    "out",
  );
  assert.equal(
    labModel("biology-membranes", { outside: 2 }).data.direction,
    "in",
  );
});
test("conservation and quantitative relationships stay consistent", () => {
  assert.equal(
    labModel("biochemistry-bioenergetics", { uphill: 20, downhill: 35 }).data
      .net,
    -15,
  );
  assert.equal(labModel("general-buffers", { ratio: 0 }).data.ph, 4.8);
  assert.equal(labModel("general-gases", { volume: 2 }).data.pressure, 5);
  assert.equal(labModel("physics-forces", { force: 20, mass: 2 }).data.a, 10);
  assert.equal(
    labModel("physics-circuits", { voltage: 6, resistance: 3 }).data.current,
    2,
  );
  assert.equal(labModel("physics-waves", { frequency: 3 }).data.wavelength, 4);
  assert.equal(
    labModel("organic-separation", { partition: 1, volume: 50 }).data.fraction,
    0.5,
  );
  assert.equal(
    labModel("organic-stereochemistry", { positive: 50 }).data.rotation,
    0,
  );
  assert.equal(
    labModel("organic-stereochemistry", { positive: 75 }).data.ee,
    50,
  );
});
test("conditioning classifies behavior effects and stimulus direction independently", () => {
  assert.equal(
    labModel("behavioral-conditioning", { change: 1, behavior: 0 }).data.name,
    "Negative reinforcement",
  );
  assert.equal(
    labModel("behavioral-conditioning", { change: 0, behavior: 1 }).data.name,
    "Positive punishment",
  );
});
