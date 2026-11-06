export function mountBudgetChat(root,ask){
 const dock=document.createElement('div');dock.className='budget-chat-dock';
 dock.innerHTML=`<button type="button" class="budget-chat-launch" aria-label="Open budget AI chat" aria-expanded="false" aria-controls="budget-ai-panel"><span aria-hidden="true">$</span><small>AI</small></button><section id="budget-ai-panel" class="budget-chat-panel" aria-label="Budget AI chat" hidden><header><div><strong>Budget AI</strong><small>Your money, explained</small></div><button type="button" data-clear title="New chat" aria-label="Start a new chat">↻</button><button type="button" data-close title="Close" aria-label="Close budget chat">×</button></header><p class="budget-chat-disclosure">Uses your saved budget with OpenAI. Read-only; no bank access. Chat clears when you sign out.</p><div class="budget-chat-messages" role="log" aria-label="Conversation" aria-live="polite"></div><div class="budget-chat-prompts"><button type="button">Where did my money go this month?</button><button type="button">What bills and subscriptions are coming up?</button><button type="button">Can I afford anything on my wishlist?</button></div><p class="budget-chat-status" role="status"></p><form><label class="budget-chat-label" for="budget-chat-input">Ask about your budget</label><textarea id="budget-chat-input" rows="2" maxlength="2000" placeholder="Ask about your expenses…" required></textarea><button type="submit" aria-label="Send message" title="Send">↑</button></form></section>`;
 root.after(dock);
 const launch=dock.querySelector('.budget-chat-launch'),panel=dock.querySelector('section'),log=dock.querySelector('[role="log"]'),input=dock.querySelector('textarea'),form=dock.querySelector('form'),send=form.querySelector('button'),status=dock.querySelector('[role="status"]'),prompts=dock.querySelector('.budget-chat-prompts');
 let messages=[],busy=false,disposed=false,generation=0;
 const setOpen=open=>{panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open)input.focus();else launch.focus();};
 launch.onclick=()=>setOpen(panel.hidden);dock.querySelector('[data-close]').onclick=()=>setOpen(false);
 dock.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);}});
 const append=(role,content)=>{const article=document.createElement('div');article.className='budget-chat-message '+role;const label=document.createElement('small');label.textContent=role==='user'?'You':'Budget AI';const text=document.createElement('p');text.textContent=content;article.append(label,text);log.append(article);log.scrollTop=log.scrollHeight;return article;};
 const controls=()=>{send.disabled=busy;input.disabled=busy;prompts.querySelectorAll('button').forEach(b=>b.disabled=busy);panel.setAttribute('aria-busy',String(busy));};
 dock.querySelector('[data-clear]').onclick=()=>{generation++;busy=false;messages=[];log.replaceChildren();status.textContent='';prompts.hidden=false;controls();input.value='';input.focus();};
 prompts.querySelectorAll('button').forEach(b=>b.onclick=()=>{input.value=b.textContent;form.requestSubmit();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 form.onsubmit=async e=>{
  e.preventDefault();const question=input.value.trim();if(busy||!question||disposed)return;
  if(messages.length>=22||messages.reduce((n,m)=>n+m.content.length,question.length)>30000){status.textContent='Start a new chat using ↻ to continue.';return;}
  const turn=++generation;busy=true;controls();status.textContent='Reading your latest budget…';prompts.hidden=true;
  const row=append('user',question);input.value='';
  try{const result=await ask([...messages,{role:'user',content:question}]);if(disposed||turn!==generation)return;if(typeof result?.answer!=='string'||!result.answer.trim())throw Error('No answer received. Try again.');messages.push({role:'user',content:question},{role:'assistant',content:result.answer});append('assistant',result.answer);status.textContent='Based on your saved budget · '+(result.asOfDate||'just now');}
  catch(error){if(disposed||turn!==generation)return;row.remove();input.value=question;status.textContent=error.message||'Could not connect to Budget AI. Please try again.';}
  finally{if(!disposed&&turn===generation){busy=false;controls();if(!panel.hidden)input.focus();}}
 };
 return()=>{disposed=true;generation++;messages=[];dock.remove();};
}
