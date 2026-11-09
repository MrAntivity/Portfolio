import { gameState, WORLDS, buddy } from "./game.mjs?v=quest-1";
import {
  EXAM_DATE,
  today,
  daysUntil,
  metrics,
  history,
  reviewDue,
  chooseQuestions,
  safeText as h,
} from "./model.mjs?v=quest-1";
import { flowVisual, labHTML, bindLab, heroArt } from "./visuals.js?v=quest-1";
const $ = (s) => document.querySelector(s),
  main = $("#main");
let curriculum,
  bank = [],
  bankInfo = {},
  records = {},
  user = null,
  cloud = null,
  unsubscribe = null,
  view = "dashboard",
  session = null,
  chat = [],
  chatMode = "teach",
  chatContext = {},
  busy = false,
  authReady = false;
let filters = { subject: "", search: "" };
const lessonAnswers = new Map();
const icons = {
  behavioral: "◎",
  biochemistry: "⌬",
  biology: "♧",
  cars: "≋",
  general: "⚗",
  organic: "⬡",
  physics: "↗",
};
const colors = {
  behavioral: "#e7dfe9",
  biochemistry: "#e6ebce",
  biology: "#dce9d9",
  cars: "#f0e5d4",
  general: "#dae8ec",
  organic: "#e9dfd1",
  physics: "#e0e3ef",
};
const localKey = () => `mcat-studio-v1:${user?.uid || "preview"}`;
function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(localKey()) || "{}");
  } catch {
    return {};
  }
}
function cache() {
  try {
    localStorage.setItem(localKey(), JSON.stringify(records));
  } catch {
    toast("Device storage is full. Sign in for cloud progress.");
  }
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    6000,
  );
}
function subjectName(id) {
  return curriculum.subjects.find((s) => s.id === id)?.title || id;
}
function subjectOptions(selected = "") {
  return (
    `<option value="">All subjects</option>` +
    curriculum.subjects
      .map(
        (s) =>
          `<option value="${h(s.id)}" ${s.id === selected ? "selected" : ""}>${h(s.title)}</option>`,
      )
      .join("")
  );
}
function heading(eyebrow, title, description = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</div><span class="pill">● &nbsp; ${daysUntil()} days to your target</span></div>`;
}
function recordInfo() {
  const m = metrics(records);
  $("#review-count").textContent = Object.values(records).filter((r) =>
    reviewDue(r),
  ).length;
  const g = gameState(records);
  const meter = $("#player-meter");
  if (meter)
    meter.innerHTML = `<span>⭐ ${g.xp.toLocaleString()} XP</span><span>Level ${g.level}</span>`;
  return m;
}
async function save(id, fields, event) {
  const value = { ...records[id], ...fields };
  if (event) value.history = [...(records[id]?.history || []), event];
  records[id] = value;
  cache();
  recordInfo();
  if (!user) {
    $("#sync-status").textContent = "Preview · saved on this device";
    return;
  }
  if (!cloud) {
    toast(
      "Cloud connection is unavailable. This change is saved on this device only.",
    );
    return;
  }
  $("#sync-status").textContent = "Saving…";
  try {
    const patch = { ...fields, updatedAt: cloud.serverTimestamp() };
    if (event) patch.history = cloud.arrayUnion(event);
    const savingUid = user.uid;
    cloud
      .setDoc(
        cloud.doc(cloud.db, "users", savingUid, "mcatProgress", id),
        patch,
        { merge: true },
      )
      .then(() => {
        if (user?.uid === savingUid)
          $("#sync-status").textContent = "All changes synced";
      })
      .catch(() => {
        if (user?.uid === savingUid) {
          $("#sync-status").textContent = "Not synced · export a backup";
          toast(
            "Cloud save failed. Export your device progress from Study plan before reloading.",
          );
        }
      });
  } catch (error) {
    $("#sync-status").textContent = "Not synced · retry with Export / restore";
    toast(
      "Could not sync this change. Your device copy is retained; use Study plan → Export progress as a backup.",
    );
  }
}
async function answer(q, choice) {
  const before = gameState(records);
  const event = {
    id: crypto.randomUUID(),
    at: Date.now(),
    day: today(),
    choice,
    correct: choice === q.answer,
    seconds: Math.min(
      600,
      Math.max(1, Math.round((Date.now() - (q.openedAt || Date.now())) / 1000)),
    ),
  };
  await save(
    q.id,
    {
      kind: "question",
      subject: q.subject,
      title: q.prompt.slice(0, 160),
      topic: q.topic || "",
      lastAnswer: choice,
    },
    event,
  );
  reward(before);
  return event.correct;
}
function statsHTML() {
  const m = recordInfo();
  return `<div class="stats"><div class="stat"><span class="tiny">LESSONS COMPLETED</span><strong>${m.lessons}<small> / ${curriculum.lessons.length}</small></strong><small>Understand it, then apply it</small></div><div class="stat"><span class="tiny">QUESTIONS EXPLORED</span><strong>${m.answered.toLocaleString()}</strong><small>${bank.length.toLocaleString()} practice variants available</small></div><div class="stat"><span class="tiny">FIRST-TRY ACCURACY</span><strong>${m.accuracy === null ? "—" : m.accuracy + "%"}</strong><small>Retries never inflate this number</small></div><div class="stat"><span class="tiny">READY FOR REVIEW</span><strong>${Object.values(records).filter((r) => reviewDue(r)).length}</strong><small>Flagged and spaced practice</small></div></div>`;
}
function reward(before) {
  const g = gameState(records),
    gain = g.xp - before.xp;
  if (gain <= 0) return;
  toast(
    g.level > before.level
      ? `🎉 Level ${g.level}! Your brain is putting in the work.`
      : `✨ +${gain} XP · ${gain === 5 ? "A mistake turned into learning!" : "Nice work. Keep that brain growing!"}`,
  );
  const burst = document.createElement("div");
  burst.className = "xp-burst";
  burst.setAttribute("aria-hidden", "true");
  burst.innerHTML = Array.from(
    { length: 12 },
    (_, i) =>
      `<i style="--i:${i};--c:${["#a897ff", "#ffcd67", "#82d8c4", "#f7a1c4"][i % 4]}"></i>`,
  ).join("");
  document.body.append(burst);
  setTimeout(() => burst.remove(), 1300);
}
function subjectCard(s) {
  const lessons = curriculum.lessons.filter((l) => l.subject === s.id),
    done = lessons.filter((l) => records["lesson-" + l.id]?.complete).length,
    w = WORLDS[s.id];
  return `<button class="subject-card world-card" data-subject="${h(s.id)}" style="--world:${w[2]}"><div class="world-scene"><span class="world-cloud">✦</span><span class="world-emoji">${w[0]}</span><span class="world-orbit">· ✧ ·</span></div><span class="world-name">${w[1]}</span><h3>${h(s.title)}</h3><div class="subject-meta"><span>${done} / ${lessons.length} checkpoints</span><span>${done === lessons.length ? "🏁" : "→"}</span></div><div class="progress"><span style="width:${(done / Math.max(1, lessons.length)) * 100}%"></span></div></button>`;
}
function dashboard() {
  const g = gameState(records),
    next =
      curriculum.lessons.find((l) => !records["lesson-" + l.id]?.complete) ||
      curriculum.lessons[0];
  const quests = [
    [
      "📖",
      "Learn one new thing",
      "Finish a lesson",
      g.todaysLessons,
      1,
      "lesson/" + next.id,
    ],
    [
      "🎯",
      "Take a five-question adventure",
      "Try 5 different questions today",
      g.todaysQuestions,
      5,
      "practice",
    ],
    [
      "🌈",
      "Go world hopping",
      "Practice questions in 2 subjects today",
      g.todaysSubjects,
      2,
      "practice",
    ],
  ];
  main.innerHTML = `<div class="quest-heading"><div><span class="eyebrow">${user ? "HEY AIDEN," : "HEY EXPLORER,"} READY FOR A LITTLE BRAIN GAIN?</span><h1>Your brain has<br><span>side quests.</span></h1><p>One small adventure closer to August 28.</p></div><div class="streak-chip">🔥 <strong>${g.streak}</strong><span>day streak<br><small>Every fresh start counts.</small></span></div></div>
 <div class="adventure-layout"><section class="adventure-hero"><div class="hero-copy"><span class="tag">✦ YOUR NEXT CHECKPOINT</span><h2>${h(next.title)}</h2><p>A little learning. A little practice.<br>A very satisfying “ohhh, I get it.”</p><button class="primary" data-lesson="${h(next.id)}">Let’s do this! <span>→</span></button><small>50 XP for your first completion</small></div><div class="buddy-home"><div class="speech-bubble">You bring the curiosity.<br>I’ll bring the good vibes.</div>${buddy}<span class="buddy-name">PIP · YOUR STUDY SIDEKICK</span></div></section>
 <section class="level-card"><div class="level-medal">${g.level}<span>LEVEL</span></div><h3>${g.level < 5 ? "Curious explorer" : g.level < 15 ? "Concept collector" : "Knowledge navigator"}</h3><p>${g.xp.toLocaleString()} XP earned</p><div class="progress"><span style="width:${(g.progress / 250) * 100}%"></span></div><small>${250 - g.progress} XP to level ${g.level + 1}</small><a href="#achievements">See your badge collection ↗</a></section></div>
 <div class="section-head"><div><span class="eyebrow">LITTLE WINS ADD UP</span><h2>Today’s side quests</h2></div><span class="tag">${quests.filter((q) => q[3] >= q[4]).length} / 3 complete</span></div><div class="daily-quests">${quests.map((q) => `<a class="quest-card ${q[3] >= q[4] ? "quest-done" : ""}" href="#${q[5]}"><span class="quest-icon">${q[3] >= q[4] ? "✅" : q[0]}</span><div><h3>${q[1]}</h3><p>${q[2]}</p><div class="progress"><span style="width:${Math.min(100, (q[3] / q[4]) * 100)}%"></span></div></div><b>${Math.min(q[3], q[4])}/${q[4]}</b></a>`).join("")}</div>
 <div class="section-head"><div><span class="eyebrow">SEVEN WORLDS. YOUR OWN PACE.</span><h2>Where are we going today?</h2></div><a href="#learn">All lessons →</a></div><div class="subject-grid">${curriculum.subjects.map(subjectCard).join("")}</div>
 <div class="section-head"><h2>Your real learning progress</h2><a href="#review">Visit your review queue →</a></div>${statsHTML()}<div class="friendly-note">💜 No lives to lose. No penalty for getting it wrong. Mistakes are part of the adventure.</div>`;
  bindCommon();
}
function achievements() {
  const g = gameState(records);
  main.innerHTML =
    heading(
      "THE LITTLE-WINS COLLECTION",
      "Look at you grow.",
      "Your badges come from learning, practicing, and coming back to tricky ideas.",
    ) +
    `<div class="xp-explainer"><strong>⭐ Level ${g.level} · ${g.xp.toLocaleString()} XP</strong><p>First lesson completion: 50 XP. First attempt on a question: 10 XP, plus 5 if correct. Correcting a previously missed question: 5 XP once. Repeating the same answer never farms points.</p></div><div class="badge-grid">${g.badges.map(([icon, name, desc, earned]) => `<section class="badge-card ${earned ? "earned" : "locked"}"><span>${earned ? icon : "🔒"}</span><h3>${name}</h3><p>${desc}</p><b>${earned ? "Unlocked!" : "An adventure ahead"}</b></section>`).join("")}</div><p class="notice">Streaks count study activity by New York calendar day. A missed day resets the streak, but you always keep your XP and learning progress.</p>`;
}
function bindCommon() {
  document.querySelectorAll("[data-subject]").forEach((el) => {
    if (el.classList.contains("lab")) return;
    el.onclick = () => {
      filters.subject = el.dataset.subject;
      filters.search = "";
      location.hash = "learn";
      if (view === "learn") learn();
    };
  });
  document
    .querySelectorAll("[data-lesson]")
    .forEach(
      (el) =>
        (el.onclick = () => (location.hash = "lesson/" + el.dataset.lesson)),
    );
}
function learn() {
  const lessons = curriculum.lessons.filter(
    (l) =>
      (!filters.subject || l.subject === filters.subject) &&
      (!filters.search ||
        `${l.title} ${l.summary} ${subjectName(l.subject)}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())),
  );
  main.innerHTML =
    heading(
      "THE LEARNING LIBRARY",
      "Pick your next adventure.",
      "Seven subjects. Visual relationships. Original explanations you can put to work.",
    ) +
    `<div class="filters"><label>Subject<select id="learn-subject">${subjectOptions(filters.subject)}</select></label><label>Find a concept<input id="learn-search" type="search" placeholder="Try enzymes, memory, or circuits…" value="${h(filters.search)}"></label></div><p class="report-note">${lessons.length} lessons · Foundation curriculum, with links for deeper study. Each lesson includes a check and a transfer question.</p><div class="lesson-grid">${lessons.map((l) => `<button class="lesson-card" data-lesson="${h(l.id)}"><span class="tag">${h(subjectName(l.subject))}</span><h3>${h(l.title)}</h3><p>${h(l.summary.slice(0, 145))}…</p><div class="card-foot"><span>${records["lesson-" + l.id]?.complete ? "✓ Completed" : "Learn → Apply → Practice"}</span><span>↗</span></div></button>`).join("")}</div>${!lessons.length ? '<div class="empty">No lessons match your search.</div>' : ""}`;
  $("#learn-subject").onchange = (e) => {
    filters.subject = e.target.value;
    learn();
  };
  $("#learn-search").oninput = (e) => {
    filters.search = e.target.value;
    const pos = e.target.selectionStart;
    learn();
    $("#learn-search").focus();
    $("#learn-search").setSelectionRange(pos, pos);
  };
  bindCommon();
}
function qHTML(q, key) {
  const state = lessonAnswers.get(key);
  return `<div class="question" data-q="${h(key)}">${q.passage ? `<div class="passage">${h(q.passage)}</div>` : ""}<h3>${h(q.prompt)}</h3><div class="choices">${q.choices.map((c, i) => `<button class="choice ${state ? (i === q.answer ? "correct" : i === state.choice ? "incorrect" : "") : ""}" data-choice="${i}" ${state ? "disabled" : ""}><b>${"ABCD"[i]}</b><span>${h(c)}</span></button>`).join("")}</div>${state ? `<div class="feedback" role="status"><strong>${state.choice === q.answer ? "✓ That’s right." : "Let’s work through it."}</strong><p>${h(q.explanation)}</p><small>Correct answer: ${"ABCD"[q.answer]}. ${h(q.choices[q.answer])}</small></div>` : '<p class="report-note">Choose an answer to reveal the explanation.</p>'}</div>`;
}
function bindQuestion(q, key, subject) {
  const el = document.querySelector(`[data-q="${CSS.escape(key)}"]`);
  if (!el) return;
  q.openedAt = q.openedAt || Date.now();
  el.querySelectorAll("[data-choice]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (lessonAnswers.has(key)) return;
        const choice = +b.dataset.choice;
        lessonAnswers.set(key, { choice });
        await answer({ ...q, id: key, subject }, choice);
        el.outerHTML = qHTML(q, key);
        bindQuestion(q, key, subject);
      }),
  );
}
function lesson(id) {
  const l = curriculum.lessons.find((l) => l.id === id);
  if (!l) {
    main.innerHTML =
      '<div class="empty">Lesson not found. <a href="#learn">Return to the library.</a></div>';
    return;
  }
  const r = records["lesson-" + id] || {};
  chatContext = {
    subject: subjectName(l.subject),
    title: l.title,
    lesson: l.summary + "\n" + l.keyPoints.join("\n"),
  };
  main.innerHTML =
    `<div class="breadcrumb"><a href="#learn">Learning library</a> / ${h(subjectName(l.subject))}</div>` +
    heading("MAKE THE CONCEPT CLICK", h(l.title)) +
    `<div class="lesson-layout"><article class="lesson-body"><section class="panel"><span class="step-tag">01 / LEARN & VISUALIZE</span><p>${h(l.summary)}</p>${l.passage ? `<div class="passage">${h(l.passage)}</div>` : ""}${flowVisual(l.visual)}<ul>${l.keyPoints.map((k) => `<li>${h(k)}</li>`).join("")}</ul><div class="callout"><strong>Watch for this trap</strong><p>${h(l.misconception)}</p></div>${/enzyme|kinetic|acid|base|force|motion|membrane|transport|research|correlation|catalys|argument/i.test(l.title) ? labHTML(l.subject) : ""}</section><section class="panel"><span class="step-tag">02 / TRY IT FIRST</span>${qHTML(l.check, "check-" + l.id)}</section><section class="panel"><span class="step-tag">03 / SEE THE WORKED METHOD</span><h3>${h(l.workedExample.prompt)}</h3><details><summary>Show the reasoning, step by step</summary><ol>${l.workedExample.steps.map((s) => `<li>${h(s)}</li>`).join("")}</ol><div class="callout"><strong>${h(l.workedExample.answer)}</strong></div></details></section><section class="panel"><span class="step-tag">04 / MAKE IT YOURS</span><p class="report-note">A related problem, with a new application.</p>${qHTML(l.transfer, "transfer-" + l.id)}<div class="actions"><button class="primary" id="complete-lesson">${r.complete ? "✓ Lesson completed" : "Mark lesson complete"}</button><button id="next-lesson">Next lesson →</button></div></section></article><aside class="sticky"><section class="panel"><span class="eyebrow">YOUR LEARNING LOOP</span><h3>Understanding over memorizing.</h3><p>Predict what happens before moving a slider. Then explain why in your own words.</p><button id="flag-lesson" class="soft-button">${r.flag ? "✓ Saved for review" : "↻ Save for review"}</button><button id="ask-lesson">✧ Ask your AI tutor</button><label style="margin-top:20px">Your notes<textarea id="lesson-notes" maxlength="12000" placeholder="What clicked? What is still unclear?">${h(r.notes || "")}</textarea></label><button id="save-notes">Save notes</button><p class="report-note" id="note-status"></p></section><section class="panel"><span class="eyebrow">GO A LITTLE DEEPER</span><p>Verify the details and explore the topic using the linked learning source.</p><a href="${h(l.source)}" target="_blank" rel="noopener" class="tag">Open learning source ↗</a><p class="report-note">Original study notes. Not official exam questions.</p></section></aside></div>`;
  bindLab();
  bindQuestion(l.check, "check-" + id, l.subject);
  bindQuestion(l.transfer, "transfer-" + id, l.subject);
  $("#complete-lesson").onclick = async () => {
    const before = gameState(records);
    await save("lesson-" + id, {
      kind: "lesson",
      subject: l.subject,
      title: l.title,
      completedDay:
        records["lesson-" + id]?.completedDay ||
        (records["lesson-" + id]?.complete ||
        records["lesson-" + id]?.completedEver
          ? ""
          : today()),
      completedEver: true,
      complete: !records["lesson-" + id]?.complete,
    });
    reward(before);
    lesson(id);
  };
  $("#flag-lesson").onclick = async () => {
    await save("lesson-" + id, {
      kind: "lesson",
      subject: l.subject,
      title: l.title,
      flag: !records["lesson-" + id]?.flag,
    });
    $("#flag-lesson").textContent = records["lesson-" + id].flag
      ? "✓ Saved for review"
      : "↻ Save for review";
  };
  $("#lesson-notes").oninput = () => {
    $("#lesson-notes").dataset.dirty = "1";
  };
  $("#save-notes").onclick = async () => {
    await save("lesson-" + id, {
      kind: "lesson",
      subject: l.subject,
      title: l.title,
      notes: $("#lesson-notes").value.slice(0, 12000),
    });
    delete $("#lesson-notes").dataset.dirty;
    $("#note-status").textContent = user
      ? "Saved; check sync status for cloud confirmation."
      : "Saved on this device.";
  };
  $("#ask-lesson").onclick = () => {
    chat = [];
    location.hash = "tutor";
  };
  $("#next-lesson").onclick = () => {
    const i = curriculum.lessons.indexOf(l);
    location.hash =
      "lesson/" + curriculum.lessons[(i + 1) % curriculum.lessons.length].id;
  };
}
function practice() {
  if (session) {
    sessionView();
    return;
  }
  main.innerHTML =
    heading(
      "PRACTICE WITH PURPOSE",
      "Ready, set, brain!",
      "Choose a subject, target a weak spot, and learn from every answer.",
    ) +
    `<div class="panel"><h2>Build a practice session</h2><div class="filters"><label>Subject<select id="practice-subject">${subjectOptions(filters.subject)}</select></label><label>Topic<select id="practice-topic"><option value="">All topics</option></select></label><label>Difficulty<select id="practice-difficulty"><option value="">All levels</option>${[...new Set(bank.map((q) => q.difficulty))].map((d) => `<option>${h(d)}</option>`).join("")}</select></label></div><div class="filters"><label>Question selection<select id="practice-filter"><option value="all">All questions</option><option value="unseen">Not attempted yet</option><option value="missed">Last answered incorrectly</option><option value="review">Due or flagged for review</option></select></label><label>Session size<select id="practice-count"><option value="5">5 questions · quick check</option><option value="10" selected>10 questions · daily practice</option><option value="20">20 questions · deep practice</option><option value="59">59 questions · extended practice</option></select></label></div><button id="start-session" class="primary">Start practice session →</button><p class="report-note" id="pool-count"></p></div><div class="notice"><strong>About this bank:</strong> ${bank.length.toLocaleString()} original practice variants, generated from reusable concept and calculation families. Variants are not 5,000 independently authored MCAT exam questions. This bank supplements passage-based official practice; it is not a full-length exam simulator.</div><details><summary>What is in the bank?</summary><p>${curriculum.subjects.map((s) => `${h(s.title)}: ${bank.filter((q) => q.subject === s.id).length.toLocaleString()}`).join(" · ")}</p><p class="report-note">${h(bankInfo.methodology || bankInfo.description || "Original practice variants.")} ${new Set(bank.map((q) => q.family)).size} question families.</p><p class="report-note">${h(bankInfo.limitations || "")}</p></details><div class="section-head"><h2>Build understanding first</h2><a href="#learn">Visit the learning library ↗</a></div><div class="subject-grid">${curriculum.subjects.map(subjectCard).join("")}</div>`;
  const topics = () => {
    const s = $("#practice-subject").value;
    $("#practice-topic").innerHTML =
      '<option value="">All topics</option>' +
      [
        ...new Set(
          bank.filter((q) => !s || q.subject === s).map((q) => q.topic),
        ),
      ]
        .sort()
        .map((t) => `<option>${h(t)}</option>`)
        .join("");
    pool();
  };
  const options = () => ({
    subject: $("#practice-subject").value,
    topic: $("#practice-topic").value,
    difficulty: $("#practice-difficulty").value,
    filter: $("#practice-filter").value,
    count: +$("#practice-count").value,
  });
  const pool = () => {
    $("#pool-count").textContent =
      chooseQuestions(bank, records, {
        ...options(),
        count: bank.length,
      }).length.toLocaleString() + " matching practice variants";
  };
  $("#practice-subject").onchange = topics;
  ["#practice-topic", "#practice-difficulty", "#practice-filter"].forEach(
    (s) => ($(s).onchange = pool),
  );
  $("#start-session").onclick = () => {
    const qs = chooseQuestions(bank, records, options());
    if (!qs.length) {
      toast(
        "No questions match these filters. Try another subject or selection.",
      );
      return;
    }
    session = { questions: qs, index: 0, results: [], startedAt: Date.now() };
    sessionView();
  };
  topics();
  bindCommon();
}
function sessionView() {
  const q = session.questions[session.index];
  if (!q) {
    sessionSummary();
    return;
  }
  q.openedAt = Date.now();
  const state = session.results[session.index],
    key = "session-" + session.startedAt + "-" + q.id;
  if (state) lessonAnswers.set(key, { choice: state.choice });
  main.innerHTML = `<div class="bank-layout"><div class="bank-top"><a href="#practice" id="end-session">← End session</a><span class="tag">${h(subjectName(q.subject))}</span><span>${session.index + 1} / ${session.questions.length}</span></div><div class="progress-strip">${session.questions.map((_, i) => `<span class="${i < session.results.length ? "done" : ""}"></span>`).join("")}</div><section class="panel"><div class="section-head" style="margin-top:0"><span class="eyebrow">${h(q.topic)}</span><span class="pill">${h(q.difficulty)} · ${q.variant ? "variant" : "original passage"}</span></div>${qHTML(q, key)}<div class="actions"><button id="flag-question">${records[q.id]?.flag ? "✓ Flagged" : "↻ Flag for review"}</button><button id="ask-question">✧ ${state ? "Explain with AI" : "Get an AI hint"}</button>${state ? '<button id="next-question" class="primary">Next question →</button>' : ""}</div></section><p class="report-note">Original practice drill · ${h(q.family)} · Numerical answers use up to 4 significant figures. <a href="${h(q.source)}" target="_blank" rel="noopener">Study reference ↗</a></p></div>`;
  $("#end-session").onclick = (e) => {
    e.preventDefault();
    sessionSummary();
  };
  $("#flag-question").onclick = async () => {
    await save(q.id, {
      kind: "question",
      subject: q.subject,
      title: q.prompt.slice(0, 160),
      topic: q.topic,
      flag: !records[q.id]?.flag,
    });
    $("#flag-question").textContent = records[q.id].flag
      ? "✓ Flagged"
      : "↻ Flag for review";
  };
  $("#ask-question").onclick = () => {
    chat = [];
    chatMode = state ? "explain" : "socratic";
    chatContext = {
      subject: subjectName(q.subject),
      title: q.topic,
      question: q,
    };
    location.hash = "tutor";
  };
  if (state)
    $("#next-question").onclick = () => {
      session.index++;
      sessionView();
    };
  else
    document.querySelectorAll("[data-choice]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (session.results[session.index]) return;
          const choice = +b.dataset.choice;
          session.results[session.index] = {
            choice,
            correct: choice === q.answer,
          };
          await answer(q, choice);
          sessionView();
        }),
    );
}
function sessionSummary() {
  const count = session.results.length,
    correct = session.results.filter((r) => r.correct).length;
  main.innerHTML =
    heading("SESSION COMPLETE", "Every answer is feedback.") +
    `<section class="panel"><span class="eyebrow">THIS SESSION</span><div class="session-result">${correct} / ${count}</div><p>${count ? "Review the reasoning behind missed questions before starting another session." : "No answers recorded in this session."} Your overall dashboard always uses first attempts.</p>${session.results.map((r, i) => `<div class="row"><div><h3>${r.correct ? "✓" : "↻"} ${h(session.questions[i].topic)}</h3><small>${h(session.questions[i].prompt.slice(0, 110))}</small></div><button data-result="${i}">Review</button></div>`).join("")}<div class="actions"><button class="primary" id="new-session">New practice session →</button><a href="#review">Open review queue</a></div></section>`;
  $("#new-session").onclick = () => {
    session = null;
    practice();
  };
  document.querySelectorAll("[data-result]").forEach(
    (b) =>
      (b.onclick = () => {
        session.index = +b.dataset.result;
        sessionView();
      }),
  );
}
function review() {
  const due = Object.entries(records).filter(([, r]) => reviewDue(r));
  main.innerHTML =
    heading(
      "MAKE IT STICK",
      "Let’s collect those aha moments.",
      "Saved concepts, uncertain answers, and spaced repetition in one place.",
    ) +
    `<p class="notice">Incorrect answers return after 1 day. Correct-answer streaks space reviews at 2, 4, 8, 16, and 30 days. A flag keeps an item here until you remove it.</p>${due.length ? `<section class="panel">${due.map(([id, r]) => `<div class="row"><div><span class="tag">${h(subjectName(r.subject))}</span><h3 style="margin-top:8px">${h(r.title || id)}</h3><small>${r.flag ? "Flagged by you" : "Due for another attempt"}</small></div><button data-review="${h(id)}">Review →</button>${r.flag ? `<button data-unflag="${h(id)}" aria-label="Remove review flag">✓</button>` : ""}</div>`).join("")}</section>` : `<div class="empty"><h2>A clear mind. A clear queue.</h2><p>Flag a lesson or question when something feels uncertain. Missed questions will also return for spaced practice.</p><a class="tag" href="#practice">Start practicing →</a></div>`}`;
  document.querySelectorAll("[data-review]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.review;
        if (id.startsWith("lesson-")) location.hash = "lesson/" + id.slice(7);
        else if (id.startsWith("check-") || id.startsWith("transfer-")) {
          lessonAnswers.delete(id);
          location.hash = "lesson/" + id.replace(/^(check|transfer)-/, "");
        } else {
          const q = bank.find((q) => q.id === id);
          if (q) {
            session = {
              questions: [q],
              index: 0,
              results: [],
              startedAt: Date.now(),
            };
            location.hash = "practice";
          } else toast("This question is not in the current bank.");
        }
      }),
  );
  document.querySelectorAll("[data-unflag]").forEach(
    (b) =>
      (b.onclick = async () => {
        await save(b.dataset.unflag, { flag: false });
        review();
      }),
  );
}
const partners = [
  ["teach", "The explainer", "Connect the idea to an example."],
  ["socratic", "The thinking partner", "A hint, then your turn."],
  ["explain", "The problem solver", "Work through the method."],
  ["cars", "The CARS coach", "Find the claim and the evidence."],
];
function tutor() {
  main.innerHTML =
    heading(
      "YOU DON’T HAVE TO FIGURE IT OUT ALONE",
      "Your brain’s backup crew.",
      "Four ways to work with your AI tutor, powered by your private OpenAI connection.",
    ) +
    `<div class="chat-layout"><aside class="partners">${partners.map(([id, title, desc]) => `<button class="partner ${id === chatMode ? "active" : ""}" data-mode="${id}"><strong>✧ ${title}</strong><small>${desc}</small></button>`).join("")}</aside><section class="panel"><div class="section-head" style="margin-top:0"><h3>${partners.find((p) => p[0] === chatMode)[1]}</h3><button id="new-chat">New chat</button></div>${chatContext.title ? `<div class="notice">Studying: ${h(chatContext.title)} <button id="clear-context">Clear context</button></div>` : ""}<div id="chat-log" class="chat-log" aria-live="polite">${chat.length ? chat.map((m) => `<div class="message ${m.role}"><small>${m.role === "user" ? "YOU" : "STUDY PARTNER · AI"}</small>${h(m.content)}</div>`).join("") : `<div class="empty"><h3>Let’s make it click.</h3><p>Try “Teach me competitive inhibition, then give me a question” or “Help me identify the main claim in this passage.”</p>${!user ? '<button id="tutor-signin" class="primary">Sign in to use your tutor</button>' : ""}</div>`}${busy ? "<p>Thinking through your question…</p>" : ""}</div><form class="chat-input" id="chat-form"><label class="sr-only" for="chat-prompt">Your question</label><textarea id="chat-prompt" placeholder="What would you like to understand?" maxlength="4000" required ${busy ? "disabled" : ""}></textarea><button class="primary" ${busy ? "disabled" : ""}>${busy ? "Thinking…" : "Send ↗"}</button></form><p class="report-note">AI can make mistakes. Check important facts against linked sources. Up to 100 requests/day; API usage is billed to your connected account. Chats stay in this tab; progress and notes sync.</p></section></div>`;
  document.querySelectorAll("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        if (busy) return;
        chatMode = b.dataset.mode;
        tutor();
      }),
  );
  $("#new-chat").onclick = () => {
    if (!busy) {
      chat = [];
      tutor();
    }
  };
  if ($("#clear-context"))
    $("#clear-context").onclick = () => {
      chatContext = {};
      tutor();
    };
  if ($("#tutor-signin"))
    $("#tutor-signin").onclick = () => $("#login").showModal();
  $("#chat-form").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!user) {
      $("#login").showModal();
      return;
    }
    if (!cloud) {
      toast("The cloud connection is unavailable. Please reload.");
      return;
    }
    if (chat.length >= 20) {
      toast("Start a new chat to keep your conversation focused.");
      return;
    }
    const text = $("#chat-prompt").value.trim();
    if (!text) return;
    const message = { role: "user", content: text };
    chat.push(message);
    busy = true;
    tutor();
    try {
      const result = await cloud.httpsCallable(cloud.functions, "mcatTutor", {
        timeout: 120000,
      })({ messages: chat, mode: chatMode, context: chatContext });
      chat.push({ role: "assistant", content: result.data.answer });
    } catch (error) {
      chat.pop();
      toast(error.message || "Your tutor could not connect. Please try again.");
      if (view === "tutor")
        setTimeout(() => {
          if ($("#chat-prompt")) $("#chat-prompt").value = text;
        }, 0);
    } finally {
      busy = false;
      if (view === "tutor") {
        tutor();
        $("#chat-log").scrollTop = $("#chat-log").scrollHeight;
      }
    }
  };
}
function plan() {
  main.innerHTML =
    heading(
      "A PLAN WITH ROOM TO GROW",
      "Your road to August 28.",
      "A suggested progression toward your target date, with space to adjust your pace.",
    ) +
    statsHTML() +
    `<div class="two-col"><section class="panel"><h2>Build. Apply. Refine.</h2><div class="plan-phase"><span class="tag">NOW → FEBRUARY 2027</span><h3>Make the foundations solid</h3><p>Work through lessons across all seven subjects. Explain each idea aloud, try the guided checks, and keep a list of gaps. Read a CARS passage regularly.</p></div><div class="plan-phase"><span class="tag">MARCH → MAY 2027</span><h3>Connect ideas across subjects</h3><p>Mix subjects, interpret experiments, practice units and graphs, and revisit missed concepts. Add official passage-based practice to these drills.</p></div><div class="plan-phase"><span class="tag">JUNE → JULY 2027</span><h3>Practice under exam conditions</h3><p>Use official full-length exams, review reasoning errors, and adjust your plan to the evidence. Build stamina while preserving recovery time.</p></div><div class="plan-phase"><span class="tag">AUGUST 2027</span><h3>Consolidate and protect your routine</h3><p>Prioritize persistent gaps and reviewed mistakes. Rehearse test-day logistics, reduce last-minute overload, and keep sleep consistent.</p></div><p class="report-note">August 28, 2027 is your supplied target date. This app does not verify your exam registration or the official testing calendar.</p></section><aside><section class="panel"><h3>Your weekly intention</h3><p>Write a realistic plan that fits your classes and energy.</p><label>Study goals<textarea id="plan-notes" maxlength="12000" rows="8" placeholder="For example: 4 study days, 2 lessons a day, 10 practice questions, and a CARS passage…">${h(records.settings?.plan || "")}</textarea></label><button id="save-plan" class="primary">Save my plan</button></section><section class="panel"><h3>Your data, in your hands</h3><p>Export a backup of your study records. Restore a backup to this account or preview when needed.</p><button id="export">Export progress</button><label style="margin-top:15px">Restore a progress backup<input id="import" type="file" accept="application/json,.json"></label><p class="report-note">Restore merges records by ID. Existing records with the same ID are replaced by the backup.</p></section></aside></div>`;
  $("#plan-notes").oninput = () => {
    $("#plan-notes").dataset.dirty = "1";
  };
  $("#save-plan").onclick = async () => {
    await save("settings", { plan: $("#plan-notes").value.slice(0, 12000) });
    delete $("#plan-notes").dataset.dirty;
    toast("Study plan saved.");
  };
  $("#export").onclick = () => {
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { version: 1, exportedAt: new Date().toISOString(), records },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
    a.href = url;
    a.download = `mcat-progress-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("#import").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 15000000) throw Error("This backup is too large.");
      const data = JSON.parse(await file.text());
      if (
        data.version !== 1 ||
        !data.records ||
        typeof data.records !== "object" ||
        Array.isArray(data.records)
      )
        throw Error("Choose a valid MCAT Studio backup.");
      const entries = Object.entries(data.records);
      if (entries.length > 10000) throw Error("Too many records.");
      for (const [id, r] of entries) {
        if (
          !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,179}$/.test(id) ||
          !r ||
          typeof r !== "object" ||
          Array.isArray(r) ||
          JSON.stringify(r).length > 200000 ||
          ["constructor", "prototype", "__proto__"].includes(id) ||
          (r.history !== undefined &&
            (!Array.isArray(r.history) ||
              r.history.length > 1000 ||
              r.history.some(
                (e) =>
                  !e ||
                  typeof e.id !== "string" ||
                  !Number.isFinite(e.at) ||
                  typeof e.correct !== "boolean" ||
                  !Number.isFinite(e.seconds) ||
                  e.seconds < 0 ||
                  typeof e.day !== "string",
              ))) ||
          ["notes", "plan", "title", "subject", "topic"].some(
            (k) => r[k] !== undefined && typeof r[k] !== "string",
          )
        )
          throw Error("Backup contains an invalid record.");
      }
      if (
        !confirm(
          `Restore ${entries.length} records ${user ? "to your signed-in account" : "on this device"}? Matching record IDs will be replaced.`,
        )
      )
        return;
      for (const [id, r] of entries) {
        records[id] = r;
        if (user && cloud)
          await cloud.setDoc(
            cloud.doc(cloud.db, "users", user.uid, "mcatProgress", id),
            r,
          );
      }
      cache();
      toast("Backup restored.");
      plan();
    } catch (error) {
      toast(error.message);
    }
  };
}
function resources() {
  const fixed = [
    {
      title: "AAMC · What’s on the MCAT exam?",
      url: "https://students-residents.aamc.org/prepare-mcat-exam/whats-mcat-exam-pdf-outline",
      description:
        "The official scope and foundational concepts. Use this to check coverage and plan deeper review.",
    },
    {
      title: "AAMC · Official preparation resources",
      url: "https://students-residents.aamc.org/prepare-mcat-exam/prepare-mcat-exam",
      description:
        "Official practice and exam-preparation information. Use passage-based official materials alongside these concept drills.",
    },
    {
      title: "Kaplan · MCAT subject review books",
      url: "https://www.kaptest.com/mcat/mcat-books",
      description:
        "The publisher’s legitimate seven-book review collection. Commercial books and questions are not reproduced in this app.",
    },
  ];
  const sources = [...fixed, ...(curriculum.sources || [])];
  main.innerHTML =
    heading(
      "LEARN FROM GOOD SOURCES",
      "The discovery chest.",
      "Original lessons here. Reliable sources for the deeper dive.",
    ) +
    `<section class="panel">${sources.map((s) => `<a class="resource" href="${h(s.url)}" target="_blank" rel="noopener"><span>↗</span><h3>${h(s.title)}</h3><p>${h(s.description || "Supporting educational reference for the study curriculum.")}</p></a>`).join("")}</section><div class="notice">This is an independent study tool. Content and AI responses are educational, not official MCAT material or medical advice. The learning library is a foundation curriculum, not a guarantee of exhaustive exam coverage.</div>`;
}
function refreshSavedFields() {
  // Live snapshots can arrive after a deep link renders, or from another device.
  // Refresh saved values without replacing text the learner is currently editing.
  if (view === "lesson") {
    const id = decodeURIComponent(location.hash.slice("#lesson/".length));
    const r = records["lesson-" + id] || {};
    const notes = $("#lesson-notes");
    if (notes && !notes.dataset.dirty) notes.value = r.notes || "";
    if ($("#flag-lesson"))
      $("#flag-lesson").textContent = r.flag
        ? "✓ Saved for review"
        : "↻ Save for review";
    if ($("#complete-lesson"))
      $("#complete-lesson").textContent = r.complete
        ? "✓ Lesson completed"
        : "Mark lesson complete";
  }
  const planNotes = $("#plan-notes");
  if (planNotes && !planNotes.dataset.dirty)
    planNotes.value = records.settings?.plan || "";
}
function route() {
  if (!curriculum) return;
  recordInfo();
  const hash = location.hash.slice(1) || "dashboard";
  view = hash.split("/")[0];
  document
    .querySelectorAll("[data-nav]")
    .forEach((a) =>
      a.classList.toggle(
        "active",
        a.dataset.nav === (view === "lesson" ? "learn" : view),
      ),
    );
  const renders = {
    dashboard,
    learn,
    practice,
    review,
    tutor,
    plan,
    resources,
    achievements,
  };
  if (view === "lesson") lesson(decodeURIComponent(hash.slice(7)));
  else (renders[view] || dashboard)();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
$(".skip").onclick = (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView({ block: "start" });
};
$("#theme").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "mcat-theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
};
if (localStorage.getItem("mcat-theme") === "dark")
  document.body.classList.add("dark");
$("#days-left").textContent = daysUntil() + " days to build something great.";
$("#date-fill").style.width =
  Math.min(100, Math.max(0, (1 - daysUntil() / 292) * 100)) + "%";
$("#account").onclick = async () => {
  if (user && cloud) {
    if (busy) {
      toast("Wait for your tutor to finish before signing out.");
      return;
    }
    await cloud.signOut(cloud.auth);
  } else $("#login").showModal();
};
$("#close-login").onclick = () => $("#login").close();
$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.target.querySelector("[type=submit]");
  $("#login-error").textContent = "";
  if (!cloud) {
    $("#login-error").textContent =
      "Connection unavailable. Check your internet connection and reload.";
    return;
  }
  b.disabled = true;
  try {
    await cloud.signInWithEmailAndPassword(
      cloud.auth,
      "aiden@viro.local",
      e.target.pin.value,
    );
    e.target.reset();
    $("#login").close();
  } catch (error) {
    $("#login-error").textContent =
      error.code === "auth/too-many-requests"
        ? "Too many attempts. Please wait before trying again."
        : "Could not sign in. Check your portal PIN and connection.";
  } finally {
    b.disabled = false;
  }
};
async function connect() {
  try {
    const base = "https://www.gstatic.com/firebasejs/11.10.0/";
    const [app, auth, fs, fn, config] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
      import(base + "firebase-functions.js"),
      import("/viro/firebase-config.js"),
    ]);
    const instance = app.initializeApp(config.firebaseConfig);
    let db;
    try {
      db = fs.initializeFirestore(instance, {
        localCache: fs.persistentLocalCache({
          tabManager: fs.persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = fs.getFirestore(instance);
    }
    cloud = {
      ...auth,
      ...fs,
      ...fn,
      auth: auth.getAuth(instance),
      db,
      functions: fn.getFunctions(instance, "us-central1"),
    };
    auth.onAuthStateChanged(cloud.auth, async (current) => {
      if (unsubscribe) unsubscribe();
      if (current && current.email !== "aiden@viro.local") {
        await auth.signOut(cloud.auth);
        toast("Use your private portal account for MCAT progress.");
        return;
      }
      const accountChanged = user?.uid !== current?.uid;
      user = current;
      if (accountChanged) {
        chat = [];
        chatContext = {};
        lessonAnswers.clear();
        session = null;
      }
      records = readLocal();
      $("#account").innerHTML = user
        ? "Signed in · Sign out <span>↗</span>"
        : "Sign in to sync <span>↗</span>";
      $("#sync-status").textContent = user
        ? "Loading cloud progress…"
        : "Preview · progress stays on this device";
      if (user) {
        unsubscribe = fs.onSnapshot(
          fs.collection(db, "users", user.uid, "mcatProgress"),
          { includeMetadataChanges: true },
          (snapshot) => {
            const next = {};
            snapshot.forEach((d) => (next[d.id] = d.data()));
            records = next;
            cache();
            recordInfo();
            $("#sync-status").textContent = snapshot.metadata.hasPendingWrites
              ? "Changes waiting to sync"
              : snapshot.metadata.fromCache
                ? "Offline cache · waiting for connection"
                : "All changes synced";
            if (["dashboard", "review", "achievements"].includes(view)) route();
            else refreshSavedFields();
          },
          (error) => {
            $("#sync-status").textContent = "Cloud progress unavailable";
            toast(
              "Progress could not be loaded from Firebase. Your device backup is retained.",
            );
          },
        );
      }
      authReady = true;
      if (accountChanged) route();
      else recordInfo();
    });
  } catch (error) {
    $("#sync-status").textContent =
      "Offline preview · cloud connection unavailable";
    authReady = true;
    toast(
      "Lessons and practice work in preview. Sign-in needs an internet connection.",
    );
  }
}
try {
  records = readLocal();
  const [response, module] = await Promise.all([
    fetch("/mcat/curriculum.json?v=quest-1"),
    import("./bank.mjs?v=quest-1"),
  ]);
  if (!response.ok) throw Error("Curriculum unavailable");
  curriculum = await response.json();
  bank = module.buildBank();
  bankInfo = module.BANK_INFO || {};
  route();
  connect();
} catch (error) {
  main.innerHTML =
    '<div class="empty"><h2>The study library could not load.</h2><p>Please check your connection and reload the page.</p><button onclick="location.reload()">Reload</button></div>';
  console.error(error);
}
