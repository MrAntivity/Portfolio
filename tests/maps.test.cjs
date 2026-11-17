const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
test('map editing, study, saved versions, copy, recovery and Notes',async()=>{
  const {mountMaps}=await import('../viro/maps-editor.js');
  const dom=new JSDOM('<section></section>',{url:'https://example.test/viro/maps'});
  global.window=dom.window;global.localStorage=dom.window.localStorage;
  const root=dom.window.document.querySelector('section'),q=s=>root.querySelector(s);
  const records=new Map();let notify;
  const api={uid:'owner',notes:()=>[],cleanNote:x=>x,subscribe(fn){notify=()=>fn([...records.values()]);notify();return ()=>{};},
    async create(value){const id=crypto.randomUUID();records.set(id,{...value,id,revision:0});notify();return id;},
    async write(id,value,rev){if(records.get(id).revision!==rev)throw Error('conflict');records.set(id,{...value,id,revision:rev+1});notify();return rev+1;}};
  let app=mountMaps(root,api);
  const click=s=>root.onclick({target:q(s)}),act=k=>click('[data-act="'+k+'"]'),nodes=()=>root.querySelectorAll('[data-node]').length;
  try {
    await click('[data-template="Feedback loop"]');assert.equal(nodes(),3);assert.equal(root.querySelectorAll('[data-edge]').length,3);
    await click('[data-node]');await act('branch');assert.equal(nodes(),4);await act('undo');assert.equal(nodes(),3);await act('redo');assert.equal(nodes(),4);
    await click('[data-node]');await act('connect');await click('[data-node]');assert.equal(root.querySelectorAll('[data-edge]').length,5);
    await act('layout');await act('study');assert.equal(q('[data-node]').getAttribute('aria-label'),'Recall concept');await act('reveal');assert.equal(q('[data-node]').getAttribute('aria-label'),'Stimulus');await act('study');
    const board=q('.map-board');board.setPointerCapture=()=>{};const pos=q('[data-node]').getAttribute('transform');
    board.onpointerdown({target:q('[data-node]'),button:0,clientX:1,clientY:1});board.onpointermove({clientX:40,clientY:20});board.onpointerup();assert.notEqual(q('[data-node]').getAttribute('transform'),pos);
    await act('save');const first=[...records.values()][0];assert.equal(first.nodes.length,4);assert.ok(first.revision>0);
    await act('copy');const second=[...records.values()][1];assert.ok(second.nodes.every(n=>!first.nodes.some(v=>v.id===n.id)));assert.ok(second.edges.every(e=>second.nodes.some(n=>n.id===e.from)&&second.nodes.some(n=>n.id===e.to)));
    await act('back');await click('[data-open="'+first.id+'"]');assert.equal(nodes(),4);
    records.set(first.id,{...first,revision:first.revision+1});await act('add');await act('save');assert.equal(records.get(first.id).nodes.length,4);assert.ok(localStorage.getItem('viro.maps.owner.'+first.id));
    app.dispose();app=mountMaps(root,api);await click('[data-open="'+first.id+'"]');assert.equal(nodes(),5);
    await act('copy');await act('trash');q('.map-library select').value='Trash';q('.map-library select').onchange();assert.equal(root.querySelectorAll('[data-open]').length,1);await click('[data-open]');await act('trash');assert.equal(root.querySelectorAll('[data-open]').length,0);
    await app.fromNote({id:'note',title:'Physiology',contentHtml:'<h2>Exercise</h2><li>Heart rate</li>'});assert.equal(nodes(),3);assert.ok([...records.values()].at(-1).nodes.every(n=>n.noteId==='note'));
  } finally {app.dispose();dom.window.close();delete global.window;delete global.localStorage;}
});

test('canvas connection, inline naming, keyboard branches, manual routing and fold persistence',async()=>{
  const {mountMaps}=await import('../viro/maps-editor.js');
  const {importMap}=await import('../viro/maps-model.mjs');
  const dom=new JSDOM('<section></section>',{url:'https://test.invalid/viro/maps'});
  global.window=dom.window;global.localStorage=dom.window.localStorage;
  const root=dom.window.document.querySelector('section'),q=s=>root.querySelector(s);
  let saved;
  const app=mountMaps(root,{uid:'test',subscribe(){return ()=>{};},notes:()=>[],create:async v=>{saved=v;return 'id';},write:async(id,v,r)=>{saved=v;return r+1;}});
  const board=q('.map-board'),canvas=board.querySelector('svg'),input=q('.md-inline');
  board.setPointerCapture=()=>{};
  const click=target=>root.onclick({target}),act=name=>click(q('[data-act="'+name+'"]'));
  const node=i=>canvas.querySelectorAll('[data-node]')[i],count=()=>canvas.querySelectorAll('[data-node]').length;
  const key=(target,key)=>({target,key,preventDefault(){},stopPropagation(){}});
  const finish=value=>{input.value=value;input.onkeydown(key(input,'Enter'));};
  const screen=(x,y)=>{const [cx,cy,w]=canvas.getAttribute('viewBox').split(' ').map(Number);return {clientX:(x-cx)*800/w,clientY:(y-cy)*800/w};};
  function drag(target,start,end){board.onpointerdown({target,button:0,pointerId:1,...start});board.onpointermove({pointerId:1,...end});board.onpointerup({pointerId:1});}
  try{
    await click(q('[data-template="Mind map"]'));await click(node(0));
    const src=saved.nodes[0],dest=saved.nodes[1];
    drag(q('[data-port]'),screen(src.x,src.y+30),screen(dest.x+80,dest.y+30));
    assert.equal(input.hidden,false);finish('regulates');await act('save');
    const edge=saved.edges.at(-1);assert.deepEqual([edge.from,edge.to,edge.label],[src.id,dest.id,'regulates']);
    drag(q('[data-bend]'),screen(200,200),screen(125,156));await act('save');
    assert.deepEqual(saved.edges.at(-1).bend,{x:125,y:156});assert.deepEqual(importMap(saved).edges.at(-1).bend,{x:125,y:156});
    await act('undo');await act('save');assert.equal(saved.edges.at(-1).bend,undefined);
    await click(node(0));root.onkeydown(key(board,'Tab'));finish('Child');await act('save');assert.equal(count(),4);
    root.onkeydown(key(board,'Enter'));finish('Sibling');await act('save');assert.equal(saved.edges.at(-1).from,src.id);
    await click(node(0));await act('fold');await act('save');assert.equal(count(),1);assert.equal(importMap(saved,false).nodes[0].folded,true);
    await act('fold');assert.equal(count(),5);
    await click(node(1));board.ondblclick({target:node(1)});input.value='Discard';input.onkeydown(key(input,'Escape'));await act('save');assert.equal(saved.nodes[1].label,dest.label);
  }finally{app.dispose();dom.window.close();delete global.window;delete global.localStorage;}
});
