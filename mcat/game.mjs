import { today, history } from "./model.mjs?v=edge-1";
export const WORLDS = {
  behavioral: ["PS", "01 / HUMAN BEHAVIOR", "#a9a1db"],
  biochemistry: ["BC", "02 / MOLECULAR SYSTEMS", "#a0bca8"],
  biology: ["BIO", "03 / LIVING SYSTEMS", "#86b7ba"],
  cars: ["CARS", "04 / REASONING", "#b9ab93"],
  general: ["GC", "05 / FOUNDATIONS", "#94aed1"],
  organic: ["OC", "06 / CARBON SYSTEMS", "#bf9aab"],
  physics: ["PHY", "07 / PHYSICAL SYSTEMS", "#9fa9cb"],
};
const previousDay = (d) =>
  new Date(Date.parse(d + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
export function gameState(records, day = today()) {
  let xp = 0,
    questions = 0,
    recoveries = 0,
    lessons = 0;
  const dates = new Set(),
    subjects = new Set(),
    todaysQuestions = new Set(),
    todaysSubjects = new Set();
  let todaysLessons = 0,
    todaysRecoveries = 0;
  for (const [id, r] of Object.entries(records)) {
    if (
      r.kind === "lesson" &&
      (r.complete || r.completedDay || r.completedEver)
    ) {
      xp += 50;
      lessons++;
      if (r.completedDay) {
        dates.add(r.completedDay);
        if (r.completedDay === day) todaysLessons++;
      }
    }
    const events = history(r);
    if (r.kind !== "question" || !events.length) continue;
    questions++;
    xp += 10;
    if (events[0].correct) xp += 5;
    subjects.add(r.subject);
    const recovery = !events[0].correct && events.find((e) => e.correct);
    if (recovery) {
      xp += 5;
      recoveries++;
      if (recovery.day === day) todaysRecoveries++;
    }
    for (const e of events) {
      dates.add(e.day);
      if (e.day === day) {
        todaysQuestions.add(id);
        todaysSubjects.add(r.subject);
      }
    }
  }
  let streak = 0,
    cursor = dates.has(day) ? day : previousDay(day);
  while (dates.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  let bestStreak = 0,
    run = 0,
    last = "";
  for (const date of [...dates].sort()) {
    run = previousDay(date) === last ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    last = date;
  }
  const level = Math.floor(xp / 250) + 1,
    progress = xp % 250;
  const badges = [
    ["🌱", "First checkpoint", "Finish your first lesson", lessons >= 1],
    ["⚡", "Ten down", "Try 10 different questions", questions >= 10],
    [
      "🛠️",
      "Recovery",
      "Correct a previously missed question",
      recoveries >= 1,
    ],
    ["🌈", "Full spectrum", "Practice in all 7 subjects", subjects.size >= 7],
    ["🔥", "Three-day spark", "Study 3 days in a row", bestStreak >= 3],
    ["🏆", "1K club", "Reach 1,000 XP", xp >= 1000],
  ];
  return {
    xp,
    level,
    progress,
    streak,
    lessons,
    questions,
    recoveries,
    badges,
    todaysQuestions: todaysQuestions.size,
    todaysSubjects: todaysSubjects.size,
    todaysLessons,
    todaysRecoveries,
  };
}
export const buddy = `<svg class="orbit-art" viewBox="0 0 360 300" role="img" aria-label="Orbital training graphic with intersecting rings"><defs><radialGradient id="orb-glow"><stop stop-color="#87b6ff" stop-opacity=".18"/><stop offset="1" stop-color="#87b6ff" stop-opacity="0"/></radialGradient></defs><circle cx="180" cy="150" r="145" fill="url(#orb-glow)"/><g fill="none" stroke="currentColor"><circle cx="180" cy="150" r="108" opacity=".18" stroke-dasharray="3 7"/><ellipse cx="180" cy="150" rx="123" ry="43" transform="rotate(-36 180 150)" opacity=".7"/><ellipse cx="180" cy="150" rx="123" ry="43" transform="rotate(36 180 150)" opacity=".5"/><ellipse cx="180" cy="150" rx="115" ry="43" transform="rotate(90 180 150)" opacity=".3"/><circle cx="180" cy="150" r="29" stroke-width="1.5"/><path d="M166 150h28m-14-14v28M36 47h20m-10-10v20M303 247h20m-10-10v20" opacity=".6"/></g><circle cx="80" cy="85" r="5" fill="currentColor"/><circle cx="239" cy="218" r="4" fill="currentColor"/><text x="180" y="286" text-anchor="middle" fill="currentColor" font-size="8" letter-spacing="3" font-family="monospace">CONSISTENCY / COMPOUNDING</text></svg>`;
