const admin=require('firebase-admin');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {assertPortalOwner}=require('./portal-auth');
const {validateSubscription,renewalBatch,easternToday}=require('./subscription-model');
const stamp=()=>admin.firestore.FieldValue.serverTimestamp();
async function processSubscription(db,uid,id,through=easternToday()) {
 const ref=db.doc(`users/${uid}/budgetSubscriptions/${id}`);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);if(!snap.exists)return;
  const s=snap.data();if(!s.active)return;
  const settings=await tx.get(db.doc(`users/${uid}/budget/settings`));if(!settings.exists)return;
  const {dates,nextDate}=renewalBatch(s,through);
  const refs=dates.map(date=>db.doc(`users/${uid}/budgetEntries/subscription-${id}-${date}`));
  const existing=await Promise.all(refs.map(r=>tx.get(r)));
  dates.forEach((date,i)=>{if(!existing[i].exists)tx.set(refs[i],{kind:'expense',title:s.title,amount:s.amount,account:s.account,date,category:'Other',notes:s.notes,subscriptionId:id,automatic:true,refunded:0,voided:false,createdAt:stamp()});});
  if(dates.length)tx.update(ref,{nextDate,revision:(s.revision||0)+1,updatedAt:stamp(),lastRecordedDate:dates.at(-1)});
 });
}
async function processAll(db,uid) {
 const snapshots=await db.collection(`users/${uid}/budgetSubscriptions`).where('active','==',true).get();
 for(const snap of snapshots.docs)await processSubscription(db,uid,snap.id);
}
exports.manageBudgetSubscriptions=onCall({cors:true},async request=>{
 assertPortalOwner(request);const db=admin.firestore(),uid=request.auth.uid;
 const {action,id,value,revision=0}=request.data||{};
 if(action==='sync'){await processAll(db,uid);return {ok:true};}
 if(action!=='save'||typeof id!=='string'||!/^[-\w]{1,80}$/.test(id))throw new HttpsError('invalid-argument','Invalid subscription request.');
 let s;
 try{s=validateSubscription(value);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const ref=db.doc(`users/${uid}/budgetSubscriptions/${id}`);
 await db.runTransaction(async tx=>{
  const [snap,settings]=await Promise.all([tx.get(ref),tx.get(db.doc(`users/${uid}/budget/settings`))]);
  if(!settings.exists)throw new HttpsError('failed-precondition','Set up your budget first.');
  const old=snap.data();
  if((old?.revision||0)!==revision)throw new HttpsError('aborted','This subscription changed. Reopen Edit to load the latest renewal.');
  if(s.nextDate<settings.data().startDate)throw new HttpsError('invalid-argument','Renewal must be on or after your budget opening date.');
  if(!old&&s.nextDate<easternToday())throw new HttpsError('invalid-argument','Choose today or a future next renewal date.');
  if(old && (s.nextDate!==old.nextDate || (!old.active && s.active)) && s.nextDate<easternToday())throw new HttpsError('invalid-argument','Choose today or a future next renewal date.');
  const sameAnchor=old&&old.nextDate===s.nextDate&&old.interval===s.interval;
  tx.set(ref,{title:s.title.trim(),amount:s.amount,interval:s.interval,account:s.account,nextDate:s.nextDate,active:s.active,notes:s.notes,anchorDay:sameAnchor?old.anchorDay:Number(s.nextDate.slice(8)),anchorMonth:sameAnchor?old.anchorMonth:Number(s.nextDate.slice(5,7)),revision:revision+1,updatedAt:stamp(),...(!old?{createdAt:stamp()}:{})},{merge:true});
 });
 return {ok:true};
});
exports.recordSubscriptionRenewals=onSchedule({schedule:'every 60 minutes',timeZone:'America/New_York',retryCount:3},async()=>{
 const owner=await admin.auth().getUserByEmail('aiden@viro.local');
 if(owner.disabled)return;
 await processAll(admin.firestore(),owner.uid);
});
exports.processSubscription=processSubscription;
