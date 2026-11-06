const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const source=fs.readFileSync('viro/portal.js','utf8');
const fn=n=>source.match(new RegExp('(?:async )?function '+n+'\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}'))[0];
test('Calendar retries an expired access token once and shares simultaneous refreshes',async()=>{
 let tokens=0,calls=0;const ctx=vm.createContext({Date,currentUser:{uid:'test'},googleAccessToken:'old',googleAccessTokenExpiryMs:Date.now()+3600000,calendarTokenRequest:null,callGoogleCalendarToken:async()=>{tokens++;return{data:{accessToken:'new',expiresIn:3600}}},fetch:async(url,opts)=>{calls++;return opts.headers.Authorization==='Bearer old'?{status:401,ok:false}:{status:200,ok:true,json:async()=>({items:[1]})}}});
 vm.runInContext(fn('ensureGoogleAccessToken')+'\n'+fn('calendarApiFetch'),ctx);
 await Promise.all([ctx.calendarApiFetch('/events'),ctx.calendarApiFetch('/events')]);assert.equal(tokens,1);assert.equal(calls,4);
});
test('Calendar list reads all pages',async()=>{let paths=[];const ctx=vm.createContext({URLSearchParams,encodeURIComponent,calendarApiFetch:async path=>{paths.push(path);return paths.length===1?{items:[1],nextPageToken:'next token'}:{items:[2]}}});vm.runInContext(fn('calendarApiList'),ctx);assert.deepEqual(Array.from(await ctx.calendarApiList('/events?maxResults=250')),[1,2]);assert.match(paths[1],/pageToken=next%20token/);});
test('Failed calendar sync preserves previous events and never generates an empty summary',async()=>{
 const previous=[{id:'saved'}];let summaries=0,status;const ctx=vm.createContext({calendarConnected:true,calendarLoadVersion:0,calendarWeekStart:new Date('2026-11-01'),currentUser:{},calendarSyncReady:true,calendarSummaryCache:null,calendarEvents:previous,URLSearchParams,document:{getElementById:()=>({hidden:false})},addDays:(d,n)=>new Date(+d+n*86400000),calendarSyncStatus:(s)=>status=s,fetchVisibleCalendars:async()=>[{id:'a'}],calendarApiList:async()=>{throw Error('Offline')},updateOverviewScheduleCard:()=>{},renderCalendarGrid:()=>{},maybeLoadTodaySummary:()=>summaries++});vm.runInContext(fn('loadWeekEvents'),ctx);await ctx.loadWeekEvents();assert.equal(ctx.calendarEvents,previous);assert.equal(summaries,0);assert.equal(ctx.calendarSyncReady,false);assert.match(status,/Offline/);
});
test('A slower old week cannot overwrite the latest week',async()=>{
 let firstResolve,calls=0;const ctx=vm.createContext({calendarConnected:true,calendarLoadVersion:0,calendarWeekStart:new Date('2026-11-01'),currentUser:{},calendarSyncReady:false,calendarSummaryCache:null,calendarEvents:[],URLSearchParams,document:{getElementById:()=>({hidden:false})},addDays:(d,n)=>new Date(+d+n*86400000),calendarSyncStatus:()=>{},fetchVisibleCalendars:async()=>[{id:'a'}],calendarApiList:async()=>++calls===1?new Promise(r=>firstResolve=r):[{id:'new'}],renderCalendarFilterChips:()=>{},renderCalendarGrid:()=>{},maybeLoadTodaySummary:()=>{}});vm.runInContext(fn('loadWeekEvents'),ctx);const old=ctx.loadWeekEvents();await new Promise(r=>setImmediate(r));ctx.calendarWeekStart=new Date('2026-11-08');await ctx.loadWeekEvents();firstResolve([{id:'old'}]);await old;assert.equal(ctx.calendarEvents[0].id,'new');
});
test('calendar no longer requests AI summaries or shows the summary banner',()=>{const html=fs.readFileSync('viro/index.html','utf8');assert.doesNotMatch(html,/id="calendar-summary-banner"/);assert.doesNotMatch(source,/requestAi\('calendar_summary'/);});
test('overview lists only requested calendars and safely renders titles',()=>{
 const {JSDOM}=require('jsdom');const document=new JSDOM('<div id="overview-schedule-text"></div>').window.document;
 const day=new Date();day.setHours(10,0,0,0);const end=new Date(+day+3600000);
 const ctx=vm.createContext({document,Date,Set,Map,calendarSyncReady:true,calendarWeekStart:day,calendarList:[{id:'a',summary:'Aiden'},{id:'s',summary:'School'},{id:'n',summary:'NAPhi Kappa Chapter'},{id:'f',summary:'Formula 1'}],calendarEvents:['a','s','n','f'].map(calendarId=>({calendarId,summary:calendarId==='a'?'<img src=x>':calendarId,start:{dateTime:day.toISOString()},end:{dateTime:end.toISOString()}}))});
 vm.runInContext(['toIsoDate','startOfWeek','addDays','maybeLoadTodaySummary'].map(fn).join('\n'),ctx);ctx.calendarWeekStart=ctx.startOfWeek(day);ctx.maybeLoadTodaySummary();
 assert.equal(document.querySelectorAll('.overview-schedule-event').length,3);assert.equal(document.querySelector('img'),null);assert.doesNotMatch(document.body.textContent,/Formula 1/);
});
test('workspace search opens a modal only with an authenticated session',()=>{
 let allowed=false,opened=0,focused=0,searched=0;
 const ctx=vm.createContext({hasPortalSession:()=>allowed,searchDialog:{open:false,append:()=>{},showModal(){this.open=true;opened++}},searchPanel:{},universalSearchInput:{value:'school',focus:()=>focused++},runUniversalSearch:()=>searched++});
 vm.runInContext(fn('openWorkspaceSearch'),ctx);ctx.openWorkspaceSearch();assert.equal(opened,0);allowed=true;ctx.openWorkspaceSearch();assert.equal(opened,1);assert.equal(focused,1);assert.equal(searched,1);
});
test('workspace search matches titles and metadata without an AI request',async()=>{
 let ids;const ctx=vm.createContext({hasPortalSession:()=>true,buildGlobalSearchItems:()=>[{id:'1',type:'contact',title:'Alex',subtitle:'School'},{id:'2',type:'file',title:'Receipt',subtitle:'Laptop'}],UNIVERSAL_TYPE_LABEL:{contact:'Contact',file:'File'},renderUniversalResults:value=>ids=value,universalSearchStatus:{}});
 vm.runInContext(fn('runUniversalSearch'),ctx);await ctx.runUniversalSearch('school');assert.deepEqual(Array.from(ids),['1']);
});
