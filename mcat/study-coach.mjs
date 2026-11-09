import { renderAI } from "./ai-format.mjs?v=visual-2";
import { safeText as h } from "./model.mjs?v=visual-2";
const conversations = new Map();
let mounted = null;
export function clearCoaches() {
  conversations.clear();
  mounted = null;
}
export function mountCoach(host, options) {
  if (!host) return null;
  const key = `${options.userId || "preview"}:${options.key}`;
  if (!conversations.has(key))
    conversations.set(key, {
      messages: [],
      pending: false,
      error: "",
      draft: "",
    });
  const state = conversations.get(key);
  const instance = { host, options, state, key };
  mounted = instance;
  function paint() {
    if (mounted !== instance || !host.isConnected) return;
    host.innerHTML = `<section class="coach-panel panel" aria-label="Study partner"><header class="coach-heading"><h2><span aria-hidden="true">✧</span> Study partner <small>AI</small></h2><span class="coach-presence">With you</span></header><p class="coach-context">${h(options.title)}</p><div class="coach-log" aria-live="polite" aria-busy="${state.pending}">${state.messages.length ? state.messages.map((m) => `<div class="coach-message ${m.role}">${m.role === "assistant" ? `<div class="ai-prose">${renderAI(m.content)}</div>` : `<p>${h(m.content)}</p>`}</div>`).join("") : `<div class="coach-welcome"><span class="coach-spark" aria-hidden="true">✧</span><h3>${options.practice ? "A nudge when you need it." : "Let’s make it click."}</h3><p>${options.practice ? "Ask for a hint without leaving your question. Work through the idea before revealing the answer." : "Use the visual, make a prediction, then ask me to help connect the pieces."}</p></div>`}${state.pending ? '<p class="coach-thinking" role="status">Thinking through the concept…</p>' : ""}</div>${state.error ? `<div class="coach-error" role="alert">${h(state.error)}<button type="button" data-coach-retry>Try again</button></div>` : ""}<div class="coach-prompts"><button type="button" data-coach-prompt="visual" ${state.pending ? "disabled" : ""}>Explain visually</button><button type="button" data-coach-prompt="hint" ${state.pending ? "disabled" : ""}>${options.answered ? "Break it down" : "Give me a hint"}</button></div><form class="coach-form"><label class="sr-only" for="coach-input">Ask about this concept</label><textarea id="coach-input" placeholder="Ask about this concept…" rows="2" maxlength="4000" ${state.pending ? "disabled" : ""}>${h(state.draft)}</textarea><button class="primary" aria-label="Send to study partner" ${state.pending ? "disabled" : ""}>↗</button></form><p class="coach-footnote">${options.userId ? "Private tutor · AI can make mistakes." : "Sign in to chat. Visual lessons work in preview."}</p></section>`;
    const input = host.querySelector("textarea");
    input.oninput = () => {
      state.draft = input.value;
    };
    host.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      ask(input.value);
    };
    host.querySelector('[data-coach-prompt="visual"]').onclick = () =>
      ask(
        options.practice && !options.answered
          ? "Give me a visual analogy or a small text diagram to understand this setup. Do not calculate the result or reveal the correct choice."
          : "Walk me through the visual for this concept. Use a short analogy or a simple labeled text diagram, then ask me one prediction question.",
      );
    host.querySelector('[data-coach-prompt="hint"]').onclick = () =>
      ask(
        options.answered
          ? "Break down the solution in short numbered steps. Explain the units and the selected answer."
          : "Give me one brief conceptual hint. Do not reveal the answer or substitute the numbers.",
      );
    const retry = host.querySelector("[data-coach-retry]");
    if (retry) retry.onclick = () => ask(state.draft);
    const log = host.querySelector(".coach-log");
    log.scrollTop = log.scrollHeight;
  }
  async function ask(text) {
    text = String(text || "").trim();
    if (!text || state.pending) return;
    if (!options.userId) {
      options.onLogin();
      return;
    }
    if (state.messages.length >= 18) {
      state.error =
        "This conversation is full. Start a new conversation below.";
      paint();
      const retry = host.querySelector("[data-coach-retry]");
      retry.textContent = "New conversation";
      retry.onclick = () => {
        state.messages = [];
        state.error = "";
        paint();
      };
      return;
    }
    state.error = "";
    state.draft = "";
    state.pending = true;
    const message = { role: "user", content: text };
    state.messages.push(message);
    paint();
    try {
      const answer = await options.request({
        messages: state.messages.slice(),
        context: options.context,
        mode: options.mode || "teach",
      });
      state.messages.push({ role: "assistant", content: answer });
    } catch (error) {
      state.messages.pop();
      state.error =
        error.message || "Your tutor could not connect. Please try again.";
      state.draft = text;
    } finally {
      state.pending = false;
      if (mounted?.state === state) mounted.paint();
    }
  }
  instance.paint = paint;
  paint();
  return {
    ask,
    focus() {
      host.querySelector("textarea")?.focus();
    },
  };
}
