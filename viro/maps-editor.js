import {newMap, concept, link, importMap, arrange, cardBox, branchTree, colors} from './maps-model.mjs';
import {createNoteSaver} from './notes-save.js';

export function mountMaps(root, api) {
  const document = root.ownerDocument;
  const q = selector => root.querySelector(selector);
  const icon = name => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
  const tool = (action, label, glyph) => `<button type="button" data-act="${action}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`;
  root.innerHTML = `
    <section class="map-library"><header class="ml-head"><div><h2>Concept Maps</h2><p>Build connections between your ideas.</p></div><div class="ml-actions"><button data-act="import">${icon('upload')}Import</button><button class="map-primary" data-act="new">${icon('add')}New map</button></div></header>
    <h3>Start a map</h3><div class="map-templates"></div>
    <div class="ml-list-head"><h3>Your maps</h3><div><input type="search" aria-label="Search maps and folders" placeholder="Search maps…"><select aria-label="Filter maps"><option>All maps</option><option>Favorites</option><option>Trash</option></select></div></div><div class="map-list"></div></section>
    <section class="map-editor" hidden><header class="md-head">${tool('back','Back to maps','arrow_back')}<input class="map-title" maxlength="150" aria-label="Map title">
    <div class="md-actions">${tool('undo','Undo','undo')}${tool('redo','Redo','redo')}<button data-act="study">${icon('school')}Study</button>${tool('properties','Properties','tune')}
    <details class="md-menu"><summary aria-label="Map actions" title="Map actions">${icon('more_horiz')}</summary><div><button data-act="copy">Save a copy</button><button data-act="json">Export JSON</button><button data-act="svg">Export SVG</button><button data-act="save">Save now</button></div></details></div></header>
    <div class="md-stage"><div class="map-board" tabindex="0" aria-label="Map canvas"><svg aria-label="Concept map"></svg></div>
    <div class="md-rail" role="toolbar" aria-label="Canvas tools">${tool('select','Select','near_me')}${tool('hand','Pan canvas','pan_tool')}${tool('add','Add concept','add_box')}${tool('connect','Connect concepts','polyline')}${tool('layout','Arrange map','account_tree')}</div>
    <div class="md-empty" hidden><b>Add your first concept</b><span>Double-click the canvas or use the + tool.</span></div>
    <aside class="md-inspector" hidden><header><strong>Properties</strong>${tool('properties','Close properties','close')}</header><div class="map-fields"></div></aside>
    <div class="md-zoom">${tool('minus','Zoom out','remove')}<output>100%</output>${tool('plus','Zoom in','add')}${tool('fit','Fit map','fit_screen')}</div>
    <div class="md-recall" hidden><select aria-label="Study prompt"><option value="concept">Concept</option><option value="relationship">Relationship</option><option value="branch">Branch</option></select><button data-act="reveal" class="md-reveal">Reveal</button><button data-act="next">Next</button></div>
    <div class="md-context" hidden><button data-act="branch">+ Branch</button><select aria-label="Concept color">${colors.map(c=>`<option value="${c}">${c}</option>`).join('')}</select><button data-act="properties">More</button></div><input class="md-inline" aria-label="Edit canvas label" hidden></div>
    <footer><span class="map-help"></span><span class="map-count"></span></footer></section>
    <p class="map-status" role="status"></p><input type="file" hidden accept=".json,application/json">`;
  const board=q('.map-board'), canvas=board.querySelector('svg'), fields=q('.map-fields'), inline=q('.md-inline');
  let pickingSource=false;
  let camera={x:0,y:0}, hand=false, inspecting=false, editing=null, lastTap=null;
  let records=[],map,id,saver,selected,source,drag,study=false,dead=false,busy=false,zoom=1;
  let undo=[],redo=[];
  let promptKey=null;
  const masked=new Set();
  function startPrompt(preferred){
    const tree=branchTree(map), mode=q('.md-recall select').value;
    const visibleNodes=map.nodes.filter(n=>!tree.hidden.has(n.id));
    const pool=mode==='relationship'?map.edges.filter(e=>!tree.hidden.has(e.from)&&!tree.hidden.has(e.to)):
      mode==='branch'?visibleNodes.filter(n=>tree.branches.has(n.id)&&!n.folded):visibleNodes;
    const index=pool.findIndex(o=>o.id===promptKey);
    promptKey=(pool.find(o=>o.id===preferred)||pool[(index+1)%pool.length])?.id;
    masked.clear();
    if(!promptKey)return;
    if(mode!=='branch'){masked.add(promptKey);return;}
    const descendants=new Set([promptKey]);
    for(const [id,parent] of tree.parents)if(descendants.has(parent)&&!tree.hidden.has(id)){descendants.add(id);masked.add(id);}
    for(const e of map.edges)if(descendants.has(e.from)&&descendants.has(e.to))masked.add(e.id);
  }
  q('.md-recall select').onchange=()=>{promptKey=null;startPrompt(selected);render();};
  q('.md-context select').onchange=e=>{const node=map.nodes.find(n=>n.id===selected);if(node)change(()=>{node.color=e.target.value;});};

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
  function preview(parent, model) {
    const art=svg('svg',parent,{'aria-hidden':'true',class:'map-preview',preserveAspectRatio:'xMidYMid meet'});
    const nodes=model.nodes;
    if(!nodes.length){art.setAttribute('viewBox','0 0 200 80');svg('rect',art,{x:70,y:26,width:60,height:28,rx:6,fill:'none',stroke:'#869dbe','stroke-dasharray':'4 3'});return;}
    const left=Math.min(...nodes.map(n=>n.x)), top=Math.min(...nodes.map(n=>n.y));
    const width=Math.max(...nodes.map(n=>n.x+cardBox(n).width))-left,height=Math.max(...nodes.map(n=>n.y+cardBox(n).height))-top;
    art.setAttribute('viewBox',[left-35,top-35,width+70,height+70].join(' '));
    const keys=new Map(nodes.map(n=>[n.id,n]));
    for(const e of model.edges){const a=keys.get(e.from),b=keys.get(e.to);if(a&&b)svg('line',art,{x1:a.x+cardBox(a).width/2,y1:a.y+cardBox(a).height/2,x2:b.x+cardBox(b).width/2,y2:b.y+cardBox(b).height/2,stroke:'#8497ad','stroke-width':6});}
    for(const n of nodes)svg('rect',art,{x:n.x,y:n.y,width:cardBox(n).width,height:cardBox(n).height,rx:13,fill:({green:'#a4ddc7',blue:'#9dbdf6',amber:'#efc681',purple:'#c5a7e8'})[n.color]||'#9dbdf6',stroke:'#536987','stroke-width':2});
  }
  for(const [name,caption] of [['Blank map','Freeform canvas'],['Mind map','Ideas and branches'],['Feedback loop','Circular relationships']]){
    const b=element(q('.map-templates'),'button',null,name==='Blank map'?{'data-act':'new'}:{'data-template':name});
    preview(b,newMap(name==='Blank map'?'':name));const h=element(b,'div',null);element(h,'b',name);element(h,'small',caption);
  }
  function library() {
    const list=q('.map-list');list.replaceChildren();
    const filter=q('.map-library select').value,term=q('[type=search]').value.toLowerCase();
    const visible=records.filter(r=>!!r.trashed===(filter==='Trash')&&(filter!=='Favorites'||r.favorite)&&[r.title,r.folder].join(' ').toLowerCase().includes(term));
    visible.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
    for(const r of visible){
      const b=element(list,'button',null,{'data-open':r.id});preview(b,r);element(b,'b',(r.favorite?'★ ':'')+r.title);
      element(b,'small',[r.folder,r.nodes.length+' concepts',r.edges.length+' relationships'].filter(Boolean).join(' · '));
    }
    if(!visible.length)element(list,'p',term?'No matching maps.':filter==='Trash'?'Trash is empty.':filter==='Favorites'?'Star a map to see it here.':'Create a map or choose a template to begin.');
  }
  function open(key,value,revision) {
    if(dead)return;
    const data=importMap(value,false);
    saver?.dispose();id=key;map=data;selected=null;source=null;drag=null;pickingSource=false;lastTap=null;undo=[];redo=[];study=false;zoom=1;
    saver=createNoteSaver({write:(v,r)=>api.write(key,v,r),status,stash:v=>localStorage.setItem(draftKey(key),JSON.stringify(v)),clear:()=>localStorage.removeItem(draftKey(key))});
    saver.setRevision(revision);status('All changes saved');
    try {
      const stored=localStorage.getItem(draftKey(key));
      if(stored){const draft=JSON.parse(stored);map=importMap(draft,false);saver.setRevision(draft.revision);saver.edit(structuredClone(map));status('Recovered your local draft.');}
    } catch {status('Local draft recovery is unavailable.');}
    q('.map-library').hidden=true;q('.map-editor').hidden=false;editing=null;inline.hidden=true;hand=false;inspecting=false;fit();render();
  }
  async function create(value){const key=await api.create(value);open(key,value,0);}
  async function back(){await saver.flush();if(dead)return;saver.dispose();saver=null;id=null;map=null;q('.map-editor').hidden=true;q('.map-library').hidden=false;library();status('');}
  function checkpoint(before){undo.push(before);if(undo.length>60)undo.shift();redo=[];saver.edit(structuredClone(map));render();}
  function change(edit){const before=structuredClone(map);edit();checkpoint(before);}
  function step(a,b){if(!a.length)return;b.push(map);map=a.pop();selected=null;source=null;saver.edit(structuredClone(map));render();}
  function viewport(){return {w:board.clientWidth||800,h:board.clientHeight||480};}
  function world(x,y){const box=board.getBoundingClientRect();return {x:camera.x+(x-box.left)/zoom,y:camera.y+(y-box.top)/zoom};}
  function bounds(){
    const {hidden}=branchTree(map);
    const pts=map.nodes.filter(n=>!hidden.has(n.id)).flatMap(n=>{const b=cardBox(n);return [{x:n.x,y:n.y},{x:n.x+b.width,y:n.y+b.height}];});
    for(const e of map.edges){
      if(hidden.has(e.from)||hidden.has(e.to))continue;
      if(e.bend)pts.push(e.bend);
      else if(e.from===e.to){const n=map.nodes.find(n=>n.id===e.from);pts.push({x:n.x,y:n.y+cardBox(n).height+80});}
    }
    if(!pts.length)return {x:0,y:0,w:460,h:260};
    const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));
    return {x,y,w:Math.max(...pts.map(p=>p.x))-x,h:Math.max(...pts.map(p=>p.y))-y};
  }
  function fit(){
    const v=viewport(),b=bounds(),pad=v.w<500?45:76;
    zoom=Math.min(1.25,Math.max(.04,Math.min((v.w-pad*2)/b.w,(v.h-92)/b.h)));
    camera={x:b.x+b.w/2-v.w/(2*zoom),y:b.y+b.h/2-v.h/(2*zoom)};
  }
  function scaleAt(next,x,y){
    const before=world(x,y),rect=board.getBoundingClientRect();
    zoom=Math.max(.04,Math.min(3,next));camera={x:before.x-(x-rect.left)/zoom,y:before.y-(y-rect.top)/zoom};draw();
  }
  function draw() {
    const {w,h}=viewport();
    canvas.setAttribute('viewBox',[camera.x,camera.y,w/zoom,h/zoom].join(' '));
    canvas.replaceChildren();
    const marker=svg('marker',svg('defs',canvas),{id:'maps-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});
    svg('path',marker,{d:'M0 0 L10 5 L0 10 Z',fill:'#6583a2'});
    const byId=new Map(map.nodes.map(n=>[n.id,n])),counts=new Map();
    const tree=branchTree(map);
    for(const e of map.edges){
      if(tree.hidden.has(e.from)||tree.hidden.has(e.to))continue;
      const a=byId.get(e.from),b=byId.get(e.to),ab=cardBox(a),bb=cardBox(b);
      const ax=a.x+ab.width/2,ay=a.y+ab.height/2,bx=b.x+bb.width/2,by=b.y+bb.height/2,dx=bx-ax,dy=by-ay;
      const pair=[a.id,b.id].sort().join('|'),i=counts.get(pair)||0;counts.set(pair,i+1);
      function port(cx,cy,box,toX,toY){
        const vx=toX-cx,vy=toY-cy,k=1/Math.max(Math.abs(vx)/(box.width/2),Math.abs(vy)/(box.height/2),.001);
        return [cx+vx*k,cy+vy*k];
      }
      const [x,y]=port(ax,ay,ab,bx,by),[tx,ty]=port(bx,by,bb,ax,ay);
      let mx=(x+tx)/2,my=(y+ty)/2,d;
      if(!dx&&!dy){mx=ax;my=a.y+ab.height+30+i*18;d='M '+(a.x+25)+' '+(a.y+ab.height)+' Q '+mx+' '+(my+32)+' '+(a.x+ab.width-25)+' '+(a.y+ab.height);}
      else{const bend=(12+i*48)/Math.hypot(dx,dy);mx-=dy*bend;my+=dx*bend;d='M '+x+' '+y+' Q '+mx+' '+my+' '+tx+' '+ty;mx=(mx+(x+tx)/2)/2;my=(my+(y+ty)/2)/2;}
      if(e.bend){
        mx=e.bend.x;my=e.bend.y;
        if(a.id!==b.id)d='M '+port(ax,ay,ab,mx,my).join(' ')+' L '+mx+' '+my+' L '+port(bx,by,bb,mx,my).join(' ');
        else d='M '+(a.x+20)+' '+(a.y+ab.height)+' L '+mx+' '+my+' L '+(a.x+ab.width-20)+' '+(a.y+ab.height);
      }
      const label=study&&masked.has(e.id)?'?':e.label;
      const g=svg('g',canvas,{'data-edge':e.id,tabindex:0,role:'button','aria-label':'Relationship '+label});
      svg('path',g,{d,stroke:'transparent','stroke-width':18,fill:'none'});svg('path',g,{d,stroke:selected===e.id?'#376dde':'#6583a2','stroke-width':2,fill:'none','marker-end':'url(#maps-arrow)'});
      svg('text',g,{x:mx,y:my-5,'text-anchor':'middle','font-family':'sans-serif','font-size':13,fill:'#55789a'}).textContent=label;
      if(e.id===selected&&!study)svg('circle',g,{cx:mx,cy:my,r:6,fill:'#fff',stroke:'#356bdb','stroke-width':2,'data-bend':e.id});
    }
    const shades={blue:['#e7f0ff','#5282c4'],purple:['#f1eafe','#9771bf'],green:['#e3f5ef','#428c73'],amber:['#fff3d9','#bc8b39']};
    for(const n of map.nodes){
      if(tree.hidden.has(n.id))continue;
      const hiddenAnswer=study&&masked.has(n.id);
      const label=hiddenAnswer?'Recall concept':n.label;
      const {width,height,lines}=cardBox(n);
      const g=svg('g',canvas,{'data-node':n.id,transform:'translate('+n.x+' '+n.y+')',tabindex:0,role:'button','aria-label':label,'aria-pressed':String(n.id===selected)});
      const [fill,stroke]=shades[n.color]||shades.blue;
      svg('rect',g,{width,height,rx:12,fill,stroke:n.id===selected?'#2758c4':stroke,'stroke-width':n.id===selected?3:1.5});
      const shown=hiddenAnswer?[label]:lines;
      const text=svg('text',g,{x:width/2,y:height/2+5-(shown.length-1)*8.5,'text-anchor':'middle','font-size':13,'font-family':'sans-serif','font-weight':600,fill:'#1a3050'});
      shown.forEach((line,i)=>{const span=svg('tspan',text,{x:width/2,dy:i?17:0});span.textContent=line;
        if(span.getComputedTextLength?.()>width-20){span.setAttribute('textLength',width-20);span.setAttribute('lengthAdjust','spacingAndGlyphs');}});
      if(n.folded&&tree.branches.has(n.id)&&!study){
        let count=0;const subtree=new Set([n.id]);for(const [id,parent] of tree.parents)if(subtree.has(parent)){subtree.add(id);count++;}
        const badge=svg('g',g,{'data-expand':n.id,role:'button',tabindex:0,'aria-label':'Expand '+count+' hidden concepts'});
        svg('rect',badge,{x:width-34,y:height-9,width:34,height:21,rx:8,fill:'#315ca8'});
        svg('text',badge,{x:width-17,y:height+6,'text-anchor':'middle',fill:'white','font-size':12}).textContent='+'+count;
      }
      if(n.id===selected&&!study){
        svg('rect',g,{'data-resize':n.id,x:width-6,y:height-14,width:12,height:12,rx:2,fill:'#477cea',cursor:'ew-resize'});
        for(const [cx,cy] of [[0,height/2],[width,height/2],[width/2,0],[width/2,height]]){
          const port=svg('g',g,{'data-port':n.id});
          svg('circle',port,{cx,cy,r:11,fill:'transparent'});
          svg('circle',port,{cx,cy,r:5,fill:'#fff',stroke:'#356bdb','stroke-width':2});
        }
      }
    }
    if(drag?.kind==='link'){
      const {start,end}=drag;
      svg('path',canvas,{d:'M '+start.x+' '+start.y+' L '+end.x+' '+end.y,stroke:'#477cea','stroke-width':2,'stroke-dasharray':'6 4','pointer-events':'none'});
      const target=map.nodes.find(n=>n.id===drag.target);
      if(target)svg('rect',canvas,{x:target.x-3,y:target.y-3,width:cardBox(target).width+6,height:cardBox(target).height+6,rx:14,fill:'none',stroke:'#447cef','stroke-width':3,'pointer-events':'none'});
    }
    const node=map.nodes.find(n=>n.id===selected),toolbar=q('.md-context');
    toolbar.hidden=!node||study||!!editing||!!drag;
    if(!toolbar.hidden){
      const b=cardBox(node);toolbar.querySelector('select').value=node.color;
      toolbar.style.left=Math.max(4,Math.min(w- toolbar.offsetWidth-4,(node.x+b.width/2-camera.x)*zoom-toolbar.offsetWidth/2))+'px';
      toolbar.style.top=Math.max(4,Math.min(h-42,(node.y-camera.y)*zoom-42))+'px';
    }
    positionEditor();
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
    if(study)return;
    if(n){element(fields,'strong','Concept');field('Label',n,'label');field('Explanation',n,'detail');field('Color',n,'color',colors.map(c=>[c,c]));field('Linked note',n,'noteId',[['','None'],...api.notes().map(v=>[v.id,v.title||'Untitled note'])]);if(n.noteId)button('note','Open note');button('branch','Add branch');if(branchTree(map).branches.has(n.id))button('fold',n.folded?'Expand branch':'Fold branch');}
    else if(e){field('Relationship',e,'label');if(e.bend)button('straighten','Reset line routing');}
    else{field('Folder',map,'folder');button('star',map.favorite?'★ Starred':'☆ Star map');button('trash',map.trashed?'Restore map':'Move to Trash');return;}
    button('remove','Remove');
  }
  function render(){
    q('.map-title').value=map.title;q('.map-title').disabled=study;
    q('[data-act=undo]').disabled=!undo.length||study;q('[data-act=redo]').disabled=!redo.length||study;
    for(const name of ['add','connect','layout'])q('[data-act='+name+']').disabled=study;
    q('[data-act=study]').innerHTML=icon('school')+(study?'Finish study':'Study');
    q('.md-recall').hidden=!study;q('.md-reveal').disabled=!masked.size;q('.md-reveal').textContent='Reveal';
    q('.md-empty').hidden=!!map.nodes.length||study;q('.md-inspector').hidden=!inspecting||study;
    q('[data-act=select]').setAttribute('aria-pressed',String(!hand&&!source&&!pickingSource));q('[data-act=hand]').setAttribute('aria-pressed',String(hand));
    q('[data-act=connect]').setAttribute('aria-pressed',String(!!source||pickingSource));board.classList.toggle('hand',hand);
    const hidden=branchTree(map).hidden;const visibleLinks=map.edges.filter(e=>!hidden.has(e.from)&&!hidden.has(e.to)).length;
    q('.map-count').textContent=(map.nodes.length-hidden.size)+' concepts · '+visibleLinks+' links'+(hidden.size?' · '+hidden.size+' hidden':'');
    q('.map-help').textContent=study?(promptKey?'Click a hidden label to reveal it.':'No visible items for this prompt.'):pickingSource?'Select the starting concept.':source?'Select a destination concept.':selected?'Double-click to rename · Drag a handle to connect':'Double-click to add a concept · Drag the background to pan';
    draw();details();
  }
  function choose(key){
    if(study){masked.delete(key);render();return;}
    if(pickingSource){if(map.nodes.some(n=>n.id===key)){source=key;selected=key;pickingSource=false;render();}return;}
    if(source){if(!map.nodes.some(n=>n.id===key))return;if(map.edges.length>=2000)throw Error('Relationship limit reached.');const e=link(source,key);source=null;selected=e.id;change(()=>map.edges.push(e));editLabel(e);return;}
    selected=key;render();
  }
  function positionEditor(){
    if(!editing)return;
    const obj=editing.obj;
    const g=[...canvas.querySelectorAll('[data-edge]')].find(el=>el.dataset.edge===obj.id);
    const anchor=g?.querySelector('text');
    const x=anchor?Number(anchor.getAttribute('x')):obj.x+cardBox(obj).width/2,y=anchor?Number(anchor.getAttribute('y')):obj.y+cardBox(obj).height/2;
    const v=viewport(),width=Math.min(220,v.w-24);
    inline.style.width=width+'px';
    inline.style.left=Math.max(12,Math.min(v.w-width-12,(x-camera.x)*zoom-width/2))+'px';
    inline.style.top=Math.max(8,Math.min(v.h-40,(y-camera.y)*zoom-17))+'px';
  }
  function editLabel(obj){
    if(!obj||study)return;
    editing={obj};inline.value=obj.label;inline.maxLength='from' in obj?120:160;
    inline.hidden=false;positionEditor();inline.focus();inline.select();
  }
  function finishLabel(commit=true){
    if(!editing)return;
    const obj=editing.obj,value=inline.value.trim()||('from' in obj?'relates to':'Concept');
    editing=null;inline.hidden=true;
    if(commit&&value!==obj.label)change(()=>{obj.label=value;});
  }
  inline.onblur=()=>finishLabel();
  inline.onkeydown=e=>{
    if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();finishLabel(e.key==='Enter');board.focus();}
  };
  function add(branch,point=null,sibling=false){
    if(map.nodes.length>=500||branch&&map.edges.length>=2000)throw Error('Map size limit reached.');
    const current=map.nodes.find(n=>n.id===selected);
    let parent=branch?current:null;
    if(sibling){const parentId=branchTree(map).parents.get(selected);parent=map.nodes.find(n=>n.id===parentId);}
    const v=viewport();
    const x=Math.max(0,point?.x??(sibling&&current?current.x:parent?parent.x+cardBox(parent).width+85:camera.x+v.w/zoom/2-80));
    let y=Math.max(0,point?.y??(sibling&&current?current.y+105:parent?parent.y:camera.y+v.h/zoom/2-30));
    while(map.nodes.some(n=>x<n.x+cardBox(n).width+15&&x+175>n.x&&y<n.y+cardBox(n).height+16&&y+76>n.y))y+=95;
    const n=concept('New concept',x,y);if(parent)n.color=parent.color;
    if((x-camera.x)*zoom<30||(x+160-camera.x)*zoom>v.w-20||(y-camera.y)*zoom<15||(y+60-camera.y)*zoom>v.h-25)
      camera={x:x+80-v.w/(2*zoom),y:y+30-v.h/(2*zoom)};
    change(()=>{map.nodes.push(n);if(parent){delete parent.folded;map.edges.push(link(parent.id,n.id,'includes'));}selected=n.id;});
    editLabel(n);
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
      case 'layout':return change(()=>{arrange(map);fit();});
      case 'fit':fit();return draw();
      case 'properties':inspecting=!inspecting;return render();
      case 'hand':case 'select':hand=name==='hand';source=null;pickingSource=false;return render();
      case 'fold':{const n=map.nodes.find(o=>o.id===selected);return change(()=>{n.folded=!n.folded;});}
      case 'straighten':return change(()=>{delete map.edges.find(e=>e.id===selected).bend;});
      case 'note':return api.openNote(map.nodes.find(n=>n.id===selected).noteId);
      case 'star':return change(()=>{map.favorite=!map.favorite;});
      case 'trash':change(()=>{map.trashed=!map.trashed;});return back();
      case 'remove':return change(()=>{map.nodes=map.nodes.filter(n=>n.id!==selected);map.edges=map.edges.filter(e=>![e.from,e.to,e.id].includes(selected));selected=null;source=null;});
      case 'connect':hand=false;if(source||pickingSource){source=null;pickingSource=false;}else if(map.nodes.some(n=>n.id===selected))source=selected;else pickingSource=true;return render();
      case 'study':study=!study;source=null;pickingSource=false;promptKey=null;masked.clear();
        if(study){q('.md-recall select').value=map.edges.some(e=>e.id===selected)?'relationship':'concept';startPrompt(selected);}return render();
      case 'reveal':masked.clear();return render();
      case 'next':startPrompt();return render();
      case 'plus':case 'minus':{const b=board.getBoundingClientRect();return scaleAt(zoom*(name==='plus'?1.2:1/1.2),b.left+b.width/2,b.top+b.height/2);}
      case 'json':case 'svg':{const vector=name==='svg';const exported=canvas.cloneNode(true);const b=bounds();exported.querySelectorAll('[data-port],[data-bend],[data-resize]').forEach(n=>n.remove());exported.setAttribute('viewBox',[b.x-30,b.y-30,b.w+60,b.h+60].join(' '));exported.setAttribute('width',b.w+60);exported.setAttribute('height',b.h+60);const url=URL.createObjectURL(new Blob([vector?new XMLSerializer().serializeToString(exported):JSON.stringify(map,null,2)],{type:vector?'image/svg+xml':'application/json'}));const a=document.createElement('a');a.href=url;a.download=map.title+'.'+name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    }
  }
  root.onclick=async event=>{
    if(busy||event.target===inline)return;
    const expand=event.target.closest('[data-expand]');if(expand){selected=expand.dataset.expand;await act('fold');return;}const t=event.target.closest('[data-act],[data-open],[data-template],[data-node],[data-edge]');
    if(!t){if(event.target.closest('.map-board')){if(event.detail===2&&!study&&!hand){const p=world(event.clientX,event.clientY);add(false,{x:p.x-80,y:p.y-30});}else{selected=null;source=null;render();}}return;}
    try{busy=true;if(t.dataset.act){lastTap=null;finishLabel();q('.md-menu').open=false;await act(t.dataset.act);}
      else if(t.dataset.open){const r=records.find(r=>r.id===t.dataset.open);open(r.id,r,r.revision);}
      else if(t.dataset.template)await create(newMap(t.dataset.template));
      else {
        const key=t.dataset.node||t.dataset.edge, now=Date.now();
        if(!source&&!study&&selected===key&&lastTap?.key===key&&now-lastTap.time<420){lastTap=null;editLabel([...map.nodes,...map.edges].find(v=>v.id===key));}
        else{choose(key);lastTap=editing?null:{key,time:now};if(!editing)board.focus({preventScroll:true});}
      }
    }catch(error){status(error.message);}finally{busy=false;}
  };
  q('[type=search]').oninput=library;q('.map-library select').onchange=library;
  q('.map-title').onchange=e=>change(()=>{map.title=e.target.value.trim()||'Untitled map';});
  q('[type=file]').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||busy)return;try{busy=true;if(f.size>800000)throw Error('Map file is too large.');const v=importMap(JSON.parse(await f.text()));v.trashed=false;await create(v);}catch(error){status(error.message);}finally{busy=false;}};
  let skipClick=false;
  function cancelDrag(){
    if(drag?.before&&drag.moved)map=drag.before;
    drag=null;if(map)render();
  }
  board.onpointerdown=e=>{
    if(e.button!==0&&e.button!==1||drag)return;
    const n=e.target.closest('[data-node]'),port=e.target.closest('[data-port]'),bend=e.target.closest('[data-bend]');
    const p=world(e.clientX,e.clientY);
    let kind='pan';
    if(!hand&&!study&&e.button===0){
      if(e.target.closest('[data-expand]'))return;
      if(e.target.closest('[data-resize]'))kind='resize';else if(port)kind='link';else if(bend)kind='bend';else if(n&&!source&&!pickingSource)kind='node';else if(n||e.target.closest('[data-edge]'))return;
    }
    const obj=kind==='bend'?map.edges.find(v=>v.id===bend.dataset.bend):map.nodes.find(v=>v.id===n?.dataset.node);
    drag={kind,obj,width:obj?.width||160,pointer:e.pointerId,sx:e.clientX,sy:e.clientY,x:obj?.x,y:obj?.y,start:p,end:p,origin:{...camera},moved:false};
  };
  board.onpointermove=e=>{
    if(!drag||e.pointerId!==drag.pointer&&drag.pointer!==undefined)return;
    const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
    if(!drag.moved&&Math.hypot(dx,dy)<4)return;
    if(!drag.moved){
      board.setPointerCapture(e.pointerId);
      if(drag.kind==='link')drag.hidden=branchTree(map).hidden;
      if(['node','bend','resize'].includes(drag.kind))drag.before=structuredClone(map);
    }
    drag.moved=true;const p=world(e.clientX,e.clientY);
    switch(drag.kind){
      case 'pan':camera={x:drag.origin.x-dx/zoom,y:drag.origin.y-dy/zoom};break;
      case 'link':drag.end=p;drag.target=map.nodes.findLast(n=>!drag.hidden.has(n.id)&&p.x>=n.x&&p.x<=n.x+cardBox(n).width&&p.y>=n.y&&p.y<=n.y+cardBox(n).height)?.id;break;
      case 'node':drag.obj.x=Math.max(0,Math.round(drag.x+dx/zoom));drag.obj.y=Math.max(0,Math.round(drag.y+dy/zoom));break;
      case 'resize':drag.obj.width=Math.max(120,Math.min(440,Math.round(drag.width+dx/zoom)));break;
      case 'bend':drag.obj.bend={x:Math.round(p.x),y:Math.round(p.y)};break;
    }
    draw();
  };
  board.onpointerup=e=>{
    if(!drag||e&&drag.pointer!==undefined&&e.pointerId!==drag.pointer)return;
    const g=drag;drag=null;if(!g.moved)return;
    skipClick=true;setTimeout(()=>{skipClick=false;},0);lastTap=null;
    if(g.kind==='link'&&g.target&&map.edges.length<2000){
      const edge=link(g.obj.id,g.target);selected=edge.id;change(()=>map.edges.push(edge));editLabel(edge);
    }else if(g.before){selected=g.obj.id;checkpoint(g.before);}else draw();
  };
  board.onclick=e=>{if(skipClick)e.stopPropagation();};
  board.onpointercancel=cancelDrag;
  board.onwheel=e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)scaleAt(zoom*Math.exp(-e.deltaY*.008),e.clientX,e.clientY);
    else{camera.x+=e.deltaX/zoom;camera.y+=e.deltaY/zoom;draw();}};
  board.ondblclick=e=>{
    if(study||hand||editing)return;
    const t=e.target.closest('[data-node],[data-edge]');
    if(t)editLabel([...map.nodes,...map.edges].find(v=>v.id===(t.dataset.node||t.dataset.edge)));
  };
  root.onkeydown=e=>{if(!id||e.target.closest('input,select,textarea'))return;
    const target=e.target.closest('[data-node],[data-edge]');
    const expand=e.target.closest('[data-expand]');
    if(expand&&['Enter',' '].includes(e.key)){e.preventDefault();selected=expand.dataset.expand;act('fold');return;}
    if(!study&&selected&&board.contains(e.target)&&['Delete','Backspace'].includes(e.key)){e.preventDefault();act('remove');board.focus();return;}
    const key=target?.dataset.node||selected;
    if(!study&&key&&board.contains(e.target)&&map.nodes.some(n=>n.id===key)&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&['Tab','Enter'].includes(e.key)){
      e.preventDefault();selected=key;add(true,null,e.key==='Enter');return;
    }
    if(!study&&key&&e.key==='F2'){e.preventDefault();editLabel([...map.nodes,...map.edges].find(o=>o.id===key));return;}
    if(target&&['Enter',' '].includes(e.key)){e.preventDefault();choose(target.dataset.node||target.dataset.edge);return;}
    if(study)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();act(e.shiftKey?'redo':'undo');return;}
    if(e.key==='Escape'){cancelDrag();selected=null;source=null;pickingSource=false;render();return;}
    if(target?.dataset.node&&e.key.startsWith('Arrow')){e.preventDefault();const n=map.nodes.find(n=>n.id===target.dataset.node);change(()=>{n.x=Math.max(0,n.x+({ArrowLeft:-20,ArrowRight:20}[e.key]||0));n.y=Math.max(0,n.y+({ArrowUp:-20,ArrowDown:20}[e.key]||0));});[...canvas.querySelectorAll('[data-node]')].find(v=>v.dataset.node===n.id)?.focus();}};
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{if(map&&!dead)draw();});resize?.observe(board);
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
  },dispose(){dead=true;resize?.disconnect();stop();saver?.dispose();window.removeEventListener('beforeunload',leave);root.onclick=null;root.onkeydown=null;root.replaceChildren();}};
}
