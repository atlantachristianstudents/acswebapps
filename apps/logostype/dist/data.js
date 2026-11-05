function validateHistoryChart(chart){
  const fields=['samples','instantSamples','rawSamples','sampleTimes'];
  if(!chart||fields.some(field=>!Array.isArray(chart[field])||chart[field].length>1000000||chart[field].some(value=>!Number.isFinite(value)||value<0))||fields.some(field=>chart[field].length!==chart.samples.length)||!Array.isArray(chart.mistakeEvents)||chart.mistakeEvents.length>1000000||chart.mistakeEvents.some(event=>!event||!Number.isFinite(event.time)||event.time<0||!Number.isFinite(event.wpm)||event.wpm<0))throw new Error('The backup contains invalid chart data.');
  if(chart.sampleTimes.some((time,index)=>index>0&&time<chart.sampleTimes[index-1]))throw new Error('The backup contains invalid chart times.');
  return {samples:[...chart.samples],instantSamples:[...chart.instantSamples],rawSamples:[...chart.rawSamples],sampleTimes:[...chart.sampleTimes],mistakeEvents:chart.mistakeEvents.map(event=>({time:event.time,wpm:event.wpm}))};
}
function getProfileName(){
  try{return (localStorage.getItem('logostype-racer')||'').trim().slice(0,24)}catch{return ''}
}
function updateProfileLabel(){
  const name=getProfileName();
  $('.account').title=name?`${name} · settings, profile, and history`:'Settings, profile, and history';
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
  const modes=['time','words','quote','custom','book'];
  const history=data.history.map(item=>{
    if(!item||!Number.isFinite(item.wpm)||item.wpm<0||!Number.isFinite(item.accuracy)||item.accuracy<0||item.accuracy>100||!modes.includes(item.mode)||!Number.isInteger(item.limit)||item.limit<1||item.limit>3600||typeof item.date!=='string'||item.date.length>100)throw new Error('The backup contains an invalid typing result.');
    const result={wpm:item.wpm,accuracy:item.accuracy,mode:item.mode,limit:item.limit,date:item.date};
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
    return result;
  });
  if(data.name!==undefined&&(typeof data.name!=='string'||data.name.length>24))throw new Error('The backup has an invalid name.');
  let completedAt=null;
  if(data.journeyCompletedAt!=null){
    if(typeof data.journeyCompletedAt!=='string'||!Number.isFinite(Date.parse(data.journeyCompletedAt))||data.bookProgress!==scriptureReferences.length)throw new Error('The backup has an invalid journey completion date.');
    completedAt=new Date(data.journeyCompletedAt).toISOString();
  }
  const completions=data.journeyCompletions??[];
  if(!Array.isArray(completions)||completions.some(value=>typeof value!=='string'||!Number.isFinite(Date.parse(value))))throw new Error('The backup has invalid journey completion history.');
  return {journeyAttempts:validateJourneyAttempts(data.journeyAttempts??[]),bookJourneys:validateBookJourneys(data.bookJourneys??{}),bookProgress:data.bookProgress,history,name:data.name,journeyCompletedAt:completedAt,journeyCompletions:[...new Set([...completions.map(value=>new Date(value).toISOString()),...(completedAt?[completedAt]:[])])].sort()};
}
function historyKey(item){
  return item.id?'id:'+item.id:JSON.stringify([item.date,item.mode,item.limit,item.wpm,item.accuracy,item.rawWpm??null,item.reference??null,item.journey??null]);
}
function mergeTypingHistory(existing,incoming){
  // Preserve multiple identical sessions within a backup while avoiding duplicates on repeated imports.
  const counts=new Map();
  for(const item of existing){const key=historyKey(item);counts.set(key,(counts.get(key)||0)+1)}
  const result=[...existing],seen=new Map();
  for(const item of incoming){
    const key=historyKey(item),count=(seen.get(key)||0)+1;seen.set(key,count);
    if(count>(counts.get(key)||0))result.push(item);
  }
  return result;
}
function importBackup(data){
  if(window.friendRace?.active)throw new Error('Leave the race room before importing a backup.');
  checkpointJourneyAttempt();
  const backup=validateBackup(data);
  const merged=mergeTypingHistory(history,backup.history);
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
  const keys=['logostype-history','logostype-book-progress','logostype-racer','logostype-journey-completed-at','logostype-journey-completions','logostype-book-journeys','logostype-journey-attempts'];
  const previous=keys.map(key=>localStorage.getItem(key));
  try{
    localStorage.setItem(keys[0],JSON.stringify(merged));
    localStorage.setItem(keys[1],String(progress));
    localStorage.setItem(keys[2],name);
    if(completedAt)localStorage.setItem(keys[3],completedAt);else localStorage.removeItem(keys[3]);
    localStorage.setItem(keys[4],JSON.stringify(completions));
    localStorage.setItem(keys[5],JSON.stringify(mergedBooks));
    localStorage.setItem(keys[6],JSON.stringify(mergedAttempts));
  }catch(error){
    keys.forEach((key,i)=>{try{if(previous[i]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[i])}catch{}});
    throw new Error('Could not save the backup. Browser storage may be full.');
  }
  const added=merged.length-history.length;
  journeyAttempts=mergedAttempts;
  bookJourneys=mergedBooks;history=merged;bookProgress=progress;journeyCompletedAt=completedAt;journeyCompletions=completions;
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
    if(!window.confirm('Clear all Logostype data on this browser? This deletes your name, theme, typing history, records, journey progress, completion dates, and time totals. Export a backup first if you want to keep them. This cannot be undone.'))return;
    try{
      const keys=Object.keys(localStorage).filter(key=>key.startsWith('logostype-'));
      const previous=keys.map(key=>localStorage.getItem(key));
      try{keys.forEach(key=>localStorage.removeItem(key))}catch(error){
        keys.forEach((key,index)=>{try{localStorage.setItem(key,previous[index])}catch{}});throw error;
      }
      clearInterval(timer);timer=null;activeJourneyAttempt=null;
      history=[];bookProgress=0;bookJourneys={};journeyAttempts=[];journeyCompletedAt=null;journeyCompletions=[];selectedJourneyBook='';
      theme('serika dark');localStorage.removeItem('logostype-theme');
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
    const backup={format:'logostype-backup',version:1,exportedAt:new Date().toISOString(),name:getProfileName(),bookProgress,bookJourneys,journeyAttempts,journeyCompletedAt,journeyCompletions,history};
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
