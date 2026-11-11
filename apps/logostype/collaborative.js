// Collaborative records are independent of personal journeys and typing history.
(() => {
  const key = 'logostype-collaborative-journeys';
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, '0')).join('');
  function journeyCode() {
    let code = '';
    while (code.length < 8) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      for (const byte of bytes) if (byte < 234 && code.length < 8) code += String.fromCharCode(97 + byte % 26);
    }
    return code;
  }
  const bounds = scope => scope === '' ? {start: 0, end: scriptureReferences.length} : journeyBooks.find(b => b.name === scope);
  const validCode = code => typeof code === 'string' && /^(?:[a-z]{8}|[a-f0-9]{24})$/.test(code);
  function validate(value) {
    if (!Array.isArray(value) || value.length > 200) throw Error('Invalid collaborative journeys.');
    return value.map(j => {
      if (!j || !validCode(j.id) || typeof j.title !== 'string' || !j.title.trim() || j.title.length > 80 || !bounds(j.scope) || !Array.isArray(j.entries) || j.entries.length > 100000) throw Error('Invalid collaborative journey.');
      const range = bounds(j.scope), seen = new Set();
      const entries = j.entries.map(e => {
        if (!e || !/^[a-f0-9]{24}$/.test(e.id) || seen.has(e.id) || !Number.isInteger(e.verse) || e.verse < range.start || e.verse >= range.end || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 24 || !Number.isFinite(Date.parse(e.at))) throw Error('Invalid collaborative contribution.');
        seen.add(e.id);
        return {id:e.id, verse:e.verse, name:e.name, at:new Date(e.at).toISOString()};
      });
      return {id:j.id, title:j.title, scope:j.scope, entries};
    });
  }
  let records = [], current = null, peer = null, host = false, links = new Map(), verse = null;
  try { records = validate(JSON.parse(localStorage.getItem(key) || '[]')); } catch {}
  const dialog = document.createElement('main');
  dialog.id = 'collaborativeContent';
  dialog.hidden = true;
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'collaborativeTitle');
  dialog.innerHTML = `<h1 id="collaborativeTitle">Create or join a collaboration</h1>
    <p class="cj-intro">Type Scripture together. Shared progress stays separate from your personal journeys.</p>
    <label class="cj-name-field">Your name <input id="cjName" maxlength="24" placeholder="Enter your name" autocomplete="nickname" aria-describedby="cjNameHint"></label>
    <p class="cj-help" id="cjNameHint">This name appears beside the verses you contribute.</p>
    <div class="cj-setup-grid">
      <form id="cjCreateForm" class="cj-setup-card">
        <h2>Create a collaboration</h2><p class="cj-help">Start a journey, then share its code with friends.</p>
        <label>Journey title <input id="cjTitle" maxlength="80" placeholder="Journey with your name"></label>
        <div class="cj-portion"><span id="cjScopeLabel">Scripture portion</span><button type="button" id="cjScope" class="journey-choice" aria-haspopup="dialog" aria-controls="cjScopeDialog" aria-labelledby="cjScopeLabel cjScope">entire Scriptures ▦</button></div>
        <button type="button" id="cjCreate" class="cj-action">Create collaboration</button>
      </form>
      <form id="cjJoinForm" class="cj-setup-card">
        <h2>Join a collaboration</h2><p class="cj-help">Enter the code shared by your friend.</p>
        <label>Journey code <input id="cjCode" placeholder="8-letter code" autocapitalize="none" maxlength="24" spellcheck="false" autocomplete="off"></label>
        <button type="button" id="cjJoin" class="cj-action">Join collaboration</button>
      </form>
    </div>
    <p class="cj-help cj-setup-note">You’ll go straight to Scripture Journey (menu 1). Find shared journeys under <strong>collaborations</strong> beside shuffle.</p>
    <p id="cjStatus" role="status" aria-live="polite"></p>
    <section id="cjWorkspace" hidden aria-label="Collaboration info">
      <div class="cj-info-top"><div><h3 id="cjHeading"></h3><p class="cj-info-caption" id="cjScopeInfo"></p></div><span id="cjProgress"></span></div>
      <div class="cj-invite"><span class="cj-info-caption">Invite friends</span>
        <div class="cj-info-row"><strong id="cjSharedCode" aria-label="Journey invitation code"></strong><button type="button" id="cjCopyCode">copy code</button><button type="button" id="cjConnection">reconnect</button></div>
        <p class="cj-info-caption">Share this code. Friends enter it in menu 3 to join.</p>
        <p id="cjCopyStatus" role="status" aria-live="polite" hidden></p>
      </div>
      <p id="cjConnectionStatus" role="status" aria-live="polite" hidden></p>
      <details class="cj-verse-picker"><summary>Choose a different verse</summary><div class="cj-info-row"><label>Verse <select id="cjVerse"></select></label><button type="button" id="cjNext">next unfinished verse</button></div><p class="cj-info-caption">Choose different verses to divide the work. ✓ means already completed.</p></details>
      <details><summary id="cjContributorSummary">Contributors</summary><div id="cjContributors"></div></details>
      <p id="cjFeedback" role="status" aria-live="polite"></p></section>`;
  document.querySelector('#readingContent').after(dialog);
  const workspace=dialog.querySelector('#cjWorkspace');
  document.querySelector('#bookProgress').before(workspace);
  const el = id => document.querySelector('#cj' + id);
  let selected=false, sharedShuffle=false, infoExpanded=false;
  let autoSync=true, syncRetry=null, connectTimeout=null;
  const infoButton=document.querySelector('#collaborationInfo');
  function syncInfo() {
    const active=!!current && currentMenu==='collaborative';
    infoButton.hidden=!active;
    infoButton.setAttribute('aria-expanded',String(active && infoExpanded));
    infoButton.textContent='collaboration info '+(infoExpanded?'▴':'▾');
    workspace.hidden=!active || !infoExpanded;
  }
  infoButton.onclick=()=>{infoExpanded=!infoExpanded;syncInfo();};
  const picker=document.createElement('dialog');
  picker.id='collaborationsDialog';
  picker.setAttribute('aria-labelledby','collaborationsTitle');
  picker.innerHTML='<button type="button" class="close" aria-label="Close collaborations">×</button><h2 id="collaborationsTitle">collaborations</h2><div id="cjSaved"></div>';
  document.body.append(picker);
  picker.querySelector('.close').onclick=()=>picker.close();
  document.querySelector('#chooseCollaborations').onclick=()=>{refreshSaved();picker.showModal();};
  const status = (message, warning=false) => { el('Status').textContent = message; el('ConnectionStatus').textContent=warning?message:''; el('ConnectionStatus').hidden=!warning; };
  function syncConnection() {
    el('Connection').textContent=peer?'disconnect':'reconnect';
    el('Connection').title=peer?'Stop syncing; your progress stays saved on this device.':'Reconnect to sync saved contributions.';
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(records)); return true; }
    catch { status('Could not save shared progress. Export a backup before closing this tab.',true); return false; }
  }
  function merge(incoming) {
    const clean = validate(incoming);
    const merged = validate(records);
    for (const j of clean) {
      const old = merged.find(r => r.id === j.id);
      if (old) {
        if (old.scope !== j.scope || old.title !== j.title) throw Error('Journey details do not match.');
        const entries = new Map(old.entries.map(e => [e.id, e]));
        for (const e of j.entries) if (!entries.has(e.id)) entries.set(e.id, e);
        old.entries = [...entries.values()].sort((a,b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
      } else merged.push(j);
    }
    records = validate(merged);
    if (current) current=records.find(j=>j.id===current.id)||current;
    save(); refreshSaved(); paint();
  }
  function refreshSaved() {
    const list=el('Saved'); list.replaceChildren();
    if(!records.length) {
      const link=document.createElement('a');link.href='#collaborative';link.className='collaboration-create-link';link.textContent='Create or join a collaboration';
      link.onclick=event=>{event.preventDefault();picker.close();document.querySelector('#collaborative').click();};
      list.append(link);return;
    }
    for(const j of records) {
      const button=document.createElement('button');button.type='button';button.className='collaboration-choice';
      button.textContent=j.title+' · '+(j.scope||'entire Scriptures')+' · '+new Set(j.entries.map(e=>e.verse)).size+' verses';
      button.setAttribute('aria-pressed',String(selected&&current?.id===j.id));
      button.onclick=()=>{picker.close();if(current?.id!==j.id)select(j);selected=true;openJourney();};list.append(button);
    }
  }
  function paint() {
    syncInfo();syncConnection();
    if (!current) return;
    const range = bounds(current.scope), completed = new Set(current.entries.map(e => e.verse));
    if(el('SharedCode').textContent!==current.id)el('CopyStatus').hidden=true;
    el('SharedCode').textContent=current.id;
    el('Heading').textContent = current.title;
    el('ScopeInfo').textContent=current.scope||'entire Scriptures';
    el('Progress').textContent = `${completed.size} / ${range.end-range.start} verses completed · ${(completed.size/(range.end-range.start)*100).toFixed(2)}%`;
    // Preserve an in-progress verse when a friend completes it concurrently.
    if (verse === null || verse < range.start || verse > range.end) verse = Array.from({length:range.end-range.start}, (_,i) => range.start+i).find(i => !completed.has(i)) ?? range.end;
    const select = el('Verse');
    select.replaceChildren(...Array.from({length:range.end-range.start}, (_,i) => { const n=range.start+i; return new Option(scriptureReferences[n]+(completed.has(n)?' ✓':''), n); }));
    select.value = verse;
    const groups = new Map();
    for (const e of current.entries) { if (!groups.has(e.name)) groups.set(e.name, []); groups.get(e.name).push(e); }
    el('ContributorSummary').textContent='Contributors ('+groups.size+')';
    el('Contributors').replaceChildren(...[...groups].map(([name, entries]) => {
      const section=document.createElement('details'), summary=document.createElement('summary'), list=document.createElement('ul');
      summary.textContent=name+' · '+entries.length+' contribution(s)';
      for (const e of entries) { const li=document.createElement('li'); li.textContent=scriptureReferences[e.verse]+' · '+new Date(e.at).toLocaleString(); list.append(li); }
      section.append(summary,list); return section;
    }));
    if(!groups.size){const note=document.createElement('p');note.className='cj-info-caption';note.textContent='No contributions yet. Complete a verse to add your name here.';el('Contributors').append(note);}
  }
  function disconnect() {
    clearTimeout(syncRetry);clearTimeout(connectTimeout);syncRetry=null;
    const previous=peer;peer=null;links.clear();previous?.destroy();
    syncConnection();status('Offline · progress is saved on this device.');
  }
  function scheduleSync() {
    if(!autoSync || !current || peer || syncRetry)return;
    syncRetry=setTimeout(()=>{syncRetry=null;startSync();},4000+Math.random()*2000);
  }
  function startSync() {
    if(!autoSync || !current || peer || navigator.onLine===false)return;
    el('Code').value=current.id;
    el('Name').value=el('Name').value.trim()||getProfileName()||'typist';
    connect(true,true);
  }
  window.addEventListener('online',startSync);
  function select(j) { if(currentMenu==='collaborative')pauseMenu(); disconnect(); current=j;autoSync=true;host=true;selected=true;infoExpanded=false; verse=null; menuStates.delete('collaborative'); el('Feedback').textContent=''; el('Code').value=j.id; refreshSaved(); paint(); refreshTyping(); }
  function send(connection) { if(connection.open && current) connection.send({type:'journey', journey:current}); }
  function publish() { for(const c of links.values()) send(c); }
  function connect(asHost, automatic=false) {
    const code=el('Code').value.trim().toLowerCase();
    if (!validCode(code)) return status('Enter the eight-letter journey code. Older 24-character codes also work.');
    if (asHost && (!current || current.id !== code)) return status('Open the saved journey before hosting it.');
    if (!el('Name').value.trim()) return status('Enter your contributor name.');
    if (typeof Peer === 'undefined') return status('Connection service is unavailable. Try again later.');
    disconnect();autoSync=true; host=asHost; status('Connecting…');
    const attempt=new Peer(asHost?'logostype-journey-'+code:undefined); peer=attempt;syncConnection();
    connectTimeout=setTimeout(()=>{
      if(peer!==attempt)return;
      disconnect();status('Working offline. Saved progress will sync when a connection is available.',true);
      if(current?.id===code)scheduleSync();
    },12000);
    attempt.on('error', error => {
      if(peer!==attempt)return;
      disconnect();
      if(automatic && asHost && error.type==='unavailable-id'){connect(false,true);return;}
      status('Working offline. Saved progress will sync when a connection is available.',true);
      if(current?.id===code)scheduleSync();
    });
    attempt.on('disconnected',()=>{if(peer!==attempt)return;disconnect();scheduleSync();});
    function wire(c) {
      let receivedInitial = false;
      c.on('open',()=>{
        if(peer!==attempt)return c.close();
        if(links.size>=16)return c.close();
        links.set(c.peer,c); status(asHost?'Hosting · share this journey code: '+code:'Connected · progress syncs while the host stays online.');
        if(current?.id===code)send(c);
      });
      c.on('data', data=>{
        if(peer!==attempt || data?.type!=='journey' || data.journey?.id!==code)return;
        try {
          merge([data.journey]);
          clearTimeout(connectTimeout);
          const changedJourney=current?.id!==code;
          if(changedJourney) { verse=null; infoExpanded=false; menuStates.delete('collaborative'); }
          current=records.find(j=>j.id===code); el('Code').value=code; paint();
          if(changedJourney)refreshTyping();
          else if(currentMenu==='collaborative'){updateBookProgress();renderBookContext();}
          selected=true;
          if(host)publish();
          else if(!receivedInitial) { receivedInitial=true; send(c); if(!automatic||currentMenu==='collaborationSetup')openJourney(); }
        } catch { status('Received invalid journey data; it was ignored.',true); }
      });
      c.on('close',()=>{if(peer!==attempt)return;links.delete(c.peer); if(!host){disconnect();scheduleSync();}});
      c.on('error',()=>{if(peer!==attempt)return;if(!host){disconnect();scheduleSync();}status('Connection interrupted. Saved progress will sync after reconnecting.',true);});
    }
    attempt.on('open',()=>{ if(peer!==attempt)return; if(asHost){clearTimeout(connectTimeout);status('Hosting · share this journey code: '+code);} else wire(attempt.connect('logostype-journey-'+code,{reliable:true})); });
    attempt.on('connection',c=>{ if(asHost)wire(c); else c.close(); });
  }
  let chosenScope = '';
  const portionDialog = document.createElement('dialog');
  portionDialog.id = 'cjScopeDialog';
  portionDialog.setAttribute('aria-labelledby', 'cjScopeTitle');
  portionDialog.innerHTML = '<button type="button" class="close" aria-label="Close portion picker">×</button><h2 id="cjScopeTitle">Choose a portion</h2><p class="testament-legend"><span class="old-testament">Old Testament</span><span class="new-testament">New Testament</span></p><div class="journey-grid" role="group" aria-labelledby="cjScopeTitle"></div>';
  const grid = portionDialog.querySelector('.journey-grid');
  ['', ...journeyBooks.map(b=>b.name)].forEach((name, index)=>{
    const button = document.createElement('button');
    button.type='button';
    button.textContent=name||'entire Scriptures';
    button.className=name?(index<=39?'old-testament':'new-testament'):'entire-journey';
    button.dataset.scope=name;
    button.setAttribute('aria-pressed', String(name===chosenScope));
    button.onclick=()=>{
      chosenScope=name;
      el('Scope').textContent=(name||'entire Scriptures')+' ▦';
      for(const choice of grid.children) choice.setAttribute('aria-pressed', String(choice===button));
      portionDialog.close();
    };
    grid.append(button);
  });
  document.body.append(portionDialog);
  portionDialog.querySelector('.close').onclick=()=>portionDialog.close();
  portionDialog.addEventListener('close',()=>el('Scope').focus());
  el('Scope').onclick=()=>{portionDialog.showModal();grid.querySelector('[aria-pressed="true"]').focus();};
  el('Create').onclick=()=>{
    if(!el('Name').value.trim())return status('Enter your contributor name.');
    const title=el('Title').value.trim(); if(!title)return status('Enter a journey title.');
    let code; do {code=journeyCode();} while(records.some(j=>j.id===code));
    const j={id:code,title,scope:chosenScope,entries:[]}; records.push(j); select(j); save(); connect(true,true); openJourney();
  };
  el('Connection').onclick=()=>{if(peer||syncRetry){autoSync=false;disconnect();}else {autoSync=true;startSync();}};
  el('CopyCode').onclick=async()=>{
    if(!current)return;
    const code=current.id;
    try {await navigator.clipboard.writeText(code);el('CopyStatus').textContent='Code copied.';}
    catch {el('CopyStatus').textContent='Select the code above and copy it to share.';}
    el('CopyStatus').hidden=false;
  };
  el('Join').onclick=()=>connect(false);
  el('CreateForm').onsubmit=event=>{event.preventDefault();el('Create').click();};
  el('JoinForm').onsubmit=event=>{event.preventDefault();el('Join').click();};
  function chooseVerse(index=null) {
    verse=index;
    el('Feedback').textContent='';
    refreshTyping();
    paint();
    input.focus();
  }
  el('Verse').onchange=()=>chooseVerse(Number(el('Verse').value));
  el('Next').onclick=()=>chooseVerse();
  function unmount() { workspace.hidden=true;infoButton.hidden=true;infoButton.setAttribute('aria-expanded','false'); }
  function mount() { syncInfo(); }
  function journey() {
    if(!current)return null;
    const range=bounds(current.scope), verses=[...new Set(current.entries.map(e=>e.verse))];
    const completed=new Set(verses);
    let progress=0;
    while(completed.has(range.start+progress)&&range.start+progress<range.end)progress++;
    return {...range,name:current.title,scope:current.scope,progress,verses,completions:[],collaborative:true};
  }
  function position() {
    const j=journey(); if(!j)return 0;
    if(verse!==null && verse>=j.start && verse<j.end)return verse;
    const completed=new Set(j.verses);
    const remaining=[];
    for(let index=j.start;index<j.end;index++)if(!completed.has(index))remaining.push(index);
    if(remaining.length)return verse=remaining[sharedShuffle?Math.floor(Math.random()*remaining.length):0];
    return j.end;
  }
  function refreshTyping() {
    if(currentMenu!=='collaborative')return;
    mount();
    if(current){mode='book';reset();}
  }
  function historyInfo() {
    return {collaborationId:current.id,journey:current.title,contributor:(el('Name').value.trim()||getProfileName()||'typist').slice(0,24)};
  }
  function contribute(index) {
    if(!current)return;
    const name=el('Name').value.trim()||getProfileName()||'typist';
    current.entries.push({id:uid(),verse:index,name:name.slice(0,24),at:new Date().toISOString()});
    verse=null;
    save();publish();paint();
    el('Feedback').textContent='Verse contributed. Thank you!';
  }
  let automaticTitle = '';
  function updateDefaultTitle() {
    const name=el('Name').value.trim()||getProfileName()||'typist';
    const next='Journey with '+name;
    if(!el('Title').value.trim()||el('Title').value===automaticTitle)el('Title').value=next;
    automaticTitle=next;
  }
  el('Name').addEventListener('input',updateDefaultTitle);
  function openJourney() {
    if(!current)return;
    selected=true;
    startSync();
    switchTypingMenu('collaborative');
    mount();paint();updateBookProgress();syncNavigation();render(false);input.focus();
  }
  function open() {
    if(currentMenu!=='collaborationSetup')pauseMenu();
    currentMenu='collaborationSetup';
    setReadingView(false);
    document.body.classList.remove('race-lobby-open');
    document.body.classList.add('collaborative-mode');
    document.querySelector('#raceLobby').hidden=true;
    document.querySelector('#typingContent').hidden=true;
    dialog.hidden=false;
    el('Name').value=el('Name').value||getProfileName()||'';
    updateDefaultTitle();refreshSaved();paint();updateBookProgress();syncNavigation();
    dialog.focus({preventScroll:true});
  }
  document.querySelector('#collaborative').onclick=()=>{
    if(window.friendRace?.active) { window.friendRace.requestLeave(open); return; }
    open();
  };
  window.collaborativeJourneys={open,openJourney,selected:()=>selected,personal:()=>{selected=false;},shuffle:()=>sharedShuffle,toggleShuffle:()=>{sharedShuffle=!sharedShuffle;verse=null;},journey,position,contribute,historyInfo,unmount,refreshTyping,export:()=>JSON.parse(JSON.stringify(records)),validate,import:merge,clear:()=>{autoSync=false;disconnect();records=[];current=null;selected=false;verse=null;refreshSaved();paint();}};
})();
