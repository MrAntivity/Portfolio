const { HttpsError } = require('firebase-functions/v2/https');
// Guest travel contributors must never gain access to the private portal's AI or calendar.
function assertPortalOwner(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  if (request.auth.token?.email !== 'aiden@viro.local') throw new HttpsError('permission-denied', 'This function is reserved for the private portal.');
}
module.exports = { assertPortalOwner };
