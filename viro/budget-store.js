import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { validateSettings, validateEntry, validateBill } from './budget-model.js';
export function createBudgetStore(db,uid){
 const settings=doc(db,'users',uid,'budget','settings');
 const entries=collection(db,'users',uid,'budgetEntries'),wishes=collection(db,'users',uid,'budgetWishlist');
 return {
  subscribe(callback,error){let state={settings:undefined,entries:undefined,wishes:undefined};const update=(k,v)=>{state[k]=v;if(Object.values(state).every(v=>v!==undefined))callback({...state});};const stops=[onSnapshot(settings,s=>update('settings',s.exists()?s.data():null),error),onSnapshot(entries,s=>update('entries',s.docs.map(d=>({...d.data(),id:d.id}))),error),onSnapshot(wishes,s=>update('wishes',s.docs.map(d=>({...d.data(),id:d.id}))),error)];return()=>stops.forEach(f=>f());},
  async setup(value){validateSettings(value);await runTransaction(db,async tx=>{const snap=await tx.get(settings);if(snap.exists())throw Error('A budget already exists. Use Plan settings instead.');tx.set(settings,{...value,createdAt:serverTimestamp()});});},
  async plan(values){await runTransaction(db,async tx=>{const snap=await tx.get(settings);if(!snap.exists())throw Error('Set up your budget first.');const next={...snap.data(),...values};validateSettings(next);tx.update(settings,{monthlyIncome:next.monthlyIncome,livingBudget:next.livingBudget,rentBudget:next.rentBudget,rentFee:next.rentFee,cushion:next.cushion});});},
  async bill(value){validateBill(value);await runTransaction(db,async tx=>{const snap=await tx.get(settings);if(!snap.exists())throw Error('Set up your budget first.');const s=snap.data(),existing=s.bills.find(b=>b.id===value.id);if(existing&&existing.account!==value.account)throw Error('A saved statement must stay on its original card. Add a new statement for a different card.');const bills=s.bills.filter(b=>b.id!==value.id).concat(value);validateSettings({...s,bills});tx.update(settings,{bills});});},
  async add(value,id){const ref=doc(entries,id);await runTransaction(db,async tx=>{
   const [config,existing]=await Promise.all([tx.get(settings),tx.get(ref)]);if(existing.exists())throw Error('This transaction has already been recorded.');if(!config.exists())throw Error('Set up your budget first.');validateEntry(value,config.data());
   let original,originalRef,wish,wishRef;
   if(value.kind==='refund'){originalRef=doc(entries,value.originalId);original=(await tx.get(originalRef)).data();if(!original||original.kind!=='expense'||original.voided)throw Error('The original purchase is unavailable.');if(value.amount>original.amount-(original.refunded||0))throw Error('Refund exceeds the remaining purchase amount.');if(value.date<original.date)throw Error('A refund cannot be before its purchase.');value={...value,account:original.account,category:original.category};}
   if(value.wishlistId){wishRef=doc(wishes,value.wishlistId);wish=(await tx.get(wishRef)).data();if(!wish||wish.archived||wish.purchaseId)throw Error('This wishlist item was already purchased or removed.');}
   if(value.kind==='payment'&&value.billId){const b=config.data().bills.find(b=>b.id===value.billId);if(!b||b.account!==value.account)throw Error('Choose a bill for this card.');}
   if(original)tx.update(originalRef,{refunded:(original.refunded||0)+value.amount});
   if(wish)tx.update(wishRef,{purchaseId:id});
   tx.set(ref,{...value,refunded:0,voided:false,createdAt:serverTimestamp()});
  });},
  async voidEntry(id){await runTransaction(db,async tx=>{const ref=doc(entries,id),snap=await tx.get(ref),e=snap.data();if(!e||e.voided)throw Error('Already voided or unavailable.');if(e.kind==='expense'&&e.refunded>0)throw Error('Void its refunds first, then void the original purchase.');
   let original,originalRef,wishRef,wish;
   if(e.kind==='refund'){originalRef=doc(entries,e.originalId);original=(await tx.get(originalRef)).data();if(!original)throw Error('Original purchase is unavailable.');}
   if(e.wishlistId){wishRef=doc(wishes,e.wishlistId);wish=(await tx.get(wishRef)).data();}
   if(original)tx.update(originalRef,{refunded:Math.max(0,(original.refunded||0)-e.amount)});
   if(wish?.purchaseId===id)tx.update(wishRef,{purchaseId:null});
   tx.update(ref,{voided:true,voidedAt:serverTimestamp()});
  });},
  async wish(value,id){if(!value.title?.trim()||value.title.length>120||!Number.isSafeInteger(value.amount)||value.amount<=0||value.amount>1000000000||!Number.isInteger(value.priority)||value.priority<1||value.priority>99||typeof value.notes!=='string'||value.notes.length>2000)throw Error('Enter a title, price, and priority from 1 to 99.');await runTransaction(db,async tx=>{const ref=doc(wishes,id),snap=await tx.get(ref);if(snap.exists())throw Error('This item is already saved.');tx.set(ref,{...value,archived:false,purchaseId:null,createdAt:serverTimestamp()});});},
  async archiveWish(id){await runTransaction(db,async tx=>{const ref=doc(wishes,id),snap=await tx.get(ref);if(!snap.exists())throw Error('Item unavailable.');tx.update(ref,{archived:true});});}
 };
}
