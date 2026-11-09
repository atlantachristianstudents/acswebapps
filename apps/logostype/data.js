function validateHistoryChart(chart){
  const fields=['samples','instantSamples','rawSamples','sampleTimes'];
  if(!chart||fields.some(field=>!Array.isArray(chart[field])||chart[field].length>1000000||chart[field].some(value=>!Number.isFinite(value)||value<0))||fields.some(field=>chart[field].length!==chart.samples.length)||!Array.isArray(chart.mistakeEvents)||chart.mistakeEvents.length>1000000||chart.mistakeEvents.some(event=>!event||!Number.isFinite(event.time)||event.time<0||!Number.isFinite(event.wpm)||event.wpm<0))throw new Error('The backup contains invalid chart data.');
  if(chart.sampleTimes.some((time,index)=>index>0&&time<chart.sampleTimes[index-1]))throw new Error('The backup contains invalid chart times.');
  return {samples:[...chart.samples],instantSamples:[...chart.instantSamples],rawSamples:[...chart.rawSamples],sampleTimes:[...chart.sampleTimes],mistakeEvents:chart.mistakeEvents.map(event=>({time:event.time,wpm:event.wpm}))};
}
function validateAttemptReplay(replay){
  const invalid=()=>{throw new Error('The backup contains invalid replay data.')};
  if(!replay||typeof replay.target!=='string'||!replay.target.length||replay.target.length>1000000||typeof replay.rawTarget!=='string'||replay.rawTarget.length>1000000||!Number.isFinite(replay.durationMs)||replay.durationMs<0||!Array.isArray(replay.events)||replay.events.length>1000000||!Array.isArray(replay.references)||replay.references.length>100000||replay.references.some(reference=>!scriptureReferences.includes(reference))||!Array.isArray(replay.sourceRanges)||replay.sourceRanges.length>100000)invalid();
  let length=0,previous=0;
  const events=replay.events.map(event=>{
    if(!event||!Number.isFinite(event.time)||event.time<previous||event.time>replay.durationMs||!Number.isInteger(event.at)||event.at<0||event.at>length||!Number.isInteger(event.remove)||event.remove<0||event.remove>length-event.at||typeof event.text!=='string')invalid();
    length=length-event.remove+event.text.length;
    if(length>1000000)invalid();
    previous=event.time;
    return {time:event.time,at:event.at,remove:event.remove,text:event.text};
  });
  const sourceRanges=replay.sourceRanges.map(source=>{
    if(!source||!scriptureReferences.includes(source.reference)||!Number.isInteger(source.start)||source.start<0||source.start>replay.target.length)invalid();
    return {reference:source.reference,start:source.start};
  });
  return {target:replay.target,rawTarget:replay.rawTarget,durationMs:replay.durationMs,events,references:[...replay.references],sourceRanges};
}
function validateRaceReplay(data){
  if(!data||!Array.isArray(data.participants)||data.participants.length<1||data.participants.length>8)throw new Error('Invalid race replay participants.');
  const ids=new Set();
  const participants=data.participants.map(player=>{
    if(!player||typeof player.id!=='string'||player.id.length>100||ids.has(player.id)||typeof player.name!=='string'||player.name.length>150||!Number.isFinite(player.wpm)||player.wpm<0||!Number.isFinite(player.accuracy)||player.accuracy<0||player.accuracy>100||(player.place!==null&&(!Number.isInteger(player.place)||player.place<1||player.place>8))||(player.completed!==undefined&&typeof player.completed!=='boolean')||typeof player.gaveUp!=='boolean'||(player.finishMs!==null&&(!Number.isFinite(player.finishMs)||player.finishMs<0)))throw new Error('Invalid race replay result.');
    ids.add(player.id);
    const replay=player.replay?validateAttemptReplay(player.replay):null;
    let completed=player.completed;
    if(completed===undefined){
      let value='';
      if(replay)for(const event of replay.events)value=value.slice(0,event.at)+event.text+value.slice(event.at+event.remove);
      completed=!!replay&&parseTyping(value,false,replay.target).text.length>=replay.target.length;
    }
    completed=completed&&!player.gaveUp;
    return {id:player.id,name:player.name,wpm:player.wpm,accuracy:player.accuracy,place:completed?player.place:null,completed,gaveUp:player.gaveUp,finishMs:player.finishMs,replay};
  });
  return {participants};
}
function getProfileName(){
  try{return (localStorage.getItem('logostype-racer')||'').trim().slice(0,24)}catch{return ''}
}
function updateProfileLabel(){
  if($('#profileJoined'))$('#profileJoined').textContent=profileJoinedLabel();
  const name=getProfileName();
  $('.account').title=name?`${name} · settings and profile`:'Settings and profile';
  $('.account').setAttribute('aria-label',$('.account').title);
}
function dataStatus(message){
  if(!$('#dataStatus'))openModal('settings');
  $('#dataStatus').textContent=message;
}
function validateBackup(data){
  if(!data||data.format!=='logostype-backup'||data.version!==1)throw new Error('Choose a Logostype JSON backup (version 1).');
  if(!Number.isSafeInteger(data.bookProgress)||data.bookProgress<0||data.bookProgress>scriptureReferences.length)throw new Error('The backup has invalid Scripture Journey progress.');
  if(!Array.isArray(data.history))throw new Error('The backup has invalid typing history.');
  if(data.replayRetentionLimit!==undefined&&(!Number.isSafeInteger(data.replayRetentionLimit)||data.replayRetentionLimit<0||data.replayRetentionLimit>1000000))throw new Error('Invalid replay retention.');
  const modes=['time','words','quote','custom','book'];
  const history=data.history.map(item=>{
    if(!item||!Number.isFinite(item.wpm)||item.wpm<0||!Number.isFinite(item.accuracy)||item.accuracy<0||item.accuracy>100||!modes.includes(item.mode)||!Number.isInteger(item.limit)||item.limit<1||item.limit>3600||typeof item.date!=='string'||item.date.length>100)throw new Error('The backup contains an invalid typing result.');
    const result={wpm:item.wpm,accuracy:item.accuracy,mode:item.mode,limit:item.limit,date:item.date};
    for(const key of ['punctuation','capitalization']){
      if(item[key]!==undefined){
        if(typeof item[key]!=='boolean')throw new Error('The backup has invalid typing settings.');
        result[key]=item[key];
      }
    }
    if(item.customPreset!==undefined){
      if(item.mode!=='custom'||item.customPreset!=='default')throw new Error('The backup has an invalid custom text preset.');
      result.customPreset=item.customPreset;
    }
    if(item.rawWpm!==undefined){
      if(!Number.isFinite(item.rawWpm)||item.rawWpm<0)throw new Error('The backup contains an invalid raw WPM.');
      result.rawWpm=item.rawWpm;
    }
    if(item.id!==undefined){
      if(typeof item.id!=='string'||item.id.length>100)throw new Error('The backup contains an invalid result identifier.');
      result.id=item.id;
    }
    if(item.reference!==undefined){
      if(item.mode!=='book'||!scriptureReferences.includes(item.reference))throw new Error('The backup contains an invalid verse reference.');
      result.reference=item.reference;
    }
    if(item.journey!==undefined){
      if(item.mode!=='book'||(item.journey!=='Entire Scriptures'&&!journeyBooks.some(book=>book.name===item.journey)))throw new Error('The backup contains an invalid journey name.');
      result.journey=item.journey;
    }
    if(item.chart!==undefined)result.chart=validateHistoryChart(item.chart);
    if(item.replay!==undefined)result.replay=validateAttemptReplay(item.replay);
    if(item.raceReplay!==undefined)result.raceReplay=validateRaceReplay(item.raceReplay);
    return result;
  });
  if(data.name!==undefined&&(typeof data.name!=='string'||data.name.length>24))throw new Error('The backup has an invalid name.');
  let themeName, themeColors;
  if(data.theme!==undefined){
    if(typeof data.theme!=='string'||(data.theme!=='custom'&&!Object.hasOwn(themes,data.theme)))throw new Error('The backup has an invalid theme.');
    themeName=data.theme;
  }
  if(data.customThemeColors!==undefined){
    const colors=data.customThemeColors;
    if(!colors||!Object.keys(defaultThemeColors).every(key=>typeof colors[key]==='string'&&/^#[0-9a-f]{6}$/i.test(colors[key])))throw new Error('The backup has invalid custom theme colors.');
    themeColors=Object.fromEntries(Object.keys(defaultThemeColors).map(key=>[key,colors[key]]));
  }
  if(themeName==='custom'&&!themeColors)throw new Error('The backup is missing custom theme colors.');
  let completedAt=null;
  if(data.journeyCompletedAt!=null){
    if(typeof data.journeyCompletedAt!=='string'||!Number.isFinite(Date.parse(data.journeyCompletedAt))||data.bookProgress!==scriptureReferences.length)throw new Error('The backup has an invalid journey completion date.');
    completedAt=new Date(data.journeyCompletedAt).toISOString();
  }
  const completions=data.journeyCompletions??[];
  if(!Array.isArray(completions)||completions.some(value=>typeof value!=='string'||!Number.isFinite(Date.parse(value))))throw new Error('The backup has invalid journey completion history.');
  return {journeyShuffled:typeof validateJourneyShuffled === "function" ? validateJourneyShuffled(data.journeyShuffled??{}) : {},replayRetentionLimit:data.replayRetentionLimit,journeyDates:validateJourneyDates(data.journeyDates??{}),theme:themeName,customThemeColors:themeColors,journeyAttempts:validateJourneyAttempts(data.journeyAttempts??[]),bookJourneys:validateBookJourneys(data.bookJourneys??{}),bookProgress:data.bookProgress,history,name:data.name,journeyCompletedAt:completedAt,journeyCompletions:[...new Set([...completions.map(value=>new Date(value).toISOString()),...(completedAt?[completedAt]:[])])].sort()};
}
function historyKey(item){
  return item.id?'id:'+item.id:JSON.stringify([item.date,item.mode,item.limit,item.wpm,item.accuracy,item.rawWpm??null,item.reference??null,item.journey??null]);
}
function mergeTypingHistory(existing,incoming){
  // Preserve multiple identical sessions within a backup while avoiding duplicates on repeated imports.
  const counts=new Map(),positions=new Map();
  existing.forEach((item,index)=>{const key=historyKey(item);counts.set(key,(counts.get(key)||0)+1);if(!positions.has(key))positions.set(key,[]);positions.get(key).push(index);});
  const result=[...existing],seen=new Map();
  for(const item of incoming){
    const key=historyKey(item),count=(seen.get(key)||0)+1;seen.set(key,count);
    if(count>(counts.get(key)||0))result.push(item);
    else{
      const index=positions.get(key)[count-1],local=result[index];
      for(const field of ['replay','raceReplay'])if(!local[field]&&item[field])result[index]={...result[index],[field]:item[field]};
    }
  }
  return result;
}
function importBackup(data){
  if(window.friendRace?.active)throw new Error('Leave the race room before importing a backup.');
  checkpointJourneyAttempt();
  const backup=validateBackup(data);
  const retainedLimit=0;
  const merged=applyReplayRetention(mergeTypingHistory(history,backup.history),retainedLimit);
  const mergedJourneyDates=mergeJourneyDates(journeyDates,backup.journeyDates);
  const attemptsById=new Map(journeyAttempts.map(item=>[item.id,item]));
  for(const item of backup.journeyAttempts){
    const local=attemptsById.get(item.id);
    if(local&&(local.journey!==item.journey||local.reference!==item.reference))throw new Error('Conflicting journey attempt in backup.');
    if(!local)attemptsById.set(item.id,item);
    else attemptsById.set(item.id,{...local,typingMs:local.typingMs??item.typingMs,elapsedMs:Math.max(local.elapsedMs??local.typingMs??0,item.elapsedMs)});
  }
  const mergedAttempts=[...attemptsById.values()];
  // Compare progress within the latest journey; a restarted journey supersedes an older completed one.
  const localCount=journeyCompletions.length,incomingCount=backup.journeyCompletions.length;
  const sameCompletedJourney=localCount>0&&localCount===incomingCount&&journeyCompletions.every((date,index)=>date===backup.journeyCompletions[index]);
  const restarted=sameCompletedJourney&&(bookProgress===scriptureReferences.length||backup.bookProgress===scriptureReferences.length);
  const progress=incomingCount>localCount?backup.bookProgress:localCount>incomingCount?bookProgress:restarted?Math.min(bookProgress,backup.bookProgress):Math.max(bookProgress,backup.bookProgress);
  const name=backup.name===undefined?getProfileName():backup.name.trim();
  const completions=[...new Set([...journeyCompletions,...backup.journeyCompletions])].sort();
  const completedAt=progress===scriptureReferences.length?(completions[completions.length-1]||null):null;
  const mergedBooks=validateBookJourneys(bookJourneys);
  for(const [name,incoming] of Object.entries(backup.bookJourneys)){
    const local=mergedBooks[name];
    if(!local){mergedBooks[name]=incoming;continue}
    const size=journeyBooks.find(book=>book.name===name);
    const same=JSON.stringify(local.completions)===JSON.stringify(incoming.completions);
    const progress=incoming.completions.length>local.completions.length?incoming.progress:local.completions.length>incoming.completions.length?local.progress:same&&local.completions.length&&(local.progress===size.end-size.start||incoming.progress===size.end-size.start)?Math.min(local.progress,incoming.progress):Math.max(local.progress,incoming.progress);
    mergedBooks[name]={progress,completions:[...new Set([...local.completions,...incoming.completions])].sort()};
  }
  const mergedShuffled={...journeyShuffled};
  for(const [name,state] of Object.entries(backup.journeyShuffled)) {
    const local=mergedShuffled[name];
    mergedShuffled[name]=local?.cycle===state.cycle?{cycle:state.cycle,verses:[...new Set([...local.verses,...state.verses])]}:!local||(state.cycle||'')>(local.cycle||'')?state:local;
  }
  const keys=['logostype-history','logostype-book-progress','logostype-racer','logostype-journey-completed-at','logostype-journey-completions','logostype-book-journeys','logostype-journey-attempts','logostype-theme','logostype-custom-colors','logostype-journey-dates','logostype-replay-limit','logostype-journey-shuffled'];
  const previous=keys.map(key=>localStorage.getItem(key));
  try{
    localStorage.setItem(keys[0],JSON.stringify(merged));
    localStorage.setItem(keys[1],String(progress));
    localStorage.setItem(keys[2],name);
    if(completedAt)localStorage.setItem(keys[3],completedAt);else localStorage.removeItem(keys[3]);
    localStorage.setItem(keys[4],JSON.stringify(completions));
    localStorage.setItem(keys[5],JSON.stringify(mergedBooks));
    localStorage.setItem(keys[6],JSON.stringify(mergedAttempts));
    if(backup.theme!==undefined)localStorage.setItem(keys[7],backup.theme);
    if(backup.customThemeColors!==undefined)localStorage.setItem(keys[8],JSON.stringify(backup.customThemeColors));
    localStorage.setItem(keys[9],JSON.stringify(mergedJourneyDates));
    localStorage.setItem(keys[10],String(retainedLimit));
    localStorage.setItem(keys[11],JSON.stringify(mergedShuffled));
  }catch(error){
    keys.forEach((key,i)=>{try{if(previous[i]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[i])}catch{}});
    throw new Error('Could not save the backup. Browser storage may be full.');
  }
  const added=merged.length-history.length;
  journeyShuffled=mergedShuffled;shuffledPosition=null;
  journeyAttempts=mergedAttempts;journeyDates=mergedJourneyDates;replayRetentionLimit=retainedLimit;
  bookJourneys=mergedBooks;history=merged;bookProgress=progress;journeyCompletedAt=completedAt;journeyCompletions=completions;
  if(backup.customThemeColors!==undefined)customThemeColors=backup.customThemeColors;
  if(backup.theme!==undefined)theme(backup.theme);
  else if(backup.customThemeColors!==undefined)theme(document.documentElement.dataset.theme);
  updateProfileLabel();
  if(mode==='book')reset();
  if($('#profileName'))$('#profileName').value=name;
  return added;
}
const backupInput=document.createElement('input');
backupInput.type='file';backupInput.accept='.json,application/json';backupInput.hidden=true;
document.body.append(backupInput);
backupInput.addEventListener('change',async()=>{
  const file=backupInput.files[0];if(!file)return;
  try{
    const added=importBackup(JSON.parse(await file.text()));
    dataStatus(`Imported ${added} typing result${added===1?'':'s'}. Scripture Journey: ${bookProgress.toLocaleString()} verses completed.`);
  }catch(error){dataStatus(error instanceof SyntaxError?'Could not read the backup. Choose a valid JSON file.':error.message)}
  finally{backupInput.value=''}
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='clearData'){
    if(window.friendRace?.active){dataStatus('Leave the race room before clearing saved data.');return}
    $('#clearDataDialog').showModal();
  }
  if(button.id==='cancelClearData')$('#clearDataDialog').close();
  if(button.id==='confirmClearData'){
    if(!$('#clearDataDialog').open)return;
    $('#clearDataDialog').close();
    if(window.friendRace?.active){dataStatus('Leave the race room before clearing saved data.');return}
    try{
      const keys=Object.keys(localStorage).filter(key=>key.startsWith('logostype-'));
      const previous=keys.map(key=>localStorage.getItem(key));
      try{keys.forEach(key=>localStorage.removeItem(key))}catch(error){
        keys.forEach((key,index)=>{try{localStorage.setItem(key,previous[index])}catch{}});throw error;
      }
      clearInterval(timer);timer=null;activeJourneyAttempt=null;
      menuStates.clear();currentMenu="journey";setReadingView(false);custom=defaultCustomText;selectedTestVerse=null;history=[];journeyShuffled={};journeyShuffle=false;shuffledPosition=null;$("#shuffleJourney").setAttribute("aria-pressed","false");bookProgress=0;bookJourneys={};journeyAttempts=[];journeyCompletedAt=null;journeyCompletions=[];journeyDates={};replayRetentionLimit=0;historyStorageMessage='';selectedJourneyBook='';
      customThemeColors={...defaultThemeColors};theme('serika dark');localStorage.removeItem('logostype-theme');
      updateProfileLabel();reset();openModal('settings');
      dataStatus('Saved data cleared.');
    }catch{dataStatus('Could not clear saved data in this browser. Please try again.')}
  }
  if(button.id==='importData'){
    if(window.friendRace?.active){dataStatus('Leave the race room before importing a backup.');return}
    backupInput.click();
  }
  if(button.id==='exportData'){
    checkpointJourneyAttempt();
    const backup={format:'logostype-backup',version:1,exportedAt:new Date().toISOString(),name:getProfileName(),theme:document.documentElement.dataset.theme,customThemeColors:{...customThemeColors},replayRetentionLimit,journeyShuffled,bookProgress,bookJourneys,journeyAttempts,journeyDates,journeyCompletedAt,journeyCompletions,history};
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`logostype-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    dataStatus(`Exported progress and ${history.length} typing result${history.length===1?'':'s'}.`);
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='profileName')$('#profileStatus').textContent='Name not yet saved';
});

document.addEventListener('submit',event=>{
  if(event.target.id!=='profileForm')return;
  event.preventDefault();
  const name=$('#profileName').value.trim().slice(0,24);
  try{localStorage.setItem('logostype-racer',name);updateProfileLabel();$('#profileName').value=name;$('#profileStatus').textContent='Name saved. It will also be used in race rooms.'}catch{$('#profileStatus').textContent='Could not save your name in this browser.'}
});
updateProfileLabel();
