// Keep provider response bodies (which may contain credentials) out of logs.
function tokenFailure(status, error) {
  if (error === 'invalid_grant') return {
    code: 'failed-precondition', reason: 'reconnect-required',
    message: 'Google Calendar authorization expired or was revoked. Click Reconnect Google and approve access again.'
  };
  if (['invalid_client', 'unauthorized_client'].includes(error)) return {
    code: 'failed-precondition', reason: 'oauth-configuration',
    message: 'Google Calendar OAuth configuration needs attention. Check the deployed Google client ID and secret.'
  };
  if (status === 429 || status >= 500) return {
    code: 'unavailable', reason: 'temporary',
    message: 'Google Calendar is temporarily unavailable. Try Retry shortly; your connection is still saved.'
  };
  return {code:'internal',reason:'oauth-error',message:'Google Calendar could not authorize this request. Try reconnecting.'};
}

async function refreshGoogleToken({refreshToken, clientId, clientSecret, fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res, data;
    try {
      res = await fetchImpl('https://oauth2.googleapis.com/token', {
        method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({refresh_token:refreshToken,client_id:clientId,client_secret:clientSecret,grant_type:'refresh_token'}),
        signal:AbortSignal.timeout(10000)
      });
      data = await res.json().catch(() => ({}));
    } catch {
      if (!attempt) { await wait(500); continue; }
      throw Object.assign(new Error('Google Calendar could not be reached. Try Retry when your connection recovers.'), {code:'unavailable',reason:'temporary'});
    }
    if (res.ok && data.access_token) return data;
    const failure = tokenFailure(res.status, data.error);
    if (failure.reason === 'temporary' && !attempt) { await wait(500); continue; }
    throw Object.assign(new Error(failure.message), failure);
  }
}
module.exports = {tokenFailure, refreshGoogleToken};
