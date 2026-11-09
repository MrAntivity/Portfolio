import test from "node:test";
import assert from "node:assert/strict";
import { gameState } from "../mcat/game.mjs";
const e = (correct, day, n) => ({ id: String(n), at: n, day, correct });
test("retries do not farm XP; learning from an error earns one recovery bonus", () => {
  const r = {
    q: {
      kind: "question",
      subject: "biology",
      history: [e(false, "2026-11-09", 1)],
    },
  };
  assert.equal(gameState(r).xp, 10);
  r.q.history.push(e(true, "2026-11-09", 2), e(true, "2026-11-09", 3));
  const g = gameState(r, "2026-11-09");
  assert.equal(g.xp, 15);
  assert.equal(g.todaysQuestions, 1);
  assert.equal(g.recoveries, 1);
});
test("lesson reward survives completion toggle and counts only once", () => {
  const r = {
    l: { kind: "lesson", complete: false, completedDay: "2026-11-09" },
  };
  assert.equal(gameState(r, "2026-11-09").xp, 50);
  r.l.complete = true;
  assert.equal(gameState(r, "2026-11-09").xp, 50);
});
test("streak allows today unfinished, handles month boundary, and resets after a gap", () => {
  const r = {
    q: {
      kind: "question",
      history: [e(true, "2026-10-31", 1), e(true, "2026-11-01", 2)],
    },
  };
  assert.equal(gameState(r, "2026-11-02").streak, 2);
  assert.equal(gameState(r, "2026-11-03").streak, 0);
});
test("existing progress receives XP without inventing activity dates", () => {
  const g = gameState(
    {
      l: { kind: "lesson", complete: true },
      q: {
        kind: "question",
        subject: "biology",
        history: [e(true, "2026-11-01", 1)],
      },
    },
    "2026-11-09",
  );
  assert.equal(g.xp, 65);
  assert.equal(g.todaysLessons, 0);
  assert.equal(g.level, 1);
});
test("streak badge remains earned after a break", () => {
  const r = {
    q: {
      kind: "question",
      history: [
        e(true, "2026-11-01", 1),
        e(true, "2026-11-02", 2),
        e(true, "2026-11-03", 3),
      ],
    },
  };
  const g = gameState(r, "2026-11-09");
  assert.equal(g.streak, 0);
  assert.equal(g.badges.find((b) => b[1] === "Three-day spark")[3], true);
});
test("world-hopping quest counts subjects, not repeated attempts", () => {
  const g = gameState(
    {
      a: {
        kind: "question",
        subject: "biology",
        history: [e(true, "2026-11-09", 1), e(true, "2026-11-09", 2)],
      },
      b: {
        kind: "question",
        subject: "physics",
        history: [e(false, "2026-11-09", 3)],
      },
    },
    "2026-11-09",
  );
  assert.equal(g.todaysSubjects, 2);
});
