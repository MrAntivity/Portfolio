import {firebaseConfig} from '../viro/firebase-config.js';
const endpoint=`https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/fileShareAccess`;
const id=location.hash.slice(1),status=document.getElementById('status'),list=document.getElementById('files'),unlock=document.getElementById('unlock');
let session='',busy=false;
async function request(action,extra={}){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id,session,...extra}),cache:'no-store',credentials:'omit'});
 if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401){session='';unlock.hidden=false;document.getElementById('pin-label').hidden=false;document.getElementById('pin').required=true;}if([401,403,404].includes(response.status)){list.replaceChildren();document.getElementById('refresh').hidden=true;}throw Error(data.error||'Unable to open this share. Please try again.');}
 return response;
}
async function task(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Loading…';try{await fn();status.textContent='';}catch(e){status.textContent=e.message==='Failed to fetch'?'Could not connect. Check your connection or ask the owner whether sharing is activated.':e.message;}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function render(){
 const data=await (await request('list')).json();document.getElementById('title').textContent=data.name||'Shared files';document.getElementById('intro').textContent='Download a file below. The owner can update or revoke access.';list.replaceChildren();
 const folders=new Map(data.folders.map(f=>[f.id,f]));
 for(const file of data.files){const article=document.createElement('article'),title=document.createElement('h2');title.textContent=file.name;article.append(title);
  let current=file.folderId,path=[],seen=new Set();while(folders.has(current)&&!seen.has(current)){seen.add(current);const f=folders.get(current);path.unshift(f.name);current=f.parentId;}if(path.length){const label=document.createElement('p');label.textContent=path.join(' / ');article.append(label);}
  const buttons=document.createElement('div');buttons.className='downloads';
  for(const page of file.pages){const button=document.createElement('button');button.textContent=`Download ${page.name}`;button.onclick=()=>task(async()=>{status.textContent='Downloading…';const blob=await (await request('download',{fileId:file.id,page:page.index})).blob();const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=page.name||'download';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);});buttons.append(button);}
  article.append(buttons);list.append(article);
 }
 if(!data.files.length)list.textContent='This folder is empty. Check back after files are added.';
 unlock.hidden=true;document.getElementById('refresh').hidden=false;
}
unlock.onsubmit=e=>{e.preventDefault();task(async()=>{const data=await (await request('unlock',{pin:document.getElementById('pin').value})).json();session=data.session;document.getElementById('pin').value='';await render();});};
document.getElementById('refresh').onclick=()=>task(render);
if(!/^[a-f0-9]{64}$/.test(id)){status.textContent='This share link is incomplete. Ask the owner to copy a new link.';unlock.hidden=true;}
