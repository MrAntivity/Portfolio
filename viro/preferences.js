// Each preference is saved independently, so devices cannot overwrite unrelated choices.
export function createPreferences({watch,write,onError=()=>{}}){
 let remote={},disposed=false;const pending=new Map(),listeners=new Set();
 const notify=()=>{if(!disposed)listeners.forEach(fn=>fn());};
 const stop=watch(values=>{remote=values;notify();},error=>{if(!disposed)onError(error);});
 return {
  get(key,fallback=false){return pending.has(key)?pending.get(key).value:typeof remote[key]==='boolean'?remote[key]:fallback;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async set(key,value){
   if(disposed||typeof value!=='boolean')return;
   const change={value};pending.set(key,change);notify();
   try{await write(key,value);if(disposed)return;if(pending.get(key)===change){remote[key]=value;pending.delete(key);notify();}}
   catch(error){if(disposed)return;if(pending.get(key)===change){pending.delete(key);notify();onError(error);}}
  },
  dispose(){disposed=true;stop();pending.clear();listeners.clear();remote={};}
 };
}
