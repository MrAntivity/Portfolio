export const ACCOUNTS = { debit: 'Chase debit / checking', amex: 'Amex Gold', chase: 'Chase Freedom Unlimited' };
export const CATEGORIES = ['Food', 'Groceries', 'School', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Rent & fees', 'Other'];
export const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(n/100);
export const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function cents(value) {
  let text=String(value).trim().replace(/^\$\s*/, '');
  if(!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) throw Error('Use a dollar amount such as 1400, 1,400.00, or $1,400.00 (at most two decimal places).');
  text=text.replace(/,/g, '');
  if(text.startsWith('.'))text='0'+text;
  const [a,b='']=text.split('.'),n=Number(a)*100+Number(b.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)||n>1000000000) throw Error('Amount is too large.');
  return n;
}
export function dateValid(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s; }
const integer = n => Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
export function validateSettings(s) {
  if(!s||s.version!==1||!dateValid(s.startDate)) throw Error('Choose a valid opening date.');
  for(const k of ['openingBank','openingAmex','openingChase','monthlyIncome','livingBudget','rentBudget','rentFee','cushion','priorLiving','priorRent']) if(!integer(s[k])) throw Error('Check all setup amounts.');
  if(!Array.isArray(s.bills)||s.bills.length>100)throw Error('Invalid bills.');
  const ids=new Set();for(const b of s.bills){validateBill(b);if(ids.has(b.id))throw Error('Duplicate bill.');ids.add(b.id);}
  return s;
}
export function validateBill(b) {
  if(!b||!/^[-\w]{1,80}$/.test(b.id)||!['amex','chase'].includes(b.account)||!integer(b.amount)||b.amount===0||!dateValid(b.dueDate)||typeof b.title!=='string'||!b.title.trim()||b.title.length>120||typeof b.estimated!=='boolean')throw Error('Check the bill title, card, amount and due date.');
  return b;
}
export function validateEntry(e,s,now=today()) {
  if(!e||!['expense','income','payment','refund'].includes(e.kind)||typeof e.title!=='string'||!e.title.trim()||e.title.length>120||typeof e.notes!=='string'||e.notes.length>2000||!integer(e.amount)||e.amount===0)throw Error('Enter a title and an amount greater than zero.');
  if(!dateValid(e.date)||e.date<s.startDate||e.date>now)throw Error('Use a transaction date between your opening date and today.');
  if(!Object.hasOwn(ACCOUNTS,e.account)||(e.kind==='income'&&e.account!=='debit')||(e.kind==='payment'&&e.account==='debit'))throw Error('Choose the correct account.');
  if(e.kind==='expense'&&!CATEGORIES.includes(e.category))throw Error('Choose a spending category.');
  return e;
}
export function summarize(s,entries,month=today().slice(0,7)) {
  let bank=s.openingBank,amex=s.openingAmex,chase=s.openingChase,income=0,living=month===s.startDate.slice(0,7)?s.priorLiving:0,rent=month===s.startDate.slice(0,7)?s.priorRent:0;
  const categories={},paid={};
  for(const e of entries.filter(e=>!e.voided)){
    const sign=e.kind==='refund'?-1:1;
    if(e.kind==='income')bank+=e.amount;
    else if(e.kind==='payment'){bank-=e.amount;if(e.account==='amex')amex-=e.amount;else chase-=e.amount;if(e.billId)paid[e.billId]=(paid[e.billId]||0)+e.amount;}
    else{if(e.account==='debit')bank-=sign*e.amount;else if(e.account==='amex')amex+=sign*e.amount;else chase+=sign*e.amount;}
    if(e.date.slice(0,7)===month){
      if(e.kind==='income')income+=e.amount;
      if(e.kind==='expense'||e.kind==='refund'){const n=sign*e.amount;if(e.category==='Rent & fees')rent+=n;else living+=n;categories[e.category]=(categories[e.category]||0)+n;}
    }
  }
  const debt=Math.max(0,amex)+Math.max(0,chase),remainingLiving=Math.max(0,s.livingBudget-living),remainingRent=Math.max(0,s.rentBudget+s.rentFee-rent);
  return {bank,amex,chase,debt,net:bank-amex-chase,income,living,rent,categories,paid,remainingLiving,remainingRent,comfortable:bank-debt-remainingLiving-remainingRent-s.cushion};
}
export function wishlistStatus(items,summary) {
  let available=summary.comfortable;
  return [...items].filter(i=>!i.archived&&!i.purchaseId).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)).map(i=>{const shortfall=Math.max(0,i.amount-available),comfortable=shortfall===0;available-=i.amount;return{...i,comfortable,shortfall};});
}
export function refundedAmount(id,entries){return entries.filter(e=>e.kind==='refund'&&e.originalId===id&&!e.voided).reduce((n,e)=>n+e.amount,0);}
