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
    return {id:key, ...(n.folded?{folded:true}:{}), label:str(n.label,160) || 'Concept', detail:str(n.detail,4000), noteId:str(n.noteId,150), color:colors.includes(n.color) ? n.color : 'blue', x:Math.max(0,Math.min(100000,n.x)),y:Math.max(0,Math.min(100000,n.y))};
  });
  return {title:str(raw.title,150)||'Untitled map', folder:str(raw.folder,100), favorite:!!raw.favorite,trashed:!!raw.trashed,nodes,edges:raw.edges.map(e => {
    if (!e || !ids.has(e.from) || !ids.has(e.to) || !e.id || edges.has(e.id)) throw Error('Invalid relationship in map.');
    edges.add(e.id);
    return {id:fresh?id():e.id,from:ids.get(e.from),to:ids.get(e.to),label:str(e.label,120), ...(e.bend&&[e.bend.x,e.bend.y].every(Number.isFinite)?{bend:{x:e.bend.x,y:e.bend.y}}:{})};
  })};
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
  for (const node of map.nodes) { const depth=levels.get(node.id); node.x=55+depth*270; node.y=55+(counts[depth]||0)*130; counts[depth]=(counts[depth]||0)+1; }
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
