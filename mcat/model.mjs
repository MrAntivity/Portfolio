export const EXAM_DATE = "2027-08-28";
export function today(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function daysUntil(date = EXAM_DATE, now = today()) {
  return Math.max(
    0,
    Math.round(
      (Date.parse(date + "T12:00:00Z") - Date.parse(now + "T12:00:00Z")) /
        86400000,
    ),
  );
}
export function history(record) {
  return [...(record?.history || [])].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  );
}
export function metrics(records) {
  const rows = Object.values(records),
    qs = rows.filter((r) => r.kind === "question" && r.history?.length);
  const events = qs.flatMap((r) => r.history);
  return {
    answered: qs.length,
    correct: qs.filter((r) => history(r)[0].correct).length,
    attempts: events.length,
    lessons: rows.filter((r) => r.complete).length,
    minutes: Math.round(events.reduce((n, e) => n + (e.seconds || 0), 0) / 60),
    accuracy: qs.length
      ? Math.round(
          (100 * qs.filter((r) => history(r)[0].correct).length) / qs.length,
        )
      : null,
  };
}
export function reviewDue(record, now = Date.now()) {
  if (record?.flag) return true;
  const h = history(record);
  if (!h.length) return false;
  let streak = 0;
  for (let i = h.length - 1; i >= 0 && h[i].correct; i--) streak++;
  const days = streak === 0 ? 1 : Math.min(30, 2 ** streak);
  return now >= h.at(-1).at + days * 86400000;
}
export function chooseQuestions(
  bank,
  records,
  {
    subject = "",
    topic = "",
    difficulty = "",
    filter = "all",
    count = 10,
  } = {},
) {
  let pool = bank.filter(
    (q) =>
      (!subject || q.subject === subject) &&
      (!topic || q.topic === topic) &&
      (!difficulty || q.difficulty === difficulty),
  );
  if (filter === "unseen")
    pool = pool.filter((q) => !records[q.id]?.history?.length);
  if (filter === "missed")
    pool = pool.filter((q) => {
      const h = history(records[q.id]);
      return h.length && !h.at(-1).correct;
    });
  if (filter === "review") pool = pool.filter((q) => reviewDue(records[q.id]));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
export function safeText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
