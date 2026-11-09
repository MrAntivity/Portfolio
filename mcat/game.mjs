import { today, history } from "./model.mjs?v=quest-1";
export const WORLDS = {
  behavioral: ["🧠", "Mind Meadow", "#e7d6ff"],
  biochemistry: ["🧬", "Molecule Grove", "#d2f3aa"],
  biology: ["🌱", "Living Planet", "#b7ecdf"],
  cars: ["📚", "Story Summit", "#ffdfaa"],
  general: ["🧪", "Element Isles", "#b8e8ff"],
  organic: ["🍯", "Carbon Cove", "#ffcbd8"],
  physics: ["🚀", "Orbit Outpost", "#d2d7ff"],
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
    ["🌱", "First roots", "Finish your first lesson", lessons >= 1],
    ["⚡", "Getting warmed up", "Try 10 different questions", questions >= 10],
    [
      "🛠️",
      "Comeback kid",
      "Correct a previously missed question",
      recoveries >= 1,
    ],
    ["🌈", "World traveler", "Practice in all 7 subjects", subjects.size >= 7],
    ["🔥", "Three-day spark", "Study 3 days in a row", bestStreak >= 3],
    ["🏆", "Brain gains", "Reach 1,000 XP", xp >= 1000],
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
export const buddy = `<svg class="buddy" viewBox="0 0 360 300" role="img" aria-label="Pip, a smiling purple study companion on a little planet"><ellipse cx="182" cy="257" rx="118" ry="24" fill="#263657" opacity=".12"/><path d="M49 227Q180 177 310 230L292 255Q180 279 66 251Z" fill="#b6e693" stroke="#334056" stroke-width="4"/><path d="M74 238Q180 267 290 238" fill="none" stroke="#85bd65" stroke-width="3"/><path d="M107 200Q62 177 82 150Q96 137 118 162M246 164Q271 131 286 149Q303 172 256 200" fill="#a99aff" stroke="#423975" stroke-width="4"/><path d="M111 213Q81 133 120 80Q153 39 209 59Q271 82 255 201Q248 239 212 225L195 213Q166 237 142 221Z" fill="#b8a7ff" stroke="#423975" stroke-width="4"/><path d="M125 90Q142 67 163 73" stroke="#e5dfff" stroke-width="10" stroke-linecap="round" fill="none"/><ellipse cx="153" cy="139" rx="9" ry="13" fill="#34324d"/><ellipse cx="211" cy="139" rx="9" ry="13" fill="#34324d"/><circle cx="156" cy="135" r="3" fill="white"/><circle cx="214" cy="135" r="3" fill="white"/><ellipse cx="132" cy="159" rx="13" ry="7" fill="#f8a9c7"/><ellipse cx="231" cy="159" rx="13" ry="7" fill="#f8a9c7"/><path d="M166 160Q181 180 198 160" fill="none" stroke="#423975" stroke-width="4" stroke-linecap="round"/><path d="M160 197L179 187L200 197L180 211Z" fill="#ffdf70" stroke="#423975" stroke-width="3"/><path d="M64 72l5 13 14 4-14 5-5 13-5-13-14-5 14-4zM286 72l4 9 10 4-10 3-4 10-3-10-10-3 10-4z" fill="#ffda67" stroke="#9f782d" stroke-width="2"/><circle cx="300" cy="192" r="6" fill="#f4a7c0"/><circle cx="47" cy="179" r="5" fill="#a9d7f8"/></svg>`;
