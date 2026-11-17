export const colors = ['blue', 'green', 'amber', 'purple'];
const id = () => crypto.randomUUID();
export function concept(label, x, y) {
  return {id:id(), label, x, y, color:'blue', detail:'', noteId:''};
}
export function link(from, to, label = 'relates to') {
  return {id:id(), from, to, label};
}
export function newMap(template = '') {
  const map = {title:'Untitled map', folder:'', favorite:false, trashed:false, nodes:[], edges:[]};
  if (!template) return map;
  const labels = template === 'Feedback loop' ? ['Stimulus','Response','Feedback'] : ['Main idea','Branch A','Branch B'];
  map.title = template;
  map.nodes = labels.map((label, i) => concept(label, [280,80,480][i], [80,270,270][i]));
  map.nodes[1].color = 'green';map.nodes[2].color = template === 'Feedback loop' ? 'amber' : 'purple';
  const [a,b,c] = map.nodes;
  map.edges = template === 'Feedback loop' ? [link(a.id,b.id,'triggers'),link(b.id,c.id,'produces'),link(c.id,a.id,'regulates')] : [link(a.id,b.id,'includes'),link(a.id,c.id,'includes')];
  return map;
}
export function importMap(raw, fresh = true) {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || raw.nodes.length > 500 || raw.edges.length > 2000) throw Error('Choose a map with up to 500 concepts and 2,000 relationships.');
  const ids = new Map(), edges = new Set();
  const str = (v, max) => typeof v === 'string' ? v.slice(0,max) : '';
  const nodes = raw.nodes.map(n => {
    if (!n || typeof n.id !== 'string' || !n.id || ids.has(n.id) || ![n.x,n.y].every(Number.isFinite)) throw Error('Invalid concept in map.');
    const key = fresh ? id() : n.id;
    ids.set(n.id,key);
    return {id:key, ...(Number.isFinite(n.width)?{width:Math.max(120,Math.min(440,n.width))}:{}), ...(n.folded?{folded:true}:{}), label:str(n.label,160) || 'Concept', detail:str(n.detail,4000), noteId:str(n.noteId,150), color:colors.includes(n.color) ? n.color : 'blue', x:Math.max(0,Math.min(100000,n.x)),y:Math.max(0,Math.min(100000,n.y))};
  });
  return {title:str(raw.title,150)||'Untitled map', folder:str(raw.folder,100), favorite:!!raw.favorite,trashed:!!raw.trashed,nodes,edges:raw.edges.map(e => {
    if (!e || !ids.has(e.from) || !ids.has(e.to) || !e.id || edges.has(e.id)) throw Error('Invalid relationship in map.');
    edges.add(e.id);
    return {id:fresh?id():e.id,from:ids.get(e.from),to:ids.get(e.to),label:str(e.label,120), ...(e.bend&&[e.bend.x,e.bend.y].every(Number.isFinite)?{bend:{x:e.bend.x,y:e.bend.y}}:{})};
  })};
}
export function cardBox(node){
  const width=node.width||160;
  const limit=Math.max(8,Math.floor((width-24)/8));
  const lines=[];
  let line='';
  for(let word of (node.label||'Concept').split(/\s+/u)){
    if(line && [...line+' '+word].length>limit){lines.push(line);line='';}
    let letters=[...word];
    while(letters.length>limit){lines.push(letters.splice(0,limit).join(''));}
    line=(line?line+' ':'')+letters.join('');
  }
  if(line)lines.push(line);
  return {width,height:Math.max(60,lines.length*17+24),lines};
}
export function arrange(map) {
  const levels = new Map(), children = new Map(map.nodes.map(n => [n.id,[]]));
  const targets = new Set();
  for (const edge of map.edges) {children.get(edge.from).push(edge.to); targets.add(edge.to);}
  const counts = [];
  for (const root of [...map.nodes.filter(n => !targets.has(n.id)), ...map.nodes]) {
    if (levels.has(root.id)) continue;
    const queue = [root.id]; levels.set(root.id,0);
    for (let i=0;i<queue.length;i++) {
      const key = queue[i], depth = levels.get(key);
      for (const child of children.get(key)) if (!levels.has(child)) {levels.set(child,depth+1); queue.push(child);}
    }
  }
  const columns=[];
  for(const n of map.nodes){const d=levels.get(n.id);columns[d]=Math.max(columns[d]||0,cardBox(n).width);}
  const starts=[55];for(let i=0;i<columns.length;i++)starts[i+1]=starts[i]+columns[i]+110;
  for(const node of map.nodes){const depth=levels.get(node.id);node.x=starts[depth];node.y=counts[depth]||55;counts[depth]=node.y+cardBox(node).height+70;}
}

// Assign each concept one branch parent so folding terminates even in a cycle.
export function branchTree(map) {
  const children=new Map(map.nodes.map(n=>[n.id,[]])),targets=new Set(),parents=new Map();
  for(const e of map.edges){children.get(e.from)?.push(e.to);targets.add(e.to);}
  const nodesById=new Map(map.nodes.map(n=>[n.id,n]));
  const roots=[...map.nodes.filter(n=>!targets.has(n.id)),...map.nodes];
  const hidden=new Set(),branches=new Set();
  for(const root of roots){
    if(parents.has(root.id))continue;
    parents.set(root.id,null);
    const queue=[root];
    for(let i=0;i<queue.length;i++){
      const parent=queue[i];
      for(const key of children.get(parent.id)){
        if(parents.has(key))continue;
        parents.set(key,parent.id);branches.add(parent.id);
        if(parent.folded||hidden.has(parent.id))hidden.add(key);
        queue.push(nodesById.get(key));
      }
    }
  }
  return {hidden,branches,parents};
}
