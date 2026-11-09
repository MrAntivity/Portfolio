import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBank,BANK_INFO} from './bank.mjs';
const bank=buildBank();
const number=q=>Number.parseFloat(q.choices[q.answer]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*.0006,1e-8),`${a} != ${b}`);
test('exactly 5000 deterministic, uniquely identified, nonidentical practice items',()=>{
 assert.equal(bank.length,5000);
 assert.deepEqual(buildBank(),bank);
 assert.equal(new Set(bank.map(q=>q.id)).size,5000);
 assert.equal(new Set(bank.map(q=>(q.passage||'')+'\n'+q.prompt)).size,5000);
});
test('every question is usable and has four distinct choices',()=>{
 for(const q of bank){
  assert.equal(q.choices.length,4,q.id);
  assert.equal(new Set(q.choices).size,4,q.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
  assert.ok(q.prompt.length>20&&q.explanation.length>20,q.id);
  assert.ok(BANK_INFO.distribution[q.subject],q.id);
  assert.ok(['Foundation','Application','Challenge'].includes(q.difficulty));
  assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(q)),q.id);
  if(q.subject!=='cars')assert.ok(Number.isFinite(number(q))&&number(q)>0,q.id);
 }
});
test('public metadata honestly matches composition',()=>{
 assert.equal(new Set(bank.map(q=>q.family)).size,BANK_INFO.familyCount);
 for(const [subject,count]of Object.entries(BANK_INFO.distribution))assert.equal(bank.filter(q=>q.subject===subject).length,count);
 assert.equal(bank.filter(q=>q.variant).length,4980);
 assert.equal(bank.filter(q=>!q.variant).length,20);
 assert.equal(new Set(bank.filter(q=>q.subject==='cars').map(q=>q.passage)).size,4);
});
test('rotation preserves correct numerical answers and physical bounds',()=>{
 for(const q of bank){
  const n=Number(q.id.split('-').at(-1))-1;
  const a=number(q);
  switch(q.family){
   case 'force':close(a,(2+n%20)*(1+Math.floor(n/20)));break;
   case 'kinetic':close(a,(2+n%20)*(2+Math.floor(n/20))**2/2);break;
   case 'pressure':close(a,(800+50*Math.floor(n/20))*(1+n%20));break;
   case 'lens':{const f=5+n%20,d=f*(2+Math.floor(n/20));close(1/a+1/d,1/f);assert.ok(a>f);break;}
   case 'michaelis':{const vmax=20+n%20;assert.ok(a<vmax);close(a/vmax,(1+Math.floor(n/20))/(2+Math.floor(n/20)));break;}
   case 'hardy':{const population=10000*(1+Math.floor(n/30));close(a/population,((1+n%30)/100)**2);break;}
   case 'ventilation':close(a,((400+10*(n%30))-150)*(10+2*Math.floor(n/30))/1000);break;
   case 'enantiomeric-excess':close(a,2*Number((50+(n+1)*.49).toFixed(2))-100);assert.ok(a>0&&a<=100);break;
   case 'rf':assert.ok(a>0&&a<1);close(a,((1+n%20)/10)/(3+Math.floor(n/20)));break;
   case 'buffer-ratio':close(Math.log10(a),(1+Math.floor(n/20))/10);break;
   case 'binding':assert.ok(a>0&&a<100);break;
   case 'sensitivity':assert.ok(a>0&&a<100);close(a,100*(50+n%11)/(55+n%11+Math.floor(n/11)));break;
   case 'z-score':close(a,1+n%4);break;
   case 'risk':close(a,(10+n)/(5+n%5));break;
  }
 }
});
test('answer positions are distributed, including CARS',()=>{
 for(const subject of Object.keys(BANK_INFO.distribution)){
  const counts=[0,0,0,0];for(const q of bank.filter(q=>q.subject===subject))counts[q.answer]++;
  assert.ok(Math.max(...counts)-Math.min(...counts)<=5,`${subject}: ${counts}`);
 }
});

test('numerical answers occupy all value ranks, preventing a fixed scale shortcut',()=>{
 const ranks=new Set(bank.filter(q=>q.variant).map(q=>q.choices.map(Number.parseFloat).sort((a,b)=>a-b).indexOf(number(q))));
 assert.deepEqual([...ranks].sort(),[0,1,2,3]);
});
test('difficulty and family metadata reflect every actual question',()=>{
 for(const [difficulty,count]of Object.entries(BANK_INFO.difficultyDistribution))assert.equal(bank.filter(q=>q.difficulty===difficulty).length,count);
 assert.ok(BANK_INFO.difficultyDistribution.Foundation>0);
 assert.ok(BANK_INFO.difficultyDistribution.Application>0);
 assert.equal(BANK_INFO.difficultyDistribution.Challenge,0);
 for(const f of BANK_INFO.familyDetails){
  const items=bank.filter(q=>q.family===f.id);
  assert.equal(items.length,f.count);
  if(f.difficulty!=='Mixed')assert.ok(items.every(q=>q.difficulty===f.difficulty));
 }
 for(const [subject,count]of Object.entries(BANK_INFO.familyCountsBySubject))assert.equal(new Set(bank.filter(q=>q.subject===subject).map(q=>q.family)).size,count);
});
test('percentage and discrete-count distractors stay physically plausible',()=>{
 for(const q of bank.filter(q=>q.variant)){
  if(q.choices.every(c=>/ %$| percentage points$/.test(c)))for(const c of q.choices)assert.ok(Number.parseFloat(c)>0&&Number.parseFloat(c)<=100,q.id);
  if(q.choices.every(c=>/ (bonds|protons|cells|individuals)$/.test(c)))for(const c of q.choices)assert.ok(Number.isInteger(Number.parseFloat(c)),q.id);
 }
});
