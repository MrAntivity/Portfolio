// Styled pickers retain native inputs and their form values/validation.
(() => {
  let active = null;
  const months = Array.from({length:12}, (_,i)=>new Date(2020,i,1).toLocaleString(undefined,{month:'short'}));
  const pad = n => String(n).padStart(2,'0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  function close(restore=false) {
    if(!active)return;
    const {panel,input}=active; active=null;
    panel.remove(); input.setAttribute('aria-expanded','false');
    if(restore&&input.isConnected)input.focus();
  }
  function button(text, action, cls='') {
    const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=action;return b;
  }
  function commit(value) {
    const input=active.input;
    input.value=value;close(true);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function frame(input, label) {
    close();
    const panel=document.createElement('div');panel.className='site-picker';panel.setAttribute('popover','manual');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',label);
    (input.closest('dialog')||document.body).append(panel);
    active={input,panel};input.setAttribute('aria-expanded','true');
    if(panel.showPopover)panel.showPopover();
    const r=input.getBoundingClientRect(), width=Math.min(input.tagName==='SELECT'?Math.max(r.width,240):320,innerWidth-24);
    panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(r.left,innerWidth-width-12))+'px';
    panel.style.top=Math.max(12,Math.min(r.bottom+8,innerHeight-380))+'px';
    panel.style.maxHeight=Math.max(120,innerHeight-24-parseFloat(panel.style.top))+'px';
    return panel;
  }
  function select(input) {
    const panel=frame(input,input.labels?.[0]?.textContent?.trim()||'Choose an option');panel.classList.add('site-select-picker');
    const list=document.createElement('div');list.setAttribute('role','listbox');panel.append(list);
    let lastGroup;
    [...input.options].forEach(option=>{
      if(option.hidden)return;
      const group=option.parentElement.tagName==='OPTGROUP'?option.parentElement:null;
      if(group&&group!==lastGroup){const heading=document.createElement('small');heading.textContent=group.label;heading.className='site-option-group';list.append(heading);}lastGroup=group;
      const b=button(option.textContent,()=>commit(option.value),'site-option');b.setAttribute('role','option');b.setAttribute('aria-selected',String(option.selected));b.disabled=option.disabled||!!group?.disabled;
      const check=document.createElement('span');check.textContent=option.selected?'✓':'';check.setAttribute('aria-hidden','true');b.prepend(check);list.append(b);
    });
    const options=[...list.querySelectorAll('button:not(:disabled)')];
    (options.find(b=>b.getAttribute('aria-selected')==='true')||options[0])?.focus();
    panel.addEventListener('keydown',e=>{
      const index=options.indexOf(document.activeElement);
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}
      else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){const next=options.slice(index+1).concat(options.slice(0,index+1)).find(b=>b.textContent.replace('✓','').trim().toLowerCase().startsWith(e.key.toLowerCase()));next?.focus();}
    });
  }
  function date(input) {
    const panel=frame(input,'Choose '+(input.type==='month'?'month':'date'));
    let shown=input.value?new Date(input.value.slice(0,10)+(input.type==='month'?'-01':'')+'T12:00:00'):new Date();
    if(isNaN(shown))shown=new Date();
    const monthOnly=input.type==='month';let chooseMonth=monthOnly;
    const inRange=value=>(!input.min||value>=input.min.slice(0,value.length))&&(!input.max||value<=input.max.slice(0,value.length));
    function pick(value){if(input.type==='datetime-local')value+='T'+(time.value||'12:00');if(inRange(value))commit(value);}
    const time=document.createElement('input');time.type='time';time.value=input.value.slice(11,16)||'12:00';time.setAttribute('aria-label','Time');time.className='site-picker-time';
    function render(focusHeading=false){
      panel.replaceChildren();const header=document.createElement('header');header.className='site-picker-header';
      const prev=button('‹',()=>{if(chooseMonth)shown.setFullYear(shown.getFullYear()-1);else shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);render(true)});prev.setAttribute('aria-label',chooseMonth?'Previous year':'Previous month');
      const heading=button(chooseMonth?String(shown.getFullYear()):`${months[shown.getMonth()]} ${shown.getFullYear()}`,()=>{chooseMonth=!chooseMonth;render(true)},'site-picker-heading');heading.disabled=monthOnly;
      const next=button('›',()=>{if(chooseMonth)shown.setFullYear(shown.getFullYear()+1);else shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);render(true)});next.setAttribute('aria-label',chooseMonth?'Next year':'Next month');header.append(prev,heading,next);panel.append(header);
      if(chooseMonth){
        const year=document.createElement('input');year.type='number';year.min='1';year.max='9999';year.value=shown.getFullYear();year.setAttribute('aria-label','Year');year.className='site-picker-year';year.onchange=()=>{const value=Number(year.value);if(value>=1&&value<=9999){shown.setFullYear(value);render(true)}};panel.append(year);
        const grid=document.createElement('div');grid.className='site-month-grid';months.forEach((name,i)=>{const value=`${shown.getFullYear()}-${pad(i+1)}`;const b=button(name,()=>{if(monthOnly)pick(value);else{shown=new Date(shown.getFullYear(),i,1);chooseMonth=false;render(true)}});b.disabled=!inRange(value);b.classList.toggle('is-selected',input.value.slice(0,7)===value);grid.append(b)});panel.append(grid);
      }else{
        const grid=document.createElement('div');grid.className='site-day-grid';['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(day=>{const label=document.createElement('small');label.textContent=day;grid.append(label)});
        const first=new Date(shown.getFullYear(),shown.getMonth(),1);for(let i=0;i<first.getDay();i++)grid.append(document.createElement('span'));
        const count=new Date(shown.getFullYear(),shown.getMonth()+1,0).getDate();for(let day=1;day<=count;day++){const value=iso(new Date(shown.getFullYear(),shown.getMonth(),day));const b=button(String(day),()=>pick(value));b.disabled=!inRange(value);b.setAttribute('aria-label',value);b.classList.toggle('is-selected',input.value.slice(0,10)===value);if(value===iso(new Date()))b.classList.add('is-today');grid.append(b)}panel.append(grid);
      }
      if(input.type==='datetime-local')panel.append(time);
      const footer=document.createElement('footer');const today=iso(new Date()).slice(0,monthOnly?7:10);const now=button(monthOnly?'This month':'Today',()=>pick(today));now.disabled=!inRange(today);footer.append(button('Clear',()=>commit('')),now);panel.append(footer);if(focusHeading)prev.focus();
    }
    render();panel.querySelector('.is-selected:not(:disabled), .is-today:not(:disabled), button')?.focus();
  }
  const eligible=el=>el instanceof Element&&el.matches('select:not([multiple]), input[type="date"], input[type="month"], input[type="datetime-local"]')&&!el.disabled&&!el.readOnly;
  document.addEventListener('pointerdown',e=>{
    if(active&&!active.input.isConnected)close();
    if(active?.panel.contains(e.target))return;
    if(eligible(e.target)){e.preventDefault();if(active?.input===e.target)close(true);else e.target.tagName==='SELECT'?select(e.target):date(e.target);}
    else close();
  },true);
  document.addEventListener('click',e=>{if(eligible(e.target))e.preventDefault();},true);
  document.addEventListener('keydown',e=>{
    if(active&&(e.key==='Escape'||e.key==='Tab')){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}close(true);return;}
    if(eligible(e.target)&&['Enter',' ','ArrowDown'].includes(e.key)){e.preventDefault();e.target.tagName==='SELECT'?select(e.target):date(e.target);}
  },true);
  window.addEventListener('resize',()=>close());
  new MutationObserver(()=>{if(active&&!active.input.isConnected)close();}).observe(document.documentElement,{childList:true,subtree:true});
})();
