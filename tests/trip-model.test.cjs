const { test } = require('node:test');
const assert = require('node:assert/strict');
const values = { title: 'A weekend away', authorName: 'Aiden', locationLabel: 'Boston', address: '', country: 'United States', lat: '42.36', lng: '-71.06', startDate: '2026-09-01', endDate: '2026-09-03', people: 'Aiden, Sam, aiden, Alex', description: 'A memorable weekend.', excursions: 'Harbor walk\nDinner with friends' };
test('trip validation normalizes people and excursions without silently dropping a bad pin', async () => {
 const m = await import('../trip/model.js'); const d = m.validateTrip(values); assert.deepEqual(d.people, ['aiden','Sam','Alex']); assert.equal(d.excursions.length, 2); assert.equal(d.lat, 42.36);
 assert.throws(() => m.validateTrip({...values, lat:''}), /location/); assert.throws(() => m.validateTrip({...values, lng:'999'}), /location/);
});
test('invalid date ranges and impossible calendar dates cannot be submitted', async () => {
 const m = await import('../trip/model.js'); assert.throws(() => m.validateTrip({...values,endDate:'2026-08-31'}), /dates/); assert.throws(() => m.validateTrip({...values,startDate:'2026-02-31'}), /dates/);
});
test('uploads reject unsupported formats, oversized originals, and batches over twenty', async () => {
 const m = await import('../trip/model.js'); assert.doesNotThrow(() => m.validateFiles([{name:'a.heic',type:'image/heic',size:100},{name:'IMG.HEIC',type:'',size:100},{name:'a.heif',type:'application/octet-stream',size:100}])); assert.throws(() => m.validateFiles([{name:'a.pdf',type:'application/pdf',size:100}]), /JPEG/); assert.throws(() => m.validateFiles([{name:'a.jpg',type:'image/jpeg',size:21*1024*1024}]), /20 MB/); assert.throws(() => m.validateFiles(Array(21).fill({type:'image/jpeg',size:100})), /20 photos/);
});
test('search matches people and excursions; year and map stats are consistent', async () => {
 const m = await import('../trip/model.js'); const a = m.validateTrip(values), b = {...a,title:'Another weekend',startDate:'2025-09-01',people:['Sam','Taylor']}; assert.equal(m.filterTrips([a,b], 'harbor Sam', '2026').length, 1); assert.deepEqual(m.tripStats([a,b]),{trips:2,places:1,friends:4});
});
test('user content is escaped before rendering', async () => {
 const {escapeHtml} = await import('../trip/model.js'); assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});
test('travel guests cannot invoke private portal functions', () => {
 const {assertPortalOwner} = require('../functions/portal-auth'); assert.throws(()=>assertPortalOwner({auth:{uid:'guest',token:{firebase:{sign_in_provider:'anonymous'}}}}),{code:'permission-denied'}); assert.throws(()=>assertPortalOwner({}),{code:'unauthenticated'}); assert.doesNotThrow(()=>assertPortalOwner({auth:{uid:'owner',token:{email:'aiden@viro.local'}}}));
});
