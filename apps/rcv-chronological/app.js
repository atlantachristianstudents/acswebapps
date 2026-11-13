'use strict';
// Chronological · Recovery Version
// Scripture text is not shipped in this repo: the app downloads the shared RcV
// plain-text file (see AGENTS.md) and caches it in IndexedDB for offline use,
// with a localStorage timestamp/backup and a 15-day refresh window, matching
// the other RcV consumers. The chronological order ships in order.js.
const {verses:ORDER,eras,books}=window.ORDER||{};
const $=s=>document.querySelector(s);
const RCV_URL='https://cdn.rapidfile.cc/VbLdPuh9Yxb4/RcV';
const DB_NAME='rcv-chronological-database',STORE='scripture',CACHE_KEY='rcv-chronological-scripture-v1';
const FETCH_DATE_KEY='rcv-chronological-scripture-last-fetch';
const FIFTEEN_DAYS=15*24*60*60*1000;
const SHORT=['Gen.','Exo.','Lev.','Num.','Deut.','Josh.','Judg.','Ruth','1 Sam.','2 Sam.','1 Kings','2 Kings','1 Chron.','2 Chron.','Ezra','Neh.','Esth.','Job','Psa.','Prov.','Eccl.','S.S.','Isa.','Jer.','Lam.','Ezek.','Dan.','Hosea','Joel','Amos','Oba.','Jonah','Micah','Nahum','Hab.','Zeph.','Hag.','Zech.','Mal.','Matt.','Mark','Luke','John','Acts','Rom.','1 Cor.','2 Cor.','Gal.','Eph.','Phil.','Col.','1 Thes.','2 Thes.','1 Tim.','2 Tim.','Titus','Philem.','Heb.','James','1 Pet.','2 Pet.','1 John','2 John','3 John','Jude','Rev.'];
const LONG='Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|');
const names={};SHORT.forEach((s,i)=>{names[s]=LONG[i]});

let verses=[],parts=[];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let state={index:0,saved:[],size:20,theme:'light'},savedView=false,focusVerse=-1;

function readLastFetch(){try{return Number(localStorage.getItem(FETCH_DATE_KEY))||0}catch{return 0}}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function readCachedText(){
  try{
    const db=await openDb();
    const text=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(CACHE_KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error)}});
    if(text)return text;
  }catch(e){console.warn('IndexedDB read failed',e)}
  try{return localStorage.getItem(CACHE_KEY)}catch{return null}
}
async function writeCachedText(text){
  try{
    const db=await openDb();
    await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(text,CACHE_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
    db.close();
  }catch(e){console.warn('IndexedDB save failed',e)}
  try{localStorage.setItem(CACHE_KEY,text)}catch{/* quota: IndexedDB is primary */}
  try{localStorage.setItem(FETCH_DATE_KEY,String(Date.now()))}catch{}
}
function parseRcv(text){
  const lines=String(text).split(/\r?\n/).filter(l=>l.trim());
  if(lines.length!==31103)throw new Error('Scripture text validation failed: expected 31,103 verses, received '+lines.length);
  const lookup={};
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^(.+?) (\d+):(\d+)\s+(.*)$/);
    if(!m)throw new Error('Unparsable line: '+lines[i].slice(0,80));
    const book=names[m[1]];
    if(!book)throw new Error('Unknown book abbreviation: '+m[1]);
    lookup[book+' '+parseInt(m[2],10)+':'+parseInt(m[3],10)]=m[4];
  }
  return lookup;
}
async function downloadAndCache(){
  const resp=await fetch(RCV_URL);
  if(!resp.ok)throw new Error('Could not download the Recovery Version text (HTTP '+resp.status+')');
  const text=await resp.text();
  parseRcv(text); // validate before caching
  await writeCachedText(text);
  return text;
}
async function loadVerses(){
  const lastFetch=readLastFetch();
  const cacheExpired=!lastFetch||Date.now()-lastFetch>FIFTEEN_DAYS;
  let text=null;
  if(!cacheExpired)text=await readCachedText();
  if(!text){
    try{text=await downloadAndCache()}
    catch(e){
      const stale=await readCachedText();
      if(stale){console.warn('Download failed; using stale cache',e);text=stale}
      else throw new Error('Could not download the Recovery Version text. Connect to the internet once and try again.');
    }
  }
  const lookup=parseRcv(text);
  return ORDER.map(pair=>{
    const ref=pair[0],era=pair[1],t=lookup[ref];
    if(t==null)throw new Error('Missing verse in downloaded text: '+ref);
    return [ref,t,era];
  });
}
function setStatus(msg){$('#loadmessage').textContent=msg;$('#loadretry').hidden=true;$('#loadstatus').hidden=false}
function setError(err){$('#loadmessage').textContent=err&&err.message?err.message:String(err);$('#loadretry').hidden=false;$('#loadstatus').hidden=false}

function persist(){try{localStorage.setItem('rcv-chronological',JSON.stringify(state))}catch{}}
function appearance(){document.body.classList.toggle('dark',state.theme==='dark');document.documentElement.style.setProperty('--font',state.size+'px');$('#sizeLabel').textContent=state.size+' px';document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===state.theme));persist()}
function nav(){const e=parts[state.index].era;$('#savedCount').textContent=state.saved.length;$('#timelineTab').classList.toggle('active',!savedView);$('#savedTab').classList.toggle('active',savedView);$('#navlabel').textContent=savedView?'YOUR SAVED READINGS':'THE BIBLICAL STORY';$('#eras').innerHTML=savedView?(state.saved.length?state.saved.map(i=>`<button data-part="${i}" class="${i===state.index?'active':''}"><span>☆</span>${esc(verses[parts[i].start][0])}<br>${esc(eras[parts[i].era].title)}</button>`).join(''):'<p class="empty">Save a reading with ☆ to return to it here.</p>'):eras.map((x,i)=>`<button data-era="${i}" class="${i===e?'active':''}" ${i===e?'aria-current="true"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(x.title)}</button>`).join('');}
function render(scroll=true){const p=parts[state.index],era=eras[p.era],a=verses[p.start],z=verses[p.end-1];$('#eraCrumb').textContent=era.title;$('#eraNumber').textContent=`CHAPTER ${String(p.era+1).padStart(2,'0')} / ${String(eras.length).padStart(2,'0')}`;$('#title').textContent=era.title;$('#subtitle').textContent=p.era===0?'Before the beginning, the eternal Word.':'Follow the story, one passage at a time.';$('#range').textContent=a[0]+' — '+z[0];let last='',html='';for(let i=p.start;i<p.end;i++){const [ref,text]=verses[i],chapter=ref.split(':')[0];if(chapter!==last){html+=`<h2>${esc(chapter)}</h2>`;last=chapter}html+=`<p id="v${i}" class="${i===focusVerse?'target':''}"><sup>${ref.split(':')[1]}</sup>${esc(text)}</p>`}$('#verses').innerHTML=html;$('#bookmark').textContent=state.saved.includes(state.index)?'★ Saved':'☆ Save reading';$('#previous').disabled=state.index===0;$('#next').disabled=state.index===parts.length-1;$('#pageLabel').textContent=`${state.index+1} / ${parts.length}`;$('#progress').textContent=`${(p.start/verses.length*100).toFixed(1)}% THROUGH THE STORY`;nav();persist();if(scroll)window.scrollTo({top:0,behavior:'instant'});if(focusVerse>=0)requestAnimationFrame(()=>$('#v'+focusVerse)?.scrollIntoView({block:'center'}))}
function go(i,target=-1){state.index=i;focusVerse=target;history.replaceState(null,'','#'+encodeURIComponent(verses[target<0?parts[i].start:target][0]));document.body.classList.remove('nav-open');render()}
function jump(v){const i=parts.findIndex(p=>v>=p.start&&v<p.end);if(i>=0)go(i,v)}

function initApp(){
  try{Object.assign(state,JSON.parse(localStorage.getItem('rcv-chronological')||'{}'))}catch{}
  state.index=Math.max(0,Math.min(parts.length-1,Number(state.index)||0));state.saved=Array.isArray(state.saved)?state.saved.filter(x=>Number.isInteger(x)&&x>=0&&x<parts.length):[];

  $('#eras').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.era!==undefined)go(parts.findIndex(p=>p.era===+b.dataset.era));else go(+b.dataset.part)};
  $('#previous').onclick=()=>go(Math.max(0,state.index-1));$('#next').onclick=()=>go(Math.min(parts.length-1,state.index+1));$('#home').onclick=e=>{e.preventDefault();go(0)};$('#bookmark').onclick=()=>{const at=state.saved.indexOf(state.index);if(at<0)state.saved.push(state.index);else state.saved.splice(at,1);state.saved.sort((a,b)=>a-b);persist();render(false)};$('#timelineTab').onclick=()=>{savedView=false;nav()};$('#savedTab').onclick=()=>{savedView=true;nav()};$('#menu').onclick=()=>document.body.classList.add('nav-open');$('#close').onclick=$('#shade').onclick=()=>document.body.classList.remove('nav-open');
  $('#searchOpen').onclick=()=>{$('#searchDialog').showModal();$('#query').focus()};$('#settingsOpen').onclick=()=>$('#settings').showModal();$('#about').onclick=()=>$('#info').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#smaller').onclick=()=>{state.size=Math.max(16,state.size-1);appearance()};$('#larger').onclick=()=>{state.size=Math.min(28,state.size+1);appearance()};document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;appearance()});
  let timer;$('#query').oninput=()=>{clearTimeout(timer);timer=setTimeout(search,130)};
  $('#results').onclick=e=>{const b=e.target.closest('button');if(b){$('#searchDialog').close();jump(+b.dataset.verse)}};
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='/'){e.preventDefault();$('#searchOpen').click()}else if(e.key==='ArrowRight')$('#next').click();else if(e.key==='ArrowLeft')$('#previous').click()});

  function fromHash(){let ref;try{ref=decodeURIComponent(location.hash.slice(1))}catch{return false}const i=verses.findIndex(v=>v[0].toLowerCase()===ref.toLowerCase());if(i>=0){state.index=parts.findIndex(p=>i>=p.start&&i<p.end);focusVerse=i;return true}return false}
  window.addEventListener('hashchange',()=>{if(fromHash())render()});fromHash();appearance();render(false);
  if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
}

function search(){const raw=$('#query').value.trim(),q=raw.toLowerCase().replace(/psalms/g,'psalm');if(q.length<2){$('#results').innerHTML='';$('#searchHint').textContent='Enter at least two characters.';return}const hits=[];let total=0;const refQuery=/\d/.test(q);for(let i=0;i<verses.length;i++){const [ref,text]=verses[i],r=ref.toLowerCase();if((refQuery&&(r===q||r.startsWith(q+':')||r.startsWith(q+' ')))||(!refQuery&&(text.toLowerCase().includes(q)||r.startsWith(q)))){total++;if(hits.length<80)hits.push(i)}}$('#searchHint').textContent=total?`${total.toLocaleString()} results${total>80?' · showing the first 80':''}`:'No matches. Try a full book name or a different phrase.';$('#results').innerHTML=hits.map(i=>`<button data-verse="${i}"><b>${esc(verses[i][0])} · ${esc(eras[verses[i][2]].title)}</b><span>${esc(verses[i][1])}</span></button>`).join('')}

async function boot(){
  if(!ORDER){setError(new Error('order.js is missing. Reinstall the app or contact the maintainer.'));return}
  setStatus('Loading Scripture…');
  try{
    verses=await loadVerses();
  }catch(e){setError(e);return}
  parts=[];let start=0;while(start<verses.length){let end=Math.min(start+45,verses.length);for(let j=start+1;j<end;j++)if(verses[j][2]!==verses[start][2]){end=j;break}parts.push({start,end,era:verses[start][2]});start=end}
  $('#loadstatus').hidden=true;
  initApp();
}

$('#loadretry').onclick=()=>boot();
window.addEventListener('online',()=>{if(!verses.length)boot()});
boot();
