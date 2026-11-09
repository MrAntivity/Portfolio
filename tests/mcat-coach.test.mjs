import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { JSDOM } = createRequire(import.meta.url)("jsdom");
const dom = new JSDOM('<div id="host"></div>');
globalThis.window = dom.window;
const { mountCoach, clearCoaches } = await import("../mcat/study-coach.mjs");
const host = dom.window.document.getElementById("host");
test("in-flight answers appear after a lesson stage remount without duplicate requests", async () => {
  clearCoaches();
  let resolve,
    count = 0;
  const opts = {
    key: "a",
    userId: "u",
    title: "Test",
    context: {},
    request: () => {
      count++;
      return new Promise((r) => (resolve = r));
    },
  };
  const coach = mountCoach(host, opts);
  const task = coach.ask("Hint?");
  mountCoach(host, opts);
  assert.ok(host.textContent.includes("Thinking through"));
  resolve("### One idea\n\nUse the diagram.");
  await task;
  assert.equal(count, 1);
  assert.equal(host.querySelector("h3").textContent, "One idea");
  assert.equal(
    host.querySelector("[aria-busy]").getAttribute("aria-busy"),
    "false",
  );
});
test("a late answer cannot replace another question or account", async () => {
  clearCoaches();
  let resolve;
  const coach = mountCoach(host, {
    key: "a",
    userId: "u",
    context: {},
    request: () => new Promise((r) => (resolve = r)),
  });
  const task = coach.ask("First question");
  mountCoach(host, {
    key: "b",
    userId: "v",
    context: {},
    title: "Second question",
    request: async () => "",
  });
  resolve("Private first answer");
  await task;
  assert.equal(host.textContent.includes("Private first answer"), false);
  assert.equal(host.textContent.includes("Second question"), true);
});
test("failed requests preserve the prompt and retry without duplicate history", async () => {
  clearCoaches();
  let calls = 0,
    payload;
  const coach = mountCoach(host, {
    key: "a",
    userId: "u",
    context: {},
    request: async (p) => {
      payload = p;
      calls++;
      if (calls === 1) throw Error("offline");
      return "**Recovered**";
    },
  });
  await coach.ask("Explain this");
  assert.equal(host.querySelector("textarea").value, "Explain this");
  assert.ok(host.querySelector('[role="alert"]'));
  await coach.ask("Explain this");
  assert.equal(payload.messages.length, 1);
  assert.equal(host.querySelector("strong").textContent, "Recovered");
});
test("preview requests open sign in without invoking the service", async () => {
  clearCoaches();
  let login = 0;
  const coach = mountCoach(host, {
    key: "p",
    context: {},
    onLogin: () => login++,
    request: () => {
      throw Error("must not call");
    },
  });
  await coach.ask("Hint");
  assert.equal(login, 1);
  assert.equal(host.querySelector(".coach-message"), null);
});
