const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function validateSubscription(s) {
 if (!s || typeof s.title!=='string' || !s.title.trim() || s.title.length>120 || !Number.isSafeInteger(s.amount) || s.amount<=0 || s.amount>1000000000 || !['monthly','yearly'].includes(s.interval) || !['amex','chase','debit'].includes(s.account) || !validDate(s.nextDate) || typeof s.active!=='boolean' || typeof s.notes!=='string' || s.notes.length>2000) throw Error('Enter a name, positive amount, payment account, frequency, and valid next renewal date.');
 return s;
}
function nextRenewal(date,interval,anchorDay,anchorMonth) {
 const [y,m]=date.split('-').map(Number);
 const next=new Date(Date.UTC(interval==='yearly'?y+1:y,interval==='yearly'?anchorMonth-1:m,1));
 const year=next.getUTCFullYear(),month=next.getUTCMonth();
 const day=Math.min(anchorDay,new Date(Date.UTC(year,month+1,0)).getUTCDate());
 return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function renewalBatch(s,through,limit=24) {
 validateSubscription(s);
 if(!Number.isInteger(s.anchorDay)||s.anchorDay<1||s.anchorDay>31||!Number.isInteger(s.anchorMonth)||s.anchorMonth<1||s.anchorMonth>12)throw Error('Invalid renewal anchor.');
 let nextDate=s.nextDate;const dates=[];
 while(s.active && nextDate<=through && dates.length<limit){dates.push(nextDate);nextDate=nextRenewal(nextDate,s.interval,s.anchorDay,s.anchorMonth);}
 return {dates,nextDate};
}
function easternToday(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
module.exports={validateSubscription,nextRenewal,renewalBatch,easternToday};
