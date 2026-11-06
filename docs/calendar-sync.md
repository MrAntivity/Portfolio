# Calendar sync recovery

The popup authorization code flow must exchange its code with the calling page's origin as redirect_uri (https://aidenyue.com), not postmessage. The frontend now explicitly supplies location.origin, compatible with the previously deployed connect function too.

Refresh failures can be expired/revoked consent, incorrect OAuth client credentials, or temporary Google/network outages. The screenshot's older generic error does not distinguish those cases. The updated backend provides a sanitized reason, retries temporary failures once with a ten-second timeout per attempt, and never logs raw token responses. Refresh tokens remain server-only.

## Activate the backend changes

From a checkout containing this change, using Node 22:

```sh
npm --prefix functions ci
npx firebase-tools deploy --only functions:googleCalendarConnect,functions:googleCalendarToken --project aidenyue
```

No Firestore rule changes are needed. The website's origin fix works even before this backend deployment. After the site update, reload Calendar and click Reconnect Google to grant fresh access. Approve calendar permissions in the Google popup. Then check that events appear and Retry succeeds.

If consent expires every seven days, check Google Auth Platform > Audience for project aidenyue. External apps in Testing receive seven-day refresh tokens for Calendar scopes. Move the app to In production if appropriate, complete any Google-required configuration/verification, then reconnect to issue a new token. This cannot be verified or changed from the public website.

If the error instead says OAuth configuration needs attention, verify GOOGLE_CLIENT_SECRET belongs to the same client ID used by viro/firebase-config.js and functions/index.js, then redeploy the two functions. Do not paste secrets into chat or commit them.

References:
- https://developers.google.com/identity/oauth2/web/guides/use-code-model
- https://developers.google.com/identity/protocols/oauth2
