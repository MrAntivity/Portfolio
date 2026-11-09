import { today, history, safeText as h } from "./model.mjs?v=visual-2";
import { gameState } from "./game.mjs?v=visual-2";
export function activityDays(records, day = today()) {
  const counts = new Map();
  const add = (d) => {
    if (d) counts.set(d, (counts.get(d) || 0) + 1);
  };
  for (const r of Object.values(records)) {
    if (r.kind === "lesson" && r.completedDay) add(r.completedDay);
    if (r.kind === "question") for (const e of history(r)) add(e.day);
  }
  return Array.from({ length: 28 }, (_, i) => {
    const date = new Date(Date.parse(day + "T12:00:00Z") - (27 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return { date, count: counts.get(date) || 0 };
  });
}
export function momentumHTML(records) {
  const g = gameState(records),
    days = activityDays(records);
  return `<section class="momentum panel" aria-label="Your study momentum"><header><span class="eyebrow">TODAY’S MOMENTUM</span><span>${g.todaysLessons} ${g.todaysLessons === 1 ? "lesson" : "lessons"} complete</span></header><h3>${Math.min(5, g.todaysQuestions)} <small>/ 5 practice questions</small></h3><div class="momentum-segments" aria-label="${g.todaysQuestions} questions practiced today">${Array.from({ length: 5 }, (_, i) => `<span class="${i < g.todaysQuestions ? "filled" : ""}"></span>`).join("")}</div><div class="activity-heading"><span>Last 28 days</span><span>${g.streak} day streak</span></div><div class="activity-grid">${days.map((d) => `<span tabindex="0" class="activity-cell intensity-${Math.min(3, Math.ceil(d.count / 3))}" aria-label="${d.date}: ${d.count} study actions" data-tooltip="${d.date} · ${d.count} study actions"></span>`).join("")}</div><p class="momentum-caption">Every session adds up. ${g.xp.toLocaleString()} XP earned.</p></section>`;
}
export function subjectRail(subjects, lessons, records) {
  const names = {
    behavioral: "Behavioral",
    biochemistry: "Biochem",
    biology: "Biology",
    cars: "CARS",
    general: "Gen chem",
    organic: "Organic",
    physics: "Physics",
  };
  return `<nav class="subject-rail" aria-label="Subject progress">${subjects
    .map((s) => {
      const ls = lessons.filter((l) => l.subject === s.id),
        done = ls.filter((l) => records["lesson-" + l.id]?.complete).length;
      return `<button data-subject="${h(s.id)}"><span>${names[s.id]}</span><div class="rail-progress"><i style="width:${(100 * done) / ls.length}%"></i></div><small>${done} / ${ls.length}</small></button>`;
    })
    .join("")}</nav>`;
}
