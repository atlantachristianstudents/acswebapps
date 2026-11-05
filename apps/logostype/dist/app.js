const $=s=>document.querySelector(s);
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let scriptureLines=[],scriptureWordTotals=[0];
function normalizeScripture(line){
  if(mode!=='book'&&!punctuation)line=line.replace(/\p{P}/gu,'');
  if(mode!=='book'&&!capitalization)line=line.toLowerCase();
  return line.replace(/\s+/g,' ').trim();
}
const scriptureChapterEnds=[],scriptureBookEnds=[];
for(let index=0;index<scriptureReferences.length;index++){
  const reference=scriptureReferences[index],next=scriptureReferences[index+1];
  if(!next||reference.slice(0,reference.lastIndexOf(':'))!==next.slice(0,next.lastIndexOf(':')))scriptureChapterEnds.push(index+1);
  if(!next||reference.replace(/ \d+:\d+$/,'')!==next.replace(/ \d+:\d+$/,''))scriptureBookEnds.push(index+1);
}
let bookProgress=0,lastTypingMode='time';
let journeyCompletedAt=null;
try{const saved=localStorage.getItem('logostype-journey-completed-at');if(saved&&Number.isFinite(Date.parse(saved)))journeyCompletedAt=new Date(saved).toISOString()}catch{}
let journeyCompletions=[];
try{const saved=JSON.parse(localStorage.getItem('logostype-journey-completions')||'[]');if(Array.isArray(saved))journeyCompletions=saved.filter(value=>typeof value==='string'&&Number.isFinite(Date.parse(value))).map(value=>new Date(value).toISOString())}catch{}
journeyCompletions=[...new Set([...journeyCompletions,...(journeyCompletedAt?[journeyCompletedAt]:[])])].sort();
try{const saved=Number(localStorage.getItem('logostype-book-progress'));if(Number.isSafeInteger(saved)&&saved>=0)bookProgress=saved}catch{}
function celebrateJourney(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000';
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const context=canvas.getContext('2d');if(!context)return;
  document.body.append(canvas);
  const colors=['#e2b714','#88c0d0','#ebbcba','#a3be8c','#f5f5f5'];
  const pieces=Array.from({length:160},()=>({x:Math.random()*canvas.width,y:-20-Math.random()*canvas.height*.5,vx:(Math.random()-.5)*180,vy:100+Math.random()*180,angle:Math.random()*Math.PI,spin:(Math.random()-.5)*8,color:colors[Math.floor(Math.random()*colors.length)]}));
  let started,last;
  function frame(now){
    started??=now;const delta=Math.min((now-(last??now))/1000,.05);last=now;
    context.clearRect(0,0,canvas.width,canvas.height);
    context.globalAlpha=Math.min(1,(4500-(now-started))/800);
    for(const piece of pieces){
      piece.x+=piece.vx*delta;piece.y+=piece.vy*delta;piece.vy+=70*delta;piece.angle+=piece.spin*delta;
      context.save();context.translate(piece.x,piece.y);context.rotate(piece.angle);context.fillStyle=piece.color;context.fillRect(-4,-6,8,12);context.restore();
    }
    if(now-started<4500)requestAnimationFrame(frame);else canvas.remove();
  }
  requestAnimationFrame(frame);
}
function syncNavigation(racing=false){
  $('#home').classList.toggle('active',!racing&&mode!=='book');
  $('#book').classList.toggle('active',!racing&&mode==='book');
  $('#friends').classList.toggle('active',racing);
}
function updateBookProgress(message=''){
  const active=mode==='book'&&!window.friendRace?.active;
  document.body.classList.toggle('book-mode',active);
  $('#bookProgress').hidden=!active;
  $('#journeyProgress').hidden=!active;
  if(!active){$('#restart').title='Restart test';$('#restart').setAttribute('aria-label','Restart test');return;}
  const completed=Math.min(bookProgress,scriptureLines.length);
  const percent=scriptureLines.length?completed/scriptureLines.length*100:0;
  $('#journeyProgressFill').style.height=percent+'%';
  $('#journeyProgressValue').textContent=percent.toFixed(2)+'%';
  $('#journeyProgressCount').textContent=`${completed.toLocaleString()} / ${scriptureLines.length.toLocaleString()} verses`;
  $('#journeyChapterCount').textContent=`${scriptureChapterEnds.filter(end=>end<=completed).length.toLocaleString()} / ${scriptureChapterEnds.length.toLocaleString()} chapters`;
  $('#journeyBookCount').textContent=`${scriptureBookEnds.filter(end=>end<=completed).length} / ${scriptureBookEnds.length} books`;
  const completedWords=scriptureWordTotals[completed]||0,totalWords=scriptureWordTotals[scriptureWordTotals.length-1]||0;
  $('#journeyWordCount').textContent=`${completedWords.toLocaleString()} / ${totalWords.toLocaleString()} words`;
  $('#journeyWordPercent').textContent=`${(totalWords?completedWords/totalWords*100:0).toFixed(2)}% of Scripture words completed`; 
  $('#journeyProgressTrack').setAttribute('aria-valuenow',String(completed));
  $('#journeyProgressTrack').setAttribute('aria-valuemax',String(scriptureLines.length||1));
  $('#journeyProgressTrack').setAttribute('aria-valuetext',`${completed} of ${scriptureLines.length} verses completed (${percent.toFixed(2)}%)`);
  const label=scriptureReferences[bookProgress]||'Scripture journey';
  $('#bookProgress').textContent=message||(bookProgress>=scriptureLines.length&&scriptureLines.length?'Journey complete — every verse completed.':`${label} · ${bookProgress} verses completed · correct all typos to advance`);
  if(completed===scriptureLines.length&&scriptureLines.length&&journeyCompletedAt)$('#bookProgress').textContent+=` Completed on ${new Date(journeyCompletedAt).toLocaleString()}.`;
  if(journeyCompletions.length)$('#bookProgress').textContent+=` ${journeyCompletions.length} journey${journeyCompletions.length===1?'':'s'} completed.`;
  $('#restart').disabled=false;
  $('#restart').title=completed===scriptureLines.length?'Start a new Scripture Journey':'Restart verse';
  $('#restart').setAttribute('aria-label',$('#restart').title);
}
function restartTest(){
  if(mode==='book'&&scriptureLines.length&&bookProgress>=scriptureLines.length){
    bookProgress=0;journeyCompletedAt=null;
    try{
      localStorage.setItem('logostype-journey-completions',JSON.stringify(journeyCompletions));
      localStorage.setItem('logostype-book-progress','0');
      localStorage.removeItem('logostype-journey-completed-at');
    }catch{}
  }
  reset();input.focus();
}
function renderBookContext(){
  for(const [id,index] of [['previousVerse',bookProgress-1],['followingVerse',bookProgress+1]]){
    const element=$('#'+id);
    element.hidden=mode!=='book'||!!window.friendRace?.active||!scriptureLines[index];
    if(element.hidden)continue;
    element.querySelector('.verse-context-reference').textContent=scriptureReferences[index];
    element.querySelector('p').textContent=scriptureLines[index];
  }
}
function enterBook(){
  if(mode!=='book')lastTypingMode=mode;
  mode='book';reset();input.focus();
}
function enterTyping(){
  if(mode==='book'){mode=lastTypingMode;limit=mode==='time'?15:25;}
  $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  reset();input.focus();
}
function completeBookVerse(){
  if(mode!=='book')return;
  const passed=typed===target&&target.length>0;
  if(passed&&bookProgress<scriptureLines.length){
    bookProgress=Math.min(bookProgress+1,scriptureLines.length);
    try{localStorage.setItem('logostype-book-progress',String(bookProgress))}catch{}
    if(bookProgress===scriptureLines.length){
      journeyCompletedAt=new Date().toISOString();
      journeyCompletions.push(journeyCompletedAt);
      try{localStorage.setItem('logostype-journey-completed-at',journeyCompletedAt);localStorage.setItem('logostype-journey-completions',JSON.stringify(journeyCompletions))}catch{}
      celebrateJourney();
    }
  }
  updateBookProgress(passed?(bookProgress===scriptureLines.length?'Journey complete — every verse completed.':'Verse complete — progress saved. Continue to the next verse.'):'Correct the remaining typos to advance.');
  $('#again').title=passed?'Next verse':'Retry verse';
  $('#again').setAttribute('aria-label',$('#again').title);
  return passed;
}
let mode='time',limit=15,punctuation=false,capitalization=false,target='',rawTarget='',typed='',start=0,timer=null,done=false,total=0,errors=0,samples=[],instantSamples=[],rawSamples=[],sampleTimes=[],mistakeEvents=[],recentCorrect=[],custom='And when he sits on the throne of his kingdom, he shall write out for himself a copy of this law in a book, out of [that which is] before the Levitical priests.',history=[];try{history=JSON.parse(localStorage.getItem('logostype-history')||'[]')}catch{}const input=$('#typing');function limits(){const values=mode==='time'?[15,30,60,120]:[10,25,50,100];$('#limits').innerHTML=mode==='quote'||mode==='custom'||mode==='book'?'':values.map(n=>`<button data-limit="${n}" class="${n===limit?'active':''}">${n}</button>`).join('')+(mode==='time'?`<button data-duration class="${values.includes(limit)?'':'active'}" aria-label="Custom time duration">${values.includes(limit)?'custom':limit+'s ✎'}</button>`:'')}function generate(append=false){
  let passage='';
  if(mode==='book')passage=scriptureLines[bookProgress]||'';
  else if(mode==='custom')passage=custom.trim().replace(/\s+/g,' ');
  else if(scriptureLines.length){
    let index=Math.floor(Math.random()*scriptureLines.length);
    if(mode==='quote')passage=scriptureLines[index];
    else{
      const count=mode==='words'?limit:250;
      const words=[];
      while(words.length<count){
        words.push(...scriptureLines[index].split(/\s+/).filter(word=>word.replace(/\p{P}/gu,'').trim()));
        index=(index+1)%scriptureLines.length;
      }
      passage=words.slice(0,count).join(' ');
    }
  }
  rawTarget=append&&rawTarget?rawTarget+' '+passage:passage;
  return normalizeScripture(passage);
}
function render(smooth=true){renderBookContext();let pos=0;$('#words').innerHTML=target.split(' ').map(w=>{let html='<span class="word">';for(const c of w){html+=`<span class="letter ${pos<typed.length?(typed[pos]===c?'correct':'incorrect'):''} ${pos===typed.length?'cursor':''}">${c.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`;pos++}html+=`<span class="letter ${pos===typed.length?'cursor':''}"> </span></span>`;pos++;return html}).join('');positionCaret(smooth)}function positionCaret(smooth=true){const letter=$('.cursor'),caret=$('#typingCaret');caret.hidden=!letter;if(!letter)return;const box=$('#words');box.scrollTop=Math.max(0,letter.offsetTop-48);const r=letter.getBoundingClientRect(),parent=$('.test').getBoundingClientRect();if(!smooth)caret.style.transition='none';caret.style.height=r.height+'px';caret.style.transform=`translate3d(${r.left-parent.left-2}px,${r.top-parent.top}px,0)`;if(!smooth){void caret.offsetWidth;caret.style.transition=''}}function reset(preservePassage=false){if(mode==='book'&&done)preservePassage=false;if(window.friendRace?.active&&!window.friendRace.preparing)return;clearInterval(timer);timer=null;typed='';input.value='';start=0;done=false;total=0;errors=0;samples=[];instantSamples=[];rawSamples=[];sampleTimes=[];mistakeEvents=[];recentCorrect=[];target=preservePassage?normalizeScripture(rawTarget):generate();input.disabled=(!scriptureLines.length&&mode!=='custom')||(mode==='book'&&bookProgress>=scriptureLines.length);document.body.classList.remove('focus','running');$('#results').style.display='none';$('#testSection').style.display='block';$('#counter').textContent='';syncNavigation(!!window.friendRace?.active);updateBookProgress();$('#again').title='Next test';$('#again').setAttribute('aria-label','Next test');limits();render(false)}function speed(){let correct=0;for(let i=0;i<typed.length;i++)if(typed[i]===target[i])correct++;return Math.round(correct/5/Math.max((Date.now()-start)/60000,1/60))}function rawSpeed(){
  if(!start)return 0;
  return Math.round(typed.length/5/Math.max((Date.now()-start)/60000,1/60));
}
function instantSpeed(now=Date.now()){
  recentCorrect=recentCorrect.filter(hit=>now-hit.time<3000);
  if(!start)return 0;
  return Math.round(recentCorrect.length/5/Math.max(1,Math.min(3,(now-start)/1000))*60);
}
function recordMistake(){
  errors++;
  mistakeEvents.push({time:Math.max(0,(Date.now()-start)/1000),wpm:instantSpeed()});
}
function sampleWpm(){
  samples.push(speed());
  instantSamples.push(instantSpeed());
  rawSamples.push(rawSpeed());
  sampleTimes.push(Math.max(0,(Date.now()-start)/1000));
}
function finish(){if(done)return;sampleWpm();done=true;completeBookVerse();clearInterval(timer);document.body.classList.remove('focus','running');const elapsed=(Date.now()-start)/1000,wpm=speed(),accuracy=total?Math.round((total-errors)/total*100):100;$('#wpm').textContent=wpm;$('#rawWpm').textContent=rawSpeed();$('#wpm').parentElement.hidden=!!(window.friendRace?.active&&window.friendRace.running);$('#rawWpm').parentElement.hidden=$('#wpm').parentElement.hidden;$('#chart').hidden=!!(window.friendRace?.active&&window.friendRace.running);$('#chartLegend').hidden=$('#chart').hidden;$('#accuracy').textContent=accuracy+'%';$('#testType').textContent=`${mode} ${mode==='time'?limit+'s':mode==='words'?limit:''} · english`;$('#resultDetails').textContent=`${Math.round(elapsed)}s · ${typed.length} characters · ${errors} errors`;$('#testSection').style.display='none';$('#results').style.display='block';history.unshift({id:crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),wpm,rawWpm:rawSpeed(),accuracy,mode,limit,date:new Date().toLocaleDateString()});try{localStorage.setItem('logostype-history',JSON.stringify(history))}catch{}drawChart();window.friendRace?.report(true)}function hideChartHover(){$('#chartMarker').hidden=true;$('#chartTooltip').hidden=true}
function drawChart(){
  hideChartHover();
  const c=$('#chart');if(c.hidden)return;
  const r=c.getBoundingClientRect(),d=devicePixelRatio||1;
  c.width=r.width*d;c.height=170*d;
  const x=c.getContext('2d');x.scale(d,d);
  const w=r.width,styles=getComputedStyle(document.body);
  const max=Math.max(100,...samples,...instantSamples,...rawSamples,...mistakeEvents.map(event=>event.wpm));
  const duration=Math.max(1,...sampleTimes);
  x.font='11px monospace';
  for(let i=0;i<5;i++){
    const y=15+i*32;
    x.strokeStyle=styles.getPropertyValue('--panel');x.beginPath();x.moveTo(35,y);x.lineTo(w,y);x.stroke();
    x.fillStyle=styles.getPropertyValue('--muted');x.fillText(Math.round(max*(1-i/4)),0,y+4);
  }
  for(const [values,color,dash] of [[rawSamples,'--muted',[2,4]],[instantSamples,'--text',[5,4]],[samples,'--accent',[]]]){
    x.strokeStyle=styles.getPropertyValue(color);x.lineWidth=2;x.setLineDash(dash);x.beginPath();x.moveTo(35,145);
    values.forEach((v,i)=>x.lineTo(35+sampleTimes[i]/duration*(w-40),145-v/max*130));
    x.stroke();
  }
  x.setLineDash([]);
  x.strokeStyle=styles.getPropertyValue('--error');x.lineWidth=2;
  for(const event of mistakeEvents){
    const px=35+Math.min(event.time/duration,1)*(w-40);
    const py=145-event.wpm/max*130;
    x.beginPath();x.moveTo(px-4,py-4);x.lineTo(px+4,py+4);
    x.moveTo(px-4,py+4);x.lineTo(px+4,py-4);x.stroke();
  }
}
function chartHoverPoint(pointerX,width){
  if(!sampleTimes.length||width<=40)return null;
  const x=Math.max(35,Math.min(width-5,pointerX));
  const time=(x-35)/(width-40)*Math.max(1,...sampleTimes);
  let index=0;
  for(let i=1;i<sampleTimes.length;i++)if(Math.abs(sampleTimes[i]-time)<Math.abs(sampleTimes[index]-time))index=i;
  return {x,index};
}
$('#chart').addEventListener('pointermove',event=>{
  const chart=$('#chart');
  if(chart.hidden||!done){hideChartHover();return;}
  const rect=chart.getBoundingClientRect();
  const point=chartHoverPoint(event.clientX-rect.left,rect.width);
  if(!point){hideChartHover();return;}
  const {x,index}=point,tooltip=$('#chartTooltip'),marker=$('#chartMarker');
  marker.hidden=false;marker.style.left=x+'px';
  $('#chartHoverTime').textContent=sampleTimes[index].toFixed(1)+'s';
  $('#chartHoverAverage').textContent=samples[index];
  $('#chartHoverInstant').textContent=instantSamples[index];
  $('#chartHoverRaw').textContent=rawSamples[index];
  tooltip.hidden=false;
  const tooltipWidth=tooltip.offsetWidth;
  const left=x+12+tooltipWidth>rect.width?x-tooltipWidth-12:x+12;
  tooltip.style.left=Math.max(0,Math.min(rect.width-tooltipWidth,left))+'px';
});
$('#chart').addEventListener('pointerleave',hideChartHover);
$('#chart').addEventListener('pointercancel',hideChartHover);
window.addEventListener('resize',()=>{hideChartHover();if(done&&!$('#chart').hidden)drawChart()});
input.addEventListener('beforeinput',event=>{
  if(mode==='book'&&event.inputType.startsWith('insert')&&input.value.length>=target.length&&input.selectionStart===input.selectionEnd)event.preventDefault();
});
input.addEventListener('input',()=>{if(done){input.value=typed;return}if(window.friendRace?.active&&!window.friendRace.running){input.value=typed;return}const v=mode==='book'?input.value.slice(0,target.length):input.value;if(mode==='book'&&input.value!==v)input.value=v;if(!start&&v.length){start=Date.now();document.body.classList.add('focus','running');timer=setInterval(()=>{const elapsed=(Date.now()-start)/1000;sampleWpm();$('#counter').textContent=mode==='time'?Math.max(0,Math.ceil(limit-elapsed)):`${typed.length}/${target.length}`;if(mode==='time'&&elapsed>=limit)finish()},250)}for(let i=0;i<v.length;i++)if(i>=typed.length||v[i]!==typed[i]){total++;if(v[i]!==target[i])recordMistake()}const previousLength=typed.length;typed=v.slice(0,target.length);recentCorrect=recentCorrect.filter(hit=>hit.position<typed.length);for(let i=previousLength;i<typed.length;i++)if(typed[i]===target[i])recentCorrect.push({time:Date.now(),position:i});if(mode==='time'&&target.length-typed.length<100)target+=' '+generate(true);render();window.friendRace?.report(false);if(mode!=='time'&&typed.length>=target.length&&((!window.friendRace?.active&&mode!=='book')||typed===target)){
  if(mode==='book'){
    completeBookVerse();
    reset();
    input.focus();
  }else finish();
}});$('.test').onclick=()=>input.focus();$('#restart').onclick=restartTest;$('#again').onclick=$('#home').onclick=$('.brand').onclick=()=>{reset();input.focus()};$('#modes').onclick=e=>{const m=e.target.dataset.mode;if(!m)return;mode=m;limit=m==='time'?15:25;$('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));if(m==='custom')openModal('custom');reset()};$('#limits').onclick=e=>{if(e.target.hasAttribute('data-duration')){openModal('duration');return}if(e.target.dataset.limit){limit=+e.target.dataset.limit;reset()}};for(const [id,getValue,toggle] of [
  ['punct',()=>punctuation,()=>punctuation=!punctuation],
  ['capitalization',()=>capitalization,()=>capitalization=!capitalization]
]){
  $('#'+id).onclick=()=>{
    if(window.friendRace?.active||mode==='book')return;
    toggle();
    $('#'+id).classList.toggle('active',getValue());
    $('#'+id).setAttribute('aria-pressed',String(getValue()));
    reset(true);
  };
}
const themes={'serika dark':['#323437','#2c2e31','#d1d0c5','#646669','#e2b714'],'serika':['#e1e1e3','#d1d3d8','#323437','#aaaeb3','#b68b00'],'nord':['#2e3440','#272d38','#d8dee9','#6c7a90','#88c0d0'],'rose pine':['#191724','#1f1d2e','#e0def4','#6e6a86','#ebbcba']};function theme(name){const vals=themes[name]||themes['serika dark'];['--bg','--panel','--text','--muted','--accent'].forEach((k,i)=>document.documentElement.style.setProperty(k,vals[i]));$('#themeName').textContent=name;try{localStorage.setItem('logostype-theme',name)}catch{}}function openModal(type){const content=$('#modalContent');if(type==='themes')content.innerHTML='<h2>theme</h2>'+Object.keys(themes).map(t=>`<button class="option" data-theme="${t}">◐ ${t}</button>`).join('');if(type==='settings')content.innerHTML='<h2>settings</h2><form id="profileForm"><label for="profileName">your name</label><input class="race-field" id="profileName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" type="submit">save name</button></form><button class="option" data-open="themes">◐ change theme</button><button class="option" id="fontSize">A change font size</button><h3>your data</h3><button class="option" id="exportData">export progress and typing history ↓</button><button class="option" id="importData">import progress and typing history ↑</button><p>Export a JSON backup of your name, Scripture Journey progress, and all saved typing history. Import merges history and keeps your furthest progress.</p><p id="dataStatus" role="status" aria-live="polite"></p><p>Tests begin on your first keystroke. Backspace corrects mistakes. Your name, theme, progress, and typing history are saved on this device.</p>';if(type==='about')content.innerHTML='<h2>logostype</h2><p>Type the scriptures. No account required; your results stay in this browser.</p><p>Speed is measured in words per minute, using five characters per word. Accuracy includes all keystrokes, even corrected mistakes.</p>';if(type==='history'||type==='profile')content.innerHTML='<h2>your typing history</h2>'+(history.length?history.map(h=>`<div class="history-row"><span>${escapeHtml(h.date)} · ${escapeHtml(h.mode)} ${h.limit}</span><span>${h.wpm} wpm · ${h.accuracy}%</span></div>`).join(''):'<p>Your first personal best is one test away. Finish a test to save your results here.</p>');if(type==='history'||type==='profile')content.insertAdjacentHTML('beforeend','<h3>Scripture Journey completions</h3>'+(journeyCompletions.length?'<ol>'+journeyCompletions.slice().reverse().map(date=>'<li>'+escapeHtml(new Date(date).toLocaleString())+'</li>').join('')+'</ol>':'<p>No completed journeys yet.</p>'));if(type==='profile'){content.querySelector('h2').textContent='your profile';content.querySelector('h2').insertAdjacentHTML('afterend','<form id="profileForm"><label for="profileName">your name</label><input class="race-field" id="profileName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" type="submit">save name</button></form><p id="dataStatus" role="status" aria-live="polite"></p><h3>typing history</h3>');}if(type==='custom')content.innerHTML='<h2>custom text</h2><textarea id="customText" aria-label="Custom typing text"></textarea><button class="option" id="saveCustom">start test →</button>';if(type==='duration')content.innerHTML='<h2>custom duration</h2><form id="durationForm"><label for="durationSeconds">duration in seconds</label><input class="race-field" id="durationSeconds" type="number" min="1" max="3600" step="1" required><p>Choose 1–3600 seconds. The timer starts on your first keystroke.</p><button class="option" type="submit">apply duration →</button></form>';if(type==='commands')content.innerHTML='<h2>command line</h2><button class="option" id="restartCommand">↻ restart test</button><button class="option" data-open="themes">◐ theme</button><button class="option" data-open="settings">⚙ settings</button><button class="option" data-open="history">♛ history</button>';if(!$('#modal').open)$('#modal').showModal();if(type==='settings'||type==='profile')$('#profileName').value=getProfileName();if(type==='custom')$('#customText').value=custom;if(type==='duration'){$('#durationSeconds').value=limit;$('#durationSeconds').focus();$('#durationSeconds').select()}}document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.dialog)openModal(b.dataset.dialog);if(b.dataset.open)openModal(b.dataset.open);if(b.dataset.theme){theme(b.dataset.theme);$('#modal').close()}if(b.id==='saveCustom'){custom=$('#customText').value.trim()||custom;$('#modal').close();reset();input.focus()}if(b.id==='fontSize'){$('#words').style.fontSize=$('#words').style.fontSize==='24px'?'29px':'24px';positionCaret(false)}if(b.id==='restartCommand'){$('#modal').close();restartTest()}});$('.close').onclick=()=>$('#modal').close();$('#modal').onclick=e=>{if(e.target===$('#modal'))$('#modal').close()};document.addEventListener('keydown',e=>{if($('#leaveRaceDialog').open)return;if(e.key==='Escape'&&!$('#modal').open){e.preventDefault();openModal('commands');return}if(e.key==='Enter'&&document.activeElement?.id==='restart'){e.preventDefault();restartTest();return}if(e.key==='Tab'&&!$('#modal').open){if(!e.shiftKey&&document.activeElement===input&&!window.friendRace?.active){e.preventDefault();$('#restart').focus()}else if(e.shiftKey&&document.activeElement===$('#restart')){e.preventDefault();input.focus()}return}if(!$('#modal').open&&!done&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&document.activeElement!==input){input.focus()}});try{theme(localStorage.getItem('logostype-theme')||'serika dark')}catch{}reset();input.focus();

document.addEventListener('submit',e=>{if(e.target.id!=='durationForm')return;e.preventDefault();const field=$('#durationSeconds');if(!field.reportValidity())return;const seconds=Number(field.value);if(!Number.isInteger(seconds)||seconds<1||seconds>3600)return;limit=seconds;$('#modal').close();reset();input.focus()});

window.addEventListener('resize',()=>positionCaret(false));document.fonts?.ready.then(()=>positionCaret(false));

$('#book').onclick=()=>{if(window.friendRace?.active){window.friendRace.requestLeave(enterBook);return;}enterBook()};
input.disabled=true;
$('#friends').disabled=true;
$('#counter').textContent='loading RcV text…';
async function loadScripture(){
  if(typeof scriptureText!=='string')throw new Error('Missing scripture-text.js. Keep it alongside index.html');
  const lines=scriptureText.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.replace(/\p{P}/gu,'').trim());
  if(scriptureReferences.length!==lines.length)throw new Error(`Scripture verse count mismatch: expected ${scriptureReferences.length}, received ${lines.length}`);
  return lines;
}
loadScripture()
  .then(lines=>{
    scriptureLines=lines;
    scriptureWordTotals=[0];
    for(const line of scriptureLines)scriptureWordTotals.push(scriptureWordTotals[scriptureWordTotals.length-1]+line.split(/\s+/).filter(word=>/[\p{L}\p{N}]/u.test(word)).length);
    bookProgress=Math.min(bookProgress,scriptureLines.length);
    $('#friends').disabled=false;
    reset();input.focus();
  })
  .catch(error=>{
    $('#counter').textContent=`Scripture unavailable: ${error.message}. Reload to try again.`;
    console.error(error);
  });
