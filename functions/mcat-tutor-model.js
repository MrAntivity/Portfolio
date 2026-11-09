'use strict';

const MODES = ['teach', 'socratic', 'explain', 'cars'];
const LIMITS = Object.freeze({ windowMs: 10 * 60 * 1000, windowRequests: 12, dailyRequests: 100 });
function invalid(message) {
  const error = new Error(message);
  error.code = 'invalid-argument';
  throw error;
}
function validateTutorInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) invalid('Send a study question.');
  const mode = data.mode || 'teach';
  if (!MODES.includes(mode)) invalid('Choose a valid tutor mode.');
  if (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 20) {
    invalid('Start a new conversation after 10 questions.');
  }
  let total = 0;
  const messages = data.messages.map(message => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim()) {
      invalid('Messages must contain a question or tutor response.');
    }
    const maxLength = message.role === 'user' ? 4000 : 10000;
    if (message.content.length > maxLength) invalid('Please shorten your message or start a new conversation.');
    total += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (total > 40000 || messages.at(-1).role !== 'user') invalid('Start a new conversation and send your question again.');
  const context = {};
  if (data.context != null) {
    if (typeof data.context !== 'object' || Array.isArray(data.context)) invalid('Study context must be an object.');
    for (const [field, maxLength] of Object.entries({ subject: 100, title: 200, lesson: 12000, question: 8000 })) {
      const value = data.context[field];
      if (value == null) continue;
      if (typeof value === 'string') context[field] = value;
      else if (['lesson', 'question'].includes(field) && typeof value === 'object') {
        try { context[field] = JSON.stringify(value); } catch { invalid('Study context could not be read.'); }
      } else invalid('Study context contains an invalid field.');
      if (context[field].length > maxLength) invalid('The study selection is too long; choose a smaller section.');
    }
  }
  return { mode, messages, context };
}
function easternDate(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
function nextUsage(previous = {}, now = Date.now()) {
  const date = easternDate(now);
  const freshWindow = !Number.isFinite(previous.since) || now - previous.since >= LIMITS.windowMs;
  const windowCount = freshWindow ? 0 : Math.max(0, previous.windowCount || 0);
  const dailyCount = previous.date === date ? Math.max(0, previous.dailyCount || 0) : 0;
  if (dailyCount >= LIMITS.dailyRequests || windowCount >= LIMITS.windowRequests) {
    const error = new Error(dailyCount >= LIMITS.dailyRequests
      ? 'You have reached today’s 100 tutor requests. Your lessons and practice still work; the tutor resets at midnight Eastern time.'
      : 'Please wait a few minutes before asking more tutor questions.');
    error.code = 'resource-exhausted';
    throw error;
  }
  return { date, dailyCount: dailyCount + 1, since: freshWindow ? now : previous.since, windowCount: windowCount + 1 };
}
module.exports = { MODES, LIMITS, validateTutorInput, nextUsage };
