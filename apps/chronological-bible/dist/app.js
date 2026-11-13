'use strict';
const {verses,eras,books}=BIBLE,$=s=>document.querySelector(s),parts=[];
let start=0;while(start<verses.length){let end=Math.min(start+45,verses.length);for(let j=start+1;j<end;j++)if(verses[j][2]!==verses[start][2]){end=j;break}parts.push({start,end,era:verses[start][2]});start=end}
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={index:0,saved:[],size:20,theme:'light'},savedView=false,focusVerse=-1;
let fontBeforeMax=null;
try{Object.assign(state,JSON.parse(localStorage.getItem('rcv-chronological')||'{}'))}catch{}
state.index=Math.max(0,Math.min(parts.length-1,Number(state.index)||0));state.saved=Array.isArray(state.saved)?state.saved.filter(x=>Number.isInteger(x)&&x>=0&&x<parts.length):[];
function persist(){try{localStorage.setItem('rcv-chronological',JSON.stringify(state))}catch{}}
function appearance(){document.body.classList.toggle('dark',state.theme==='dark');document.body.classList.toggle('large-text',state.size>=24);document.body.classList.toggle('larger-text',state.size>=27);document.documentElement.style.setProperty('--font',state.size+'px');$('#sizeLabel').textContent=state.size+' px';document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===state.theme));persist()}
function nav(){const e=parts[state.index].era;$('#savedCount').textContent=state.saved.length;$('#timelineTab').classList.toggle('active',!savedView);$('#savedTab').classList.toggle('active',savedView);$('#navlabel').textContent=savedView?'YOUR SAVED READINGS':'THE BIBLICAL STORY';$('#eras').innerHTML=savedView?(state.saved.length?state.saved.map(i=>`<button data-part="${i}" class="${i===state.index?'active':''}"><span>☆</span>${esc(verses[parts[i].start][0])}<br>${esc(eras[parts[i].era].title)}</button>`).join(''):'<p class="empty">Save a reading with ☆ to return to it here.</p>'):eras.map((x,i)=>`<button data-era="${i}" class="${i===e?'active':''}" ${i===e?'aria-current="true"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(x.title)}</button>`).join('');}
function render(scroll=true){const p=parts[state.index],era=eras[p.era],a=verses[p.start],z=verses[p.end-1];$('#eraCrumb').textContent=era.title;$('#eraNumber').textContent=`CHAPTER ${String(p.era+1).padStart(2,'0')} / ${String(eras.length).padStart(2,'0')}`;$('#title').textContent=era.title;$('#subtitle').textContent=p.era===0?'Before the beginning, the eternal Word.':'Follow the story, one passage at a time.';$('#range').textContent=a[0]+' — '+z[0];let last='',html='';for(let i=p.start;i<p.end;i++){const [ref,text]=verses[i],chapter=ref.split(':')[0];if(chapter!==last){html+=`<h2>${esc(chapter)}</h2>`;last=chapter}html+=`<p id="v${i}" class="${i===focusVerse?'target':''}"><sup>${ref.split(':')[1]}</sup>${esc(text)}</p>`}$('#verses').innerHTML=html;$('#bookmark').textContent=state.saved.includes(state.index)?'★ Saved':'☆ Save reading';$('#previous').disabled=state.index===0;$('#next').disabled=state.index===parts.length-1;$('#pageLabel').textContent=`${state.index+1} / ${parts.length}`;$('#progress').textContent=`${(p.start/verses.length*100).toFixed(1)}% THROUGH THE STORY`;nav();persist();if(scroll)window.scrollTo({top:0,behavior:'instant'});if(focusVerse>=0)requestAnimationFrame(()=>$('#v'+focusVerse)?.scrollIntoView({block:'center'}));}
function go(i,target=-1){state.index=i;focusVerse=target;history.replaceState(null,'','#'+encodeURIComponent(verses[target<0?parts[i].start:target][0]));document.body.classList.remove('nav-open');render()}
function jump(v){const i=parts.findIndex(p=>v>=p.start&&v<p.end);if(i>=0)go(i,v)}
$('#eras').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.era!==undefined)go(parts.findIndex(p=>p.era===+b.dataset.era));else go(+b.dataset.part)};
$('#previous').onclick=()=>go(Math.max(0,state.index-1));$('#next').onclick=()=>go(Math.min(parts.length-1,state.index+1));$('#home').onclick=e=>{e.preventDefault();go(0)};$('#bookmark').onclick=()=>{const at=state.saved.indexOf(state.index);if(at<0)state.saved.push(state.index);else state.saved.splice(at,1);state.saved.sort((a,b)=>a-b);persist();render(false)};$('#timelineTab').onclick=()=>{savedView=false;nav()};$('#savedTab').onclick=()=>{savedView=true;nav()};$('#menu').onclick=()=>document.body.classList.add('nav-open');$('#close').onclick=$('#shade').onclick=()=>document.body.classList.remove('nav-open');
$('#searchOpen').onclick=()=>{$('#searchDialog').showModal();$('#query').focus()};$('#settingsOpen').onclick=()=>$('#settings').showModal();$('#about').onclick=()=>$('#info').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#smaller').onclick=()=>{fontBeforeMax=null;state.size=Math.max(16,state.size-1);appearance()};$('#larger').onclick=()=>{fontBeforeMax=null;state.size=Math.min(28,state.size+1);appearance()};document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;appearance()});
const passageTable=$('#passageTable');
let passageBook='',passageChapter=0,passageStage='books',passageColumns=3;
const passageIndex=new Map();
verses.forEach(([ref],i)=>{const m=ref.match(/^(.*) (\d+):(\d+)$/);if(!m)return;if(!passageIndex.has(m[1]))passageIndex.set(m[1],new Map());const chapters=passageIndex.get(m[1]);if(!chapters.has(+m[2]))chapters.set(+m[2],new Map());chapters.get(+m[2]).set(+m[3],i)});
function renderPassage(focus=false){
  const values=passageStage==='books'?books:passageStage==='chapters'?[...passageIndex.get(passageBook).keys()].sort((a,b)=>a-b):[...passageIndex.get(passageBook).get(passageChapter).keys()].sort((a,b)=>a-b);
  passageColumns=passageStage==='books'?3:5;
  $('#passageBook').hidden=!passageBook;$('#passageBook').textContent=passageBook;
  $('#passageChapter').hidden=!passageChapter;$('#passageChapter').textContent='Chapter '+passageChapter;
  const label=passageStage==='books'?'Choose a book':passageStage==='chapters'?passageBook+' — choose a chapter':passageBook+' '+passageChapter+' — choose a verse';
  let rows='';for(let i=0;i<values.length;i+=passageColumns){rows+='<tr>'+values.slice(i,i+passageColumns).map((v,j)=>`<td><button type="button" data-choice="${i+j}" tabindex="${i+j===0?0:-1}" aria-label="${esc(passageStage==='books'?String(v):passageStage==='chapters'?passageBook+' chapter '+v:passageBook+' '+passageChapter+':'+v)}">${esc(String(v))}</button></td>`).join('')+'</tr>'}
  passageTable.innerHTML=`<caption>${esc(label)}</caption><tbody>${rows}</tbody>`;
  passageTable.classList.toggle('book-table',passageStage==='books');
  if(focus)passageTable.querySelector('button')?.focus();
}
$('#passageBooks').onclick=()=>{passageStage='books';renderPassage(true)};
$('#passageBook').onclick=()=>{passageStage='chapters';renderPassage(true)};
$('#passageChapter').onclick=()=>{passageStage='verses';renderPassage(true)};
passageTable.onclick=e=>{
  const b=e.target.closest('button[data-choice]');if(!b)return;
  const i=+b.dataset.choice;
  if(passageStage==='books'){passageBook=books[i];passageChapter=0;passageStage='chapters';renderPassage(true)}
  else if(passageStage==='chapters'){passageChapter=[...passageIndex.get(passageBook).keys()].sort((a,b)=>a-b)[i];passageStage='verses';renderPassage(true)}
  else{const chapter=passageIndex.get(passageBook).get(passageChapter),number=[...chapter.keys()].sort((a,b)=>a-b)[i];$('#searchDialog').close();jump(chapter.get(number))}
};
passageTable.addEventListener('focusin',e=>{if(!e.target.matches('button[data-choice]'))return;passageTable.querySelectorAll('button').forEach(b=>b.tabIndex=b===e.target?0:-1)});
passageTable.onkeydown=e=>{
  const b=e.target.closest('button[data-choice]');if(!b)return;
  const buttons=[...passageTable.querySelectorAll('button')],i=buttons.indexOf(b),col=i%passageColumns;
  let next=i;
  if(e.key==='ArrowRight')next=col<passageColumns-1?Math.min(i+1,buttons.length-1):i;
  else if(e.key==='ArrowLeft')next=col>0?i-1:i;
  else if(e.key==='ArrowDown')next=i+passageColumns<buttons.length?i+passageColumns:i;
  else if(e.key==='ArrowUp')next=Math.max(col,i-passageColumns);
  else if(e.key==='Home')next=e.ctrlKey?0:i-col;
  else if(e.key==='End')next=e.ctrlKey?buttons.length-1:Math.min(i-col+passageColumns-1,buttons.length-1);
  else return;
  e.preventDefault();e.stopPropagation();buttons[next].focus();
};
renderPassage();
let timer;$('#query').oninput=()=>{clearTimeout(timer);timer=setTimeout(search,130)};
function search(){const raw=$('#query').value.trim(),q=raw.toLowerCase().replace(/psalms/g,'psalm');if(q.length<2){$('#results').innerHTML='';$('#searchHint').textContent='Enter at least two characters.';return}const hits=[];let total=0;const refQuery=/\d/.test(q);for(let i=0;i<verses.length;i++){const [ref,text]=verses[i],r=ref.toLowerCase();if((refQuery&&(r===q||r.startsWith(q+':')||r.startsWith(q+' ')))||(!refQuery&&(text.toLowerCase().includes(q)||r.startsWith(q)))){total++;if(hits.length<80)hits.push(i)}}$('#searchHint').textContent=total?`${total.toLocaleString()} results${total>80?' · showing the first 80':''}`:'No matches. Try a full book name or a different phrase.';$('#results').innerHTML=hits.map(i=>`<button data-verse="${i}"><b>${esc(verses[i][0])} · ${esc(eras[verses[i][2]].title)}</b><span>${esc(verses[i][1])}</span></button>`).join('')}
$('#results').onclick=e=>{const b=e.target.closest('button');if(b){$('#searchDialog').close();jump(+b.dataset.verse)}};
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if(document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();if(e.shiftKey){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen?.().catch(()=>{})}else if(fontBeforeMax!==null){state.size=fontBeforeMax;fontBeforeMax=null;appearance()}else{fontBeforeMax=state.size;state.size=28;appearance()}return}if(['+','=','Add'].includes(e.key)){e.preventDefault();fontBeforeMax=null;state.size=Math.min(28,state.size+1);appearance();return}if(['-','_','Subtract'].includes(e.key)){e.preventDefault();fontBeforeMax=null;state.size=Math.max(16,state.size-1);appearance();return}if(document.querySelector('dialog[open]'))return;if(e.key==='/'){e.preventDefault();$('#searchOpen').click()}else if(e.key==='ArrowRight')$('#next').click();else if(e.key==='ArrowLeft')$('#previous').click()});
function fromHash(){let ref;try{ref=decodeURIComponent(location.hash.slice(1))}catch{return false}const i=verses.findIndex(v=>v[0].toLowerCase()===ref.toLowerCase());if(i>=0){state.index=parts.findIndex(p=>i>=p.start&&i<p.end);focusVerse=i;return true}return false}
window.addEventListener('hashchange',()=>{if(fromHash())render()});fromHash();appearance();render(false);if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
