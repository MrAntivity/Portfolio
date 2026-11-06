import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getFunctions, httpsCallable} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';
import {firebaseConfig, PORTAL_ACCOUNT_EMAIL} from '../firebase-config.js';
import {consumeCalendarRedirect, PENDING_KEY} from '../calendar-redirect.js';
const params = window.calendarOAuthResponse;
delete window.calendarOAuthResponse;
const status = document.getElementById('status');
try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.email !== PORTAL_ACCOUNT_EMAIL) {
    sessionStorage.removeItem(PENDING_KEY);
    throw new Error('Sign in to your portal, then start Calendar connection again.');
  }
  const request = consumeCalendarRedirect({params, storage:sessionStorage, uid:user.uid, origin:location.origin});
  await httpsCallable(getFunctions(app, 'us-central1'), 'googleCalendarConnect')(request);
  location.replace('/viro/calendar');
} catch (error) {
  status.textContent = error.message || 'Calendar could not connect. Return to Calendar and try again.';
}
