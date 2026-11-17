import {newMap, concept, link, importMap, arrange, colors} from './maps-model.mjs';
import {createNoteSaver} from './notes-save.js';

export function mountMaps(root, api) {
  const document = root.ownerDocument;
  const q = selector => root.querySelector(selector);
  root.innerHTML = `
    <div class="map-library"><header><h2>Concept Maps</h2><div><button data-act="import">Import JSON</button> <button class="map-primary" data-act="new">+ New map</button></div></header>
    <div class="map-templates"><button data-template="Mind map"><b>Mind map</b><small>Branch out from a central idea</small></button><button data-template="Feedback loop"><b>Feedback loop</b><small>Explore a circular relationship</small></button></div>
    <div class="map-tools"><input type="search" aria-label="Search maps and folders" placeholder="Search maps and folders"><select aria-label="Filter maps"><option>All maps</option><option>Favorites</option><option>Trash</option></select></div><div class="map-list"></div></div>
    <div class="map-editor" hidden><header><button data-act="back">← Maps</button><input class="map-title" maxlength="150" aria-label="Map title"><button data-act="copy">Save a copy</button></header>
    <div class="map-tools"><button class="map-primary" data-act="add">+ Concept</button><button data-act="connect">Connect</button><button data-act="layout">Arrange</button><button data-act="undo">Undo</button><button data-act="redo">Redo</button><button data-act="study">Study</button><button data-act="json">Export JSON</button><button data-act="svg">Export SVG</button><button data-act="save">Save now</button></div>
    <div class="map-board" tabindex="0" aria-label="Map canvas"><svg aria-label="Concept map"></svg></div>
    <div class="map-tools"><button data-act="minus" aria-label="Zoom out">−</button><output></output><button data-act="plus" aria-label="Zoom in">+</button><small class="map-help"></small></div><div class="map-fields"></div></div>
    <p role="status">Loading maps…</p><input type="file" hidden accept=".json,application/json">`;
  const board=q('.map-board'), canvas=q('svg'), fields=q('.map-fields');
  let records=[],map,id,saver,selected,source,drag,study=false,revealed=false,dead=false,busy=false,zoom=1;
  let undo=[],redo=[];
  const draftKey = id => 'viro.maps.'+api.uid+'.'+id;
  const status = message => { if(!dead)q('[role=status]').textContent=message; };
  function element(parent,tag,label,attrs={}) {
    const n=document.createElement(tag);
    if(label!=null)n.textContent=label;
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
    parent.append(n);return n;
  }
  function svg(tag,parent,attrs={}) {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);
    parent.append(n);return n;
  }
  function library() {
    const list=q('.map-list');list.replaceChildren();
    const filter=q('.map-library select').value,term=q('[type=search]').value.toLowerCase();
    const visible=records.filter(r=>!!r.trashed===(filter==='Trash')&&(filter!=='Favorites'||r.favorite)&&[r.title,r.folder].join(' ').toLowerCase().includes(term));
    visible.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
    for(const r of visible){
      const b=element(list,'button',null,{'data-open':r.id});element(b,'b',(r.favorite?'★ ':'')+r.title);
      element(b,'small',[r.folder,r.nodes.length+' concepts',r.edges.length+' relationships'].filter(Boolean).join(' · '));
    }
    if(!visible.length)element(list,'p',term?'No matching maps.':filter==='Trash'?'Trash is empty.':filter==='Favorites'?'Star a map to see it here.':'Create a map or choose a template to begin.');
  }
  function open(key,value,revision) {
    if(dead)return;
    const data=importMap(value,false);
    saver?.dispose();id=key;map=data;selected=null;source=null;drag=null;undo=[];redo=[];study=false;revealed=false;zoom=1;
    saver=createNoteSaver({write:(v,r)=>api.write(key,v,r),status,stash:v=>localStorage.setItem(draftKey(key),JSON.stringify(v)),clear:()=>localStorage.removeItem(draftKey(key))});
    saver.setRevision(revision);status('All changes saved');
    try {
      const stored=localStorage.getItem(draftKey(key));
      if(stored){const draft=JSON.parse(stored);map=importMap(draft,false);saver.setRevision(draft.revision);saver.edit(structuredClone(map));status('Recovered your local draft.');}
    } catch {status('Local draft recovery is unavailable.');}
    q('.map-library').hidden=true;q('.map-editor').hidden=false;render();
  }
  async function create(value){const key=await api.create(value);open(key,value,0);}
  async function back(){await saver.flush();if(dead)return;saver.dispose();saver=null;id=null;map=null;q('.map-editor').hidden=true;q('.map-library').hidden=false;library();status('');}
  function checkpoint(before){undo.push(before);if(undo.length>60)undo.shift();redo=[];saver.edit(structuredClone(map));render();}
  function change(edit){const before=structuredClone(map);edit();checkpoint(before);}
  function step(a,b){if(!a.length)return;b.push(map);map=a.pop();selected=null;source=null;saver.edit(structuredClone(map));render();}
  function draw() {
    const width=Math.max(650,board.clientWidth/zoom,...map.nodes.map(n=>n.x+245));
    const height=Math.max(380,board.clientHeight/zoom,...map.nodes.map(n=>n.y+150));
    canvas.setAttribute('viewBox',[0,0,width,height].join(' '));canvas.setAttribute('width',width*zoom);canvas.setAttribute('height',height*zoom);
    canvas.replaceChildren();
    const marker=svg('marker',svg('defs',canvas),{id:'maps-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});
    svg('path',marker,{d:'M0 0 L10 5 L0 10 Z',fill:'#6583a2'});
    const byId=new Map(map.nodes.map(n=>[n.id,n])),counts=new Map();
    for(const e of map.edges){
      const a=byId.get(e.from),b=byId.get(e.to),dx=b.x-a.x,dy=b.y-a.y;
      const pair=[a.id,b.id].sort().join('|'),i=counts.get(pair)||0;counts.set(pair,i+1);
      const k=1/Math.max(Math.abs(dx)/80,Math.abs(dy)/30,.001);
      const x=a.x+80+dx*k,y=a.y+30+dy*k,tx=b.x+80-dx*k,ty=b.y+30-dy*k;
      let mx=(x+tx)/2,my=(y+ty)/2,d;
      if(!dx&&!dy){mx=a.x+80;my=a.y+90+i*18;d='M '+(a.x+25)+' '+(a.y+60)+' Q '+mx+' '+(my+32)+' '+(a.x+135)+' '+(a.y+60);}
      else{const bend=(12+i*48)/Math.hypot(dx,dy);mx-=dy*bend;my+=dx*bend;d='M '+x+' '+y+' Q '+mx+' '+my+' '+tx+' '+ty;mx=(mx+(x+tx)/2)/2;my=(my+(y+ty)/2)/2;}
      const label=study&&!revealed?'?':e.label;
      const g=svg('g',canvas,{'data-edge':e.id,tabindex:0,role:'button','aria-label':'Relationship '+label});
      svg('path',g,{d,stroke:'transparent','stroke-width':18,fill:'none'});svg('path',g,{d,stroke:selected===e.id?'#376dde':'#6583a2','stroke-width':2,fill:'none','marker-end':'url(#maps-arrow)'});
      svg('text',g,{x:mx,y:my-5,'text-anchor':'middle','font-family':'sans-serif','font-size':13,fill:'#55789a'}).textContent=label;
    }
    const shades={blue:['#e7f0ff','#5282c4'],purple:['#f1eafe','#9771bf'],green:['#e3f5ef','#428c73'],amber:['#fff3d9','#bc8b39']};
    for(const n of map.nodes){
      const label=study&&!revealed?'Recall concept':n.label;
      const g=svg('g',canvas,{'data-node':n.id,transform:'translate('+n.x+' '+n.y+')',tabindex:0,role:'button','aria-label':label,'aria-pressed':String(n.id===selected)});
      const [fill,stroke]=shades[n.color]||shades.blue;
      svg('rect',g,{width:160,height:60,rx:12,fill,stroke:n.id===selected?'#2758c4':stroke,'stroke-width':n.id===selected?3:1.5});
      const lines=label.match(/.{1,20}(?:\s|$)|.{1,20}/g)||['Concept'];
      const text=svg('text',g,{x:80,y:lines.length>1?25:35,'text-anchor':'middle','font-size':13,'font-family':'sans-serif','font-weight':600,fill:'#1a3050'});
      lines.slice(0,2).forEach((v,i)=>{svg('tspan',text,{x:80,dy:i?16:0}).textContent=v.trim()+(i===1&&lines.length>2?'…':'');});
    }
    q('output').textContent=Math.round(zoom*100)+'%';
  }
  function field(label,obj,prop,options){
    const wrap=element(fields,'label',label),input=element(wrap,options?'select':prop==='detail'?'textarea':'input',null);
    if(options)for(const [k,v] of options)element(input,'option',v,{value:k});
    else input.maxLength=({detail:4000,folder:100})[prop]||120;
    input.value=obj[prop]||'';input.onchange=()=>change(()=>{obj[prop]=input.value.trim();});
  }
  function details(){
    fields.replaceChildren();const n=map.nodes.find(v=>v.id===selected),e=map.edges.find(v=>v.id===selected);
    const button=(name,label)=>element(fields,'button',label,{'data-act':name});
    if(study){button('reveal',revealed?'Hide answers':'Reveal answers');return;}
    if(n){field('Concept',n,'label');field('Explanation',n,'detail');field('Color',n,'color',colors.map(c=>[c,c]));field('Linked note',n,'noteId',[['','None'],...api.notes().map(v=>[v.id,v.title||'Untitled note'])]);if(n.noteId)button('note','Open note');button('branch','Add branch');}
    else if(e)field('Relationship',e,'label');
    else{field('Folder',map,'folder');button('star',map.favorite?'★ Starred':'☆ Star map');button('trash',map.trashed?'Restore map':'Move to Trash');return;}
    button('remove','Remove');
  }
  function render(){
    q('.map-title').value=map.title;q('.map-title').disabled=study;
    q('[data-act=undo]').disabled=!undo.length||study;q('[data-act=redo]').disabled=!redo.length||study;
    for(const name of ['add','connect','layout'])q('[data-act='+name+']').disabled=study;
    q('[data-act=study]').textContent=study?'End study':'Study';
    q('.map-help').textContent=study?'Recall the hidden labels, then reveal the answers.':source?'Choose a destination concept.':'Drag concepts to move them. Select a concept or relationship to edit.';
    draw();details();
  }
  function choose(key){
    if(source){if(!map.nodes.some(n=>n.id===key))return;if(map.edges.length>=2000)throw Error('Relationship limit reached.');const e=link(source,key);source=null;selected=e.id;change(()=>map.edges.push(e));return;}
    selected=key;render();
  }
  function add(branch){
    if(map.nodes.length>=500||branch&&map.edges.length>=2000)throw Error('Map size limit reached.');
    const p=branch&&map.nodes.find(n=>n.id===selected);
    const n=concept('New concept',p?p.x+230:board.scrollLeft/zoom+50+map.nodes.length%4*35,p?p.y+90:board.scrollTop/zoom+50+map.nodes.length%5*65);
    change(()=>{map.nodes.push(n);if(p)map.edges.push(link(p.id,n.id,'includes'));selected=n.id;});fields.querySelector('input')?.select();
  }
  async function act(name){
    switch(name){
      case 'new': return create(newMap());
      case 'import': return q('[type=file]').click();
      case 'back': return back();
      case 'copy': {const copy=importMap(map);copy.title=copy.title.slice(0,142)+' (copy)';copy.trashed=false;return create(copy);}
      case 'add':return add(false);
      case 'branch':return add(true);
      case 'undo':return step(undo,redo);
      case 'redo':return step(redo,undo);
      case 'save':return saver.flush();
      case 'layout':return change(()=>arrange(map));
      case 'note':return api.openNote(map.nodes.find(n=>n.id===selected).noteId);
      case 'star':return change(()=>{map.favorite=!map.favorite;});
      case 'trash':change(()=>{map.trashed=!map.trashed;});return back();
      case 'remove':return change(()=>{map.nodes=map.nodes.filter(n=>n.id!==selected);map.edges=map.edges.filter(e=>![e.from,e.to,e.id].includes(selected));selected=null;source=null;});
      case 'connect':if(!map.nodes.some(n=>n.id===selected)){status('Select a starting concept, then choose Connect.');return;}source=source?null:selected;return render();
      case 'study':study=!study;revealed=false;source=null;return render();
      case 'reveal':revealed=!revealed;return render();
      case 'plus':case 'minus':zoom=Math.max(.35,Math.min(2,zoom+(name==='plus'?.15:-.15)));return draw();
      case 'json':case 'svg':{const vector=name==='svg';const url=URL.createObjectURL(new Blob([vector?new XMLSerializer().serializeToString(canvas):JSON.stringify(map,null,2)],{type:vector?'image/svg+xml':'application/json'}));const a=document.createElement('a');a.href=url;a.download=map.title+'.'+name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    }
  }
  root.onclick=async event=>{
    if(busy)return;const t=event.target.closest('[data-act],[data-open],[data-template],[data-node],[data-edge]');
    if(!t){if(event.target.closest('.map-board')){selected=null;source=null;render();}return;}
    try{busy=true;if(t.dataset.act)await act(t.dataset.act);
      else if(t.dataset.open){const r=records.find(r=>r.id===t.dataset.open);open(r.id,r,r.revision);}
      else if(t.dataset.template)await create(newMap(t.dataset.template));
      else choose(t.dataset.node||t.dataset.edge);
    }catch(error){status(error.message);}finally{busy=false;}
  };
  q('[type=search]').oninput=library;q('.map-library select').onchange=library;
  q('.map-title').onchange=e=>change(()=>{map.title=e.target.value.trim()||'Untitled map';});
  q('[type=file]').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||busy)return;try{busy=true;if(f.size>800000)throw Error('Map file is too large.');const v=importMap(JSON.parse(await f.text()));v.trashed=false;await create(v);}catch(error){status(error.message);}finally{busy=false;}};
  let skipClick=false;
  board.onpointerdown=e=>{const b=e.target.closest('[data-node]');if(!b||study||source||e.button!==0)return;
    const n=map.nodes.find(n=>n.id===b.dataset.node);drag={n,x:n.x,y:n.y,sx:e.clientX,sy:e.clientY,before:structuredClone(map),moved:false};};
  board.onpointermove=e=>{if(!drag)return;const dx=(e.clientX-drag.sx)/zoom,dy=(e.clientY-drag.sy)/zoom;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;
    if(!drag.moved)board.setPointerCapture(e.pointerId);
    drag.moved=true;drag.n.x=Math.max(0,Math.round(drag.x+dx));drag.n.y=Math.max(0,Math.round(drag.y+dy));draw();};
  board.onpointerleave=()=>{if(drag&&!drag.moved)drag=null;};
  board.onpointerup=()=>{if(drag?.moved){selected=drag.n.id;checkpoint(drag.before);skipClick=true;setTimeout(()=>{skipClick=false;},0);}drag=null;};
  board.onclick=e=>{if(skipClick)e.stopPropagation();};
  board.onpointercancel=()=>{if(drag){map=drag.before;drag=null;render();}};
  root.onkeydown=e=>{if(!id||e.target.closest('input,select,textarea'))return;
    const target=e.target.closest('[data-node],[data-edge]');
    if(target&&['Enter',' '].includes(e.key)){e.preventDefault();choose(target.dataset.node||target.dataset.edge);return;}
    if(study)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();act(e.shiftKey?'redo':'undo');return;}
    if(e.key==='Escape'){selected=null;source=null;render();return;}
    if(target?.dataset.node&&e.key.startsWith('Arrow')){e.preventDefault();const n=map.nodes.find(n=>n.id===target.dataset.node);change(()=>{n.x=Math.max(0,n.x+({ArrowLeft:-20,ArrowRight:20}[e.key]||0));n.y=Math.max(0,n.y+({ArrowUp:-20,ArrowDown:20}[e.key]||0));});[...canvas.querySelectorAll('[data-node]')].find(v=>v.dataset.node===n.id)?.focus();}};
  const stop=api.subscribe(items=>{if(dead)return;records=items;library();if(!id){status('');return;}
    const latest=items.find(r=>r.id===id);if(latest&&!saver.dirty()&&latest.revision>saver.revision())open(id,latest,latest.revision);
  },()=>status('Could not load maps. Check your connection.'));
  const leave=e=>{if(saver?.dirty()){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',leave);
  return {async fromNote(note){
    if(saver)await saver.flush();
    const value=newMap();value.title=(note.title||'Untitled note').slice(0,150);
    const center=concept(value.title,55,55);center.noteId=note.id;value.nodes.push(center);
    const body=document.createElement('template');body.innerHTML=api.cleanNote(note.contentHtml||'');
    for(const section of [...body.content.querySelectorAll('h1,h2,h3,h4,li')].slice(0,24)){
      const label=section.textContent.trim().slice(0,160);if(!label)continue;
      const child=concept(label,0,0);child.noteId=note.id;value.nodes.push(child);value.edges.push(link(center.id,child.id,'includes'));
    }
    arrange(value);await create(value);
  },dispose(){dead=true;stop();saver?.dispose();window.removeEventListener('beforeunload',leave);root.onclick=null;root.onkeydown=null;root.replaceChildren();}};
}
