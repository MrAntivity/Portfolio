export const PENDING_KEY = 'viro.calendar.oauth.pending';
export function beginCalendarRedirect({origin, uid, clientId, storage, crypto, now = Date.now()}) {
  if (!['https://aidenyue.com', 'https://www.aidenyue.com', 'https://mrantivity.github.io'].includes(origin) || !uid) throw new Error('Sign in to the portal before connecting Calendar.');
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const redirectUri = origin + '/viro/calendar-connect/';
  storage.setItem(PENDING_KEY, JSON.stringify({state, uid, redirectUri, createdAt:now}));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:clientId, redirect_uri:redirectUri, response_type:'code', scope:'https://www.googleapis.com/auth/calendar', access_type:'offline', prompt:'consent select_account', state}).toString();
  return url.href;
}
export function consumeCalendarRedirect({params, storage, uid, origin, now = Date.now()}) {
  const raw = storage.getItem(PENDING_KEY);
  storage.removeItem(PENDING_KEY);
  let pending;
  try { pending = JSON.parse(raw); } catch {}
  if (!pending || !uid || pending.uid !== uid || !params.get('state') || params.get('state') !== pending.state || pending.redirectUri !== origin + '/viro/calendar-connect/' || !Number.isFinite(pending.createdAt) || now < pending.createdAt || now - pending.createdAt > 15 * 60 * 1000) throw new Error('This sign-in attempt expired or belongs to another session. Return to Calendar and start again.');
  if (params.has('error')) throw new Error('Google authorization was not completed. Return to Calendar and approve access to reconnect.');
  const code = params.get('code');
  if (!code) throw new Error('Google did not return authorization. Return to Calendar and try again.');
  return {code, redirectUri:pending.redirectUri};
}
