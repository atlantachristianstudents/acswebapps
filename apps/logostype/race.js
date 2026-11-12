/* Private friend rooms: the host relays standings over WebRTC data channels. */
(() => {
  const api = window.friendRace = {active:false, running:false, preparing:false, spectating:false, report, raceReplay, relayPassageMarkup, paintTextPositions, restartReplay, getReplay:()=>roundReplay};
  let peer, host=false, self='', room='', players={}, links=new Map(), phase='lobby', round=0;
  let countdownTimeout, clock, connectionTimeout, lastReport=0, saved, duration=0, gaveUp=false, celebratedRound=null;
  let unlisted=false, pendingRemove=null, remoteHostReady=false;
  let relay=false, relayLegs={}, relayStarted=false, relayLaneCount=0;
  let roomMessages=[], roomChatSequence=0, localRoomChatAt=-Infinity;
  const roomChatTimes=new Map(), roomProfiles=new Map();
  let lastSharedRecords='';
  const removedPeers=new Set();
  let ghost=null, attemptReplays=new Map(), roundReplay=null, submittedReplay=false, localResultId=null;
  let roundStartsAt=0, watchStartsAt=0, queueSequence=0, directoryRooms=[], raceNameSession='', pendingNameAction=null;
  const botSpeeds=[['turtle','🐢',30],['rabbit','🐇',60],['deer','🦌',90],['cheetah','🐆',120],['eagle','🦅',150],['rocket','🚀',180]];
  let botSequence=0, botRuns=new Map();
  const readyGate={since:null,key:'',timer:null};
  const textMarkers=new Map();
  let markerLayout='';
  const isRacer=player=>player.role!=='watcher'&&player.role!=='queued';
  let passageMode='verse', preparedText='', roundText='', preparedVerseIndex=-1, raceFormatting=false, finishMs=null;
  const cleanName = value => String(value || 'typist').trim().slice(0,24) || 'typist';
  const status = message => { $('#raceStatus').textContent=message; };
  function send(connection, data) { if(connection?.open) connection.send(data); }
  function broadcast(data) { for(const connection of links.values()) send(connection,data); }
  function shareRoomRecords(){
    if(!api.active||ghost||!players[self])return;
    const summary=window.friendRecords?.summary(players[self].name);if(!summary)return;
    const value=JSON.stringify(summary);if(value===lastSharedRecords)return;lastSharedRecords=value;
    if(host){roomProfiles.set(self,summary);broadcast({type:'personal-records',id:self,summary});}
    else send(links.get('host'),{type:'personal-records',summary});
  }
  function snapshot() { return {type:'roster', players, phase, round, unlisted, hostReady:hostIsReady(), relay, relayLegs, relayLaneCount, clock:{untilStartMs:Math.max(0,roundStartsAt-Date.now()),elapsedMs:Math.max(0,Date.now()-roundStartsAt),duration}, preview:{text:preparedText, custom:passageMode==='custom', duration:defaultRaceDuration(preparedText), formatting:raceFormatting}}; }
  function publish() {
    if(host&&relay&&phase!=='countdown'&&phase!=='racing')normalizeRelayLanes();
    if(host&&relay&&phase==='lobby')relayLegs=buildRelayLegs(preparedText,players);
    paint();
    if(host){
      broadcast(snapshot());
      if(!ghost&&api.active)window.raceRooms?.setRoom(unlisted?null:{code:room,name:players[self]?.name||'typist',
        count:Object.values(players).filter(player=>player.connected!==false&&isRacer(player)).length,phase});
    }
  }
  function buildRelayLegs(text, roster) {
    const words=text.split(/\s+/), legs={};
    for(let lane=1;lane<=8;lane++){
      const members=Object.keys(roster).filter(id=>roster[id].connected!==false&&isRacer(roster[id])&&roster[id].lane===lane)
        .sort((a,b)=>(roster[a].laneJoinOrder||0)-(roster[b].laneJoinOrder||0));
      members.forEach((id,index)=>{
        const startWord=Math.floor(index*words.length/members.length);
        const offset=words.slice(0,startWord).join(' ').length+(startWord?1:0);
        legs[id]={lane,index,members,offset,text:words.slice(Math.floor(index*words.length/members.length),Math.floor((index+1)*words.length/members.length)).join(' ')};
      });
    }
    return legs;
  }
  function relayPassageMarkup(spaceTypos) {
    const preview=phase==='lobby'||(phase==='finished'&&!!players[self]?.ready);
    if(api.active&&!relay&&phase==='finished'&&players[self]?.ready)return typingPassageMarkup(preparedText,'',{});
    const viewLegs=preview?previewRelayLegs():relayLegs;
    if(!api.active||!relay||!viewLegs[self])return null;
    const leg=viewLegs[self], full=preview?preparedText:roundText;
    if(!full)return null;
    const markup=typingPassageMarkup(full,'',{});
    const localOffset=leg.offset||0;
    const teammates=Object.entries(viewLegs).filter(([id,other])=>id!==self&&other.lane===leg.lane)
      .map(([id,other])=>({id,other,parsed:!preview&&typeof players[id]?.relayInput==='string'?parseTyping(players[id].relayInput,false,other.text):null}));
    return markup.replace(/class="letter([^" ]*(?: [^"]*)?)" data-typing-position="(\d+)"/g,(match,classes,value)=>{
      const position=Number(value), local=position-localOffset;
      let state='';
      if(local>=0&&local<leg.text.length){
        state=' relay-assigned';
        if(!preview&&local<typed.length)state+=typed[local]===target[local]?' correct':' incorrect';
        if(!preview&&local===typed.length&&!done)state+=' cursor';
      }
      if(local<0||local>=leg.text.length)state+=' relay-other';
      if(preview){
        for(const other of Object.values(viewLegs))if(other.lane===leg.lane&&position>=other.offset&&position<other.offset+other.text.length)state+=' relay-preview-section relay-section-'+other.index;
      }else for(const {id,other,parsed} of teammates){
        const at=position-other.offset, progress=parsed?parsed.text.length:players[id]?.position||0;
        if(at>=0&&at<Math.min(progress,other.text.length)){
          state+=' relay-teammate';
          if(parsed&&parsed.text[at]!==other.text[at])state+=' incorrect';
        }
      }
      return 'class="letter'+state+'" data-typing-position="'+position+'"';
    }).replace(/(<span class="letter[^"]*" data-typing-position="(\d+)"[^>]*>)/g,(match,open,value)=>{
      const boundary=preview?Object.entries(viewLegs).find(([,other])=>other.lane===leg.lane&&other.offset===Number(value)&&other.text.length):null;
      const label=boundary?'<span class="relay-leg-label">'+escapeHtml(players[boundary[0]]?.name||'typist')+(boundary[0]===self?' (you)':'')+'</span>':'';
      let extras=preview?'':spaceTypos[Number(value)-localOffset];
      if(!preview)for(const {other,parsed} of teammates){
        const at=Number(value)-other.offset;
        if(parsed&&at>=0&&at<=other.text.length&&parsed.spaceTypos[at])extras=parsed.spaceTypos[at];
      }
      return extras?'<span class="letter incorrect">'+escapeHtml(extras)+'</span>'+open:open+label;
    });
  }
  function relayLanePositions() {
    const lanes=new Map();
    for(const [id,leg] of Object.entries(relayLegs)){
      const player=players[id];if(!player||(!relayTurn(id)&&!player.finished))continue;
      const position=(leg.offset||0)+Math.min(leg.text.length,Math.max(0,player.position||0));
      const current=lanes.get(leg.lane);
      if(!current||position>current[1].position)lanes.set(leg.lane,['lane-'+leg.lane,{name:'Lane '+leg.lane+' · '+player.name,position,finished:completedPassage(player)}]);
    }
    return [...lanes.values()];
  }
  function relayTurn(id) {
    const leg=relayLegs[id];
    return !!leg&&leg.members.slice(0,leg.index).every(member=>players[member]?.finished||players[member]?.connected===false);
  }
  function joinRelayLane(player,lane,roster=players) {
    player.lane=lane;
    player.laneJoinOrder=1+Math.max(0,...Object.values(roster).map(p=>p.laneJoinOrder||0));
  }
  function normalizeRelayRoster(roster) {
    const racers=Object.values(roster).filter(p=>p.connected!==false&&isRacer(p));
    const occupied=[...new Set(racers.map(p=>p.lane).filter(lane=>Number.isInteger(lane)&&lane>0))].sort((a,b)=>a-b);
    const mapping=new Map(occupied.map((lane,index)=>[lane,index+1]));
    let count=occupied.length;
    for(const player of racers){
      const lane=mapping.get(player.lane);
      if(!lane)joinRelayLane(player,++count,roster);
      else {player.lane=lane;if(!player.laneJoinOrder)joinRelayLane(player,lane,roster);}
    }
    return count;
  }
  function normalizeRelayLanes(){relayLaneCount=normalizeRelayRoster(players);}
  function previewRelayLegs(){
    const next=new Set(nextRoundPlayers());
    const roster=Object.fromEntries(Object.entries(players).filter(([,player])=>next.has(player)).map(([id,player])=>[id,{...player,role:'racer'}]));
    normalizeRelayRoster(roster);
    return buildRelayLegs(preparedText,roster);
  }
  function releaseDeferredQueue(){
    const before=nextRoundPlayers();
    for(const player of Object.values(players))if(player.connected!==false&&player.role==='queued'&&(player.eligibleRound||0)>round+1)player.eligibleRound=round+1;
    const after=nextRoundPlayers();
    return after.length!==before.length||after.some(player=>!before.includes(player));
  }
  function editRelayTeams() {
    if(phase!=='finished')return;
    phase='lobby';relayLegs={};
    for(const player of Object.values(players)){player.progress=0;player.position=0;player.finished=false;player.passageComplete=false;}
    showPreparedPassage(preparedText,passageMode==='custom');
  }
  function selectLane(id,lane) {
    if(!relay||raceSettingsLocked()||players[id]?.ready||!isRacer(players[id]||{role:'watcher'})||!Number.isInteger(lane)||lane<1||lane>relayLaneCount)return;
    if(players[id].lane===lane)return;
    editRelayTeams();settingsChanged();joinRelayLane(players[id],lane);publish();
  }
  function paintRelay() {
    const locked=raceSettingsLocked();
    $('#relayMode').hidden=!host||!!ghost;$('#relayMode').disabled=locked;
    $('#relayMode').setAttribute('aria-pressed',String(relay));
    $('#relayMode').textContent=relay?'relay racing: on':'relay racing: off';
    $('#relayControls').hidden=!relay||!!ghost;
    document.body.classList.toggle('relay-race',api.active&&relay);
    document.body.classList.toggle('relay-waiting',api.active&&relay&&(phase==='lobby'||done||!relayStarted));
    document.body.classList.toggle('relay-preview',api.active&&relay&&(phase==='lobby'||phase==='finished'&&!!players[self]?.ready));
    $('#relayLaneActions').hidden=!relay||!!ghost;
    $('#addRelayLane').disabled=locked||api.spectating||!!players[self]?.ready||Object.values(players).filter(p=>p.connected!==false&&isRacer(p)&&p.lane===players[self]?.lane).length<2;
    if(!relay)return;
    const leg=(phase==='finished'&&players[self]?.ready?previewRelayLegs():relayLegs)[self];
    $('#relayPassageHint').textContent=leg
      ? (phase==='lobby'?'Preview · ':'')+'Lane '+leg.lane+' · your section: leg '+(leg.index+1)+' of '+leg.members.length+'. '+(phase==='lobby'||phase==='finished'&&players[self]?.ready?'Your section uses normal text; teammates’ sections are faded and labeled.':'Your section uses normal text; teammates’ sections are faded. Green highlights show teammates’ progress. Labeled markers show each lane.')
      : 'Underlined letters mark your assigned section during the race. Green highlights show teammates’ progress; markers show each lane.';
    if(leg&&phase!=='lobby')$('#testSection').style.display='block';
    const list=$('#racers'),rows=[];
    const lanes=[];
    for(let lane=1;lane<=8;lane++){
      const members=Object.entries(players).filter(([id,p])=>isRacer(p)&&(locked||phase==='finished'?relayLegs[id]?.lane===lane:p.connected!==false&&p.lane===lane))
        .sort(([a,first],[b,second])=>locked||phase==='finished'
          ? (relayLegs[a]?.index||0)-(relayLegs[b]?.index||0)
          : (first.laneJoinOrder||0)-(second.laneJoinOrder||0));
      if(!members.length)continue;
      const complete=members.every(([,p])=>completedPassage(p));
      const time=complete?Math.max(...members.map(([,p])=>p.finishMs||0)):Infinity;
      const weight=id=>relayLegs[id]?.text.split(' ').length||1;
      const progress=members.reduce((sum,[id,p])=>sum+(p.progress||0)*weight(id),0)/members.reduce((sum,[id])=>sum+weight(id),0);
      lanes.push({lane,members,complete,time,progress});
    }
    const ranked=[...lanes].sort((a,b)=>Number(b.complete)-Number(a.complete)||a.time-b.time||b.progress-a.progress||a.lane-b.lane);
    lanes.forEach(lane=>{
      const index=ranked.indexOf(lane);
      const row=raceRow(list,'lane-'+lane.lane);row.className='racer relay-lane-row';
      row.setAttribute('role','button');row.setAttribute('aria-label','Lane '+lane.lane+' · '+lane.members.map(([id,p])=>p.name+(id===self?' (you)':'')).join(', '));
      row.setAttribute('aria-pressed',String(players[self]?.lane===lane.lane));
      row.setAttribute('aria-disabled',String(locked||api.spectating||!!players[self]?.ready));
      row.tabIndex=0;
      const join=event=>{
        if(locked||api.spectating||!!players[self]?.ready||event?.target?.closest('button'))return;
        requestLane(lane.lane);
      };
      row.onclick=join;
      row.onkeydown=event=>{
        if(event.target?.closest('button'))return;
        if(event.key==='Enter'||event.key===' '){event.preventDefault();join(event);}
      };
      const {name:names,track,bar,score}=row._parts;
      const nameState=JSON.stringify([locked,host,hostIsReady(),phase==='lobby'||phase==='finished',self,lane.members.map(([id,p])=>[id,p.name,p.connected,p.ready,p.botWpm])]);
      if(row._nameState!==nameState){
        row._nameState=nameState;names.replaceChildren();
        const label=document.createElement('strong');label.textContent='Lane '+lane.lane;names.append(label);
        const members=document.createElement('span');members.className='relay-members';
        lane.members.forEach(([id,player],memberIndex)=>{
          const name=document.createElement('span');name.textContent=(memberIndex?' → ':'')+player.name+(id===self?' (you)':'')+(player.connected===false?' · left':'')+(!locked&&!player.botWpm&&!player.ready?' · not ready':'');
          appendReadyBadge(name,player);
          if(host&&id!==self&&player.connected!==false)name.append(removeButton(id,player));
          members.append(name);
        });
        names.append(members);
      }
      bar.style.width=Math.max(0,Math.min(100,lane.progress))+'%';
      track.setAttribute('aria-label','Lane '+lane.lane+' · '+Math.round(lane.progress)+'%');
      racePlace(row,lane.complete,index);
      const characters=lane.members.reduce((sum,[id,p])=>sum+(relayLegs[id]?.text.length||0)*Math.max(0,Math.min(100,p.progress||0))/100+(relayLegs[id]?.index>0&&p.progress>0?1:0),0);
      const elapsedMs=lane.complete?lane.time:phase==='finished'?Math.max(...lane.members.map(([,p])=>p.finishMs||0)):Math.max(0,Date.now()-roundStartsAt);
      const average=elapsedMs>0?Math.round(characters/5/(elapsedMs/60000)):0;
      score.textContent=phase==='lobby'?lane.members.filter(([,p])=>p.botWpm||p.ready).length+'/'+lane.members.length+' ready':Math.round(lane.progress)+'% · '+average+' wpm'+(lane.complete?' · '+(lane.time/1000).toFixed(2)+'s':'');
      rows.push(row);
    });
    reconcileRaceRows(list,rows);
    if(phase==='finished'){
      const winner=ranked.find(lane=>lane.complete);
      status(winner?'Relay complete · Lane '+winner.lane+' wins.':'Relay complete · no lane finished the passage.');
      if(winner?.members.some(([id])=>id===self)&&celebratedRound!==round){celebratedRound=round;celebrateJourney(7,4500);}
    }
  }
  function addBot(speed) {
    const choice=botSpeeds.find(item=>item[2]===speed);
    if(!host||ghost||!api.active||!choice||raceSettingsLocked()||Object.values(players).filter(p=>p.connected!==false&&isRacer(p)).length>=8)return;
    editRelayTeams();settingsChanged();
    players['bot-'+(++botSequence)]={name:choice[1]+' '+choice[0],botWpm:speed,role:'racer',connected:true,finished:false,progress:0,wpm:0};
    publish();
  }
  function updateBots() {
    if(!host||ghost||phase!=='racing')return;
    const elapsed=Math.max(0,Math.min(duration*1000,Date.now()-roundStartsAt));
    let changed=false;
    for(const [id,player] of Object.entries(players)){
      if(!player.botWpm||player.connected===false||player.finished)continue;
      const text=relay?relayLegs[id]?.text:preparedText;
      if(!text)continue;
      let run=botRuns.get(id);
      if(!run){run={startMs:null};botRuns.set(id,run);}
      if(run.startMs===null&&(!relay||relayTurn(id))){
        const leg=relayLegs[id];
        run.startMs=relay&&leg.index>0?Math.max(0,...leg.members.slice(0,leg.index).map(member=>players[member]?.finishMs??elapsed)):0;
      }
      const interval=60000/(player.botWpm*5);
      const active=run.startMs===null?0:Math.max(0,elapsed-run.startMs);
      const position=Math.min(text.length,Math.floor((active+0.00001)/interval));
      const finished=position===text.length||elapsed>=duration*1000;
      if(player.position!==position||finished)changed=true;
      if(relay)player.relayInput=text.slice(0,position);
      Object.assign(player,{position,progress:position/text.length*100,wpm:position?player.botWpm:0,accuracy:100,finished,passageComplete:position===text.length,gaveUp:false});
      if(finished){
        const activeMs=position===text.length?text.length*interval:active;
        player.finishMs=position===text.length?run.startMs+activeMs:duration*1000;
        const events=Array.from({length:position},(_,index)=>({time:Math.min(activeMs,(index+1)*interval),at:index,remove:0,text:text[index]}));
        attemptReplays.set(id,{target:text,rawTarget:text,durationMs:activeMs,events,references:[],sourceRanges:[]});
      }
    }
    if(changed){checkFinished();publish();}
  }
  function defaultRaceDuration(text) {
    return Math.max(10, Math.ceil((Array.from(text).length / 5 / 30 * 60) / 5) * 5);
  }
  function showPreparedPassage(text, customMode) {
    punctuation=capitalization=raceFormatting;
    api.preparing=true;mode=customMode?'custom':'quote';reset();api.preparing=false;
    target=text;rawTarget=text;render(false);input.disabled=true;
    $('#counter').textContent='';
  }
  function preparePassage(shuffle=true,display=true) {
    if(ghost||!host||!api.active||raceSettingsLocked())return;
    const customMode=passageMode==='custom';
    if(customMode)preparedText=$('#raceCustomText').value.trim().replace(/\s+/g,' ');
    else {
      if(!scriptureLines.length)return;
      if(shuffle||preparedVerseIndex<0){
        const exclude=preparedVerseIndex>=0&&scriptureLines.length>1;
        let index=Math.floor(Math.random()*(scriptureLines.length-(exclude?1:0)));
        if(exclude&&index>=preparedVerseIndex)index++;
        preparedVerseIndex=index;
      }
      preparedText=scriptureLines[preparedVerseIndex];
    }
    if(!raceFormatting)preparedText=preparedText.replace(/\p{P}/gu,'').toLowerCase();
    preparedText=preparedText.replace(/\s+/g,' ').trim();
    if(display){settingsChanged();showPreparedPassage(preparedText,customMode);}
    publish();
  }
  function lastRacer(id){
    const others=Object.entries(players).filter(([other,p])=>other!==id&&p.connected!==false&&isRacer(p));
    return phase==='racing'&&players[id]&&isRacer(players[id])&&players[id]?.connected!==false&&!players[id]?.finished&&others.length>0&&others.every(([,p])=>p.finished);
  }
  function completedPassage(player) {
    return !!(player.finished && !player.gaveUp && player.progress >= 100 && player.passageComplete !== false);
  }
  function hostIsReady(){return !ghost&&!!(host?players[self]?.ready:remoteHostReady);}
  function raceSettingsLocked(){return hostIsReady()||phase==='countdown'||phase==='racing';}
  function settingsChanged(){
    if(!host||ghost)return;
    for(const [id,player] of Object.entries(players)){
      if(id===self||!player.ready||player.botWpm||player.connected===false)continue;
      player.ready=false;
      send(links.get(id),{type:'settings-changed'});
    }
  }
  function raceRow(list,key){
    let row=Array.from(list.children).find(node=>node._raceKey===key);
    if(row)return row;
    row=document.createElement('div');row._raceKey=key;row.className='racer';
    const name=document.createElement('span');name.className='race-label';
    const track=document.createElement('div');track.className='race-track';
    const bar=document.createElement('i');track.append(bar);
    const score=document.createElement('span');score.className='race-score';
    row.append(name,track,score);row._parts={name,track,bar,score};return row;
  }
  function reconcileRaceRows(list,rows){
    const current=Array.from(list.children);
    if(current.length===rows.length&&current.every((row,index)=>row===rows[index]))return;
    list.replaceChildren();for(const row of rows)list.append(row);
  }
  function racePlace(row,completed,index){
    const {track,bar}=row._parts, label=completed?finishPlace(index):'';
    if(row._place!==label){
      track.replaceChildren();track.append(bar);
      if(label){const badge=document.createElement('span');badge.className='race-place';badge.textContent=label;track.append(badge);}
      row._place=label;
    }
    row.classList.toggle('race-winner',completed&&index===0);
  }
  function nextRoundPlayers() {
    const racers=Object.values(players).filter(p=>p.connected!==false&&isRacer(p));
    const queued=Object.values(players).filter(p=>p.connected!==false&&p.role==='queued'&&(p.eligibleRound||0)<=round+1).sort((a,b)=>(a.queueOrder||0)-(b.queueOrder||0));
    return [...racers,...queued.slice(0,Math.max(0,8-racers.length))];
  }
  function allRacersReady() {
    return nextRoundPlayers().every(player=>player.botWpm||player.ready===true);
  }
  function readyStartAllowed(){
    const racers=nextRoundPlayers();
    const valid=host&&!ghost&&(phase==='lobby'||phase==='finished')&&racers.length>=(relay?1:2)&&allRacersReady();
    const key=valid?racers.map(player=>Object.keys(players).find(id=>players[id]===player)).sort().join('|'):'';
    if(!valid||key!==readyGate.key){
      if(readyGate.timer!==null)clearTimeout(readyGate.timer);
      readyGate.since=null;readyGate.key=key;readyGate.timer=null;
    }
    if(!valid)return !!ghost;
    if(readyGate.since===null){
      readyGate.since=Date.now();
      readyGate.timer=setTimeout(()=>{readyGate.timer=null;paint();},1000);
    }
    return Date.now()-readyGate.since>=1000;
  }
  function setReady(id,ready) {
    const player=players[id];
    if(!player||player.connected===false||player.role==='watcher'||player.botWpm||ghost||phase==='countdown'||phase==='racing'||typeof ready!=='boolean')return;
    player.ready=ready;
    if(host&&id===self&&!ready&&releaseDeferredQueue())settingsChanged();
    publish();
  }
  function raceStandings(roster) {
    return Object.entries(roster).filter(([,player])=>isRacer(player)).sort(([firstId,a],[secondId,b]) => {
      const fullA=completedPassage(a), fullB=completedPassage(b);
      return (!!a.gaveUp-!!b.gaveUp) || (Number(fullB)-Number(fullA)) ||
        (fullA&&fullB ? (Number.isFinite(a.finishMs)?a.finishMs:Infinity)-(Number.isFinite(b.finishMs)?b.finishMs:Infinity) : 0) ||
        (Number(!!b.finished)-Number(!!a.finished)) || ((b.wpm||0)-(a.wpm||0)) || firstId.localeCompare(secondId);
    });
  }
  function finishPlace(index) {
    const value=index+1;
    return value+(['th','st','nd','rd'][value%100>=11&&value%100<=13?0:Math.min(value%10,4)]||'th');
  }
  function cleanRoomChat(value){
    if(!value||typeof value.id!=='string'||value.id.length>150||typeof value.name!=='string'||value.name.length>24||typeof value.text!=='string'||!value.text.trim()||value.text.length>500||!Number.isFinite(value.time)||value.time<0)return null;
    return {id:value.id,name:value.name,text:value.text,time:value.time};
  }
  function renderChat(logId,messages){
    const log=$('#'+logId);
    const nearBottom=!log.children.length||log.scrollHeight-log.scrollTop-log.clientHeight<30;
    const wanted=new Set(messages.map(message=>message.id));
    const nodes=new Map(Array.from(log.children).map(node=>[node.dataset?.chatId,node]));
    for(const [id,node] of nodes)if(!wanted.has(id))node.remove();
    for(const message of messages){
      if(nodes.has(message.id))continue;
      const row=document.createElement('p');row.className='race-chat-message';row.dataset.chatId=message.id;
      const name=document.createElement('strong');name.textContent=message.name;
      const time=document.createElement('time');const date=new Date(message.time);time.textContent=date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});time.setAttribute('datetime',date.toISOString());
      const text=document.createElement('span');text.textContent=' · '+message.text;
      row.append(name,time,text);log.append(row);nodes.set(message.id,row);
    }
    if(nearBottom)log.scrollTop=log.scrollHeight;
  }
  function receiveRoomChat(value){
    const message=cleanRoomChat(value);
    if(!message||roomMessages.some(item=>item.id===message.id))return;
    roomMessages=[...roomMessages,message].slice(-50);renderChat('roomChatLog',roomMessages);
  }
  function racerChatLocked(id){
    const player=players[id];
    return !!player&&player.connected!==false&&isRacer(player)&&phase==='racing'&&!player.finished&&!(id===self&&done)&&(!relay||relayTurn(id));
  }
  function paintChatAvailability(){
    const locked=racerChatLocked(self),wasLocked=$('#roomChatInput').disabled;
    $('#roomChatInput').disabled=locked;$('#roomChatSend').disabled=locked;
    if(locked)$('#roomChatStatus').textContent='Chat is disabled while you type your part of the race.';
    else if(wasLocked)$('#roomChatStatus').textContent='';
  }
  function acceptRoomChat(id,text){
    if(!players[id]||players[id].connected===false||removedPeers.has(id)||racerChatLocked(id)||typeof text!=='string'||!text.trim()||text.length>500)return false;
    const now=Date.now();if(now-(roomChatTimes.get(id)??-Infinity)<750)return false;roomChatTimes.set(id,now);
    const message={id:room+'-'+now+'-'+(++roomChatSequence),name:players[id].name,text:text.trim(),time:now};
    receiveRoomChat(message);broadcast({type:'roomChat',message});return true;
  }
  function sendRoomChat(text){
    if(!api.active||racerChatLocked(self)||typeof text!=='string'||!text.trim()||text.length>500||Date.now()-localRoomChatAt<1000)return false;
    if(host){if(!acceptRoomChat(self,text))return false;}
    else{const link=links.get('host');if(!link?.open)return false;send(link,{type:'chat-message',text:text.trim()});}
    localRoomChatAt=Date.now();return true;
  }
  function clearTextPositions(){
    textMarkers.clear();markerLayout='';$('#raceTextMarkers').replaceChildren();
  }
  function paintTextPositions(snap=false){
    const layer=$('#raceTextMarkers'), words=$('#words');
    layer.hidden=!api.active||phase==='lobby'||phase==='finished'&&!!players[self]?.ready;
    if(layer.hidden||!words.clientWidth){clearTextPositions();return;}
    const layout=words.clientWidth+':'+words.clientHeight+':'+words.scrollTop;
    snap=!!snap||layout!==markerLayout;markerLayout=layout;
    const visible=new Set();
    const box=words.getBoundingClientRect(), parent=$('.test').getBoundingClientRect();
    layer.style.left=box.left-parent.left+'px';layer.style.top=box.top-parent.top+'px';
    layer.style.width=box.width+'px';layer.style.height=box.height+'px';
    const colors=['#d08770','#5e81ac','#b48ead','#a3be8c','#d9a441','#bf616a','#48a0a0'];
    const labels=[];
    const opponents=relay?relayLanePositions():Object.entries(players).filter(([id,player])=>id!==self&&player.connected!==false&&isRacer(player)).sort(([a],[b])=>a.localeCompare(b));
    for(const [index,[id,player]] of opponents.entries()){
      const position=Number.isInteger(player.position)?Math.max(0,Math.min(relay?roundText.length:target.length,player.position)):
        Math.round(Math.max(0,Math.min(100,player.progress||0))/100*target.length);
      const anchor=words.querySelector('[data-typing-position="'+position+'"]');
      if(!anchor)continue;
      const rect=anchor.getBoundingClientRect();
      if(rect.bottom<=box.top||rect.top>=box.bottom)continue;
      const x=Math.max(0,Math.min(box.width-3,rect.left-box.left)), y=Math.max(0,rect.top-box.top);
      let entry=textMarkers.get(id);
      const fresh=!entry;
      if(fresh){
        const marker=document.createElement('span'), label=document.createElement('span');
        marker.className='race-text-marker';marker.append(label);
        entry={marker,label};textMarkers.set(id,entry);
      }
      const {marker,label}=entry;
      marker.style.setProperty('--racer-color',colors[index%colors.length]);
      if(fresh||snap)marker.style.transition='none';
      marker.style.transform='translate3d('+x+'px,'+y+'px,0)';
      label.textContent=id==='replay-ghost'?'replay':player.name+(player.finished?' ✓':'');
      if(fresh)layer.append(marker);
      if(fresh||snap){void marker.offsetWidth;marker.style.transition='';}
      visible.add(id);
      const width=Math.min(label.offsetWidth||110,box.width);
      const top=Math.max(0,Math.min(box.height-14,y-14));
      const options=[x+9,x-width-9,...labels.flatMap(other=>[other.right+6,other.left-width-6])];
      const fits=left=>left>=0&&left+width<=box.width&&!labels.some(other=>left<other.right&&left+width>other.left&&top<other.bottom&&top+14>other.top);
      const left=options.find(fits)??Math.max(0,Math.min(box.width-width,x+9));
      label.style.left=left-x+'px';label.style.top=top-y+'px';
      labels.push({left,right:left+width,top,bottom:top+14});
    }
    for(const [id,entry] of textMarkers){
      if(!visible.has(id)){entry.marker.remove();textMarkers.delete(id);}
    }
  }
  function appendReadyBadge(name,player){
    if(ghost||player.connected===false||(phase!=='lobby'&&phase!=='finished')||(!player.botWpm&&!player.ready))return;
    const badge=document.createElement('span');badge.className='race-ready-badge';badge.textContent=' ✓ ready';
    name.append(badge);
  }
  function removeButton(id,player){
    const button=document.createElement('button');button.type='button';button.className='race-remove';button.textContent='remove';
    button.setAttribute('aria-label','Remove '+player.name+' from room');
    button.disabled=hostIsReady();
    button.onclick=event=>{
      event?.stopPropagation?.();
      if(!host||ghost||!api.active||hostIsReady())return;
      pendingRemove=id;$('#removeRacerMessage').textContent='Remove '+player.name+' from this room?';
      if(!$('#removeRacerDialog').open)$('#removeRacerDialog').showModal();
      $('#cancelRemoveRacer').focus();
    };
    return button;
  }
  function paint() {
    shareRoomRecords();
    api.spectating=!!players[self]&&!isRacer(players[self]);
    document.body.classList.toggle('race-spectator',api.spectating);
    if(api.spectating){api.running=false;input.disabled=true;$('#typingCaret').hidden=true;}
    paintChatAvailability();
    const list=$('#racers'),rows=[];
    if(relay&&relayLegs[self]&&$('#words').clientWidth)render(false,false);
    paintTextPositions();
    const ordered=raceStandings(players);
    const visible=relay?[]:phase==='finished'?ordered:Object.entries(players).filter(([,p])=>isRacer(p));
    for(const [id,p] of visible){
      const index=ordered.findIndex(([other])=>other===id),row=raceRow(list,id);
      const {name,track,bar,score}=row._parts;
      const nameState=JSON.stringify([p.name,id===self,p.connected,p.ready,p.botWpm,host,hostIsReady(),!!ghost,phase==='lobby'||phase==='finished']);
      if(row._nameState!==nameState){
        row._nameState=nameState;name.replaceChildren();name.textContent=p.name+(id===self?' (you)':'')+(p.connected===false?' · left':'');
        appendReadyBadge(name,p);
        if(host&&!ghost&&id!==self&&p.connected!==false)name.append(removeButton(id,p));
      }
      bar.style.width=Math.max(0,Math.min(100,p.progress||0))+'%';
      racePlace(row,completedPassage(p),index);
      if(completedPassage(p))track.setAttribute('aria-label',p.name+' · '+finishPlace(index)+' place');
      score.textContent=p.gaveUp?'gave up':phase==='finished'?`${p.wpm||0} wpm · ${p.accuracy??100}%`:phase==='lobby'?(p.botWpm||p.ready?'ready':'not ready'):`${Math.round(p.progress||0)}%${p.finished?' · finished':''}`;
      if(p.finished&&!p.gaveUp&&Number.isFinite(p.finishMs))score.textContent+=` · ${(p.finishMs/1000).toFixed(2)}s`;
      rows.push(row);
    }
    if(!relay)reconcileRaceRows(list,rows);
    $('#giveUpRace').hidden=api.spectating||done||!lastRacer(self);
    $('#queueRace').hidden=!api.spectating||players[self]?.role==='queued';
    const audience=$('#raceAudience');
    const audienceState=JSON.stringify([host,!!ghost,self,hostIsReady(),phase==='lobby'||phase==='finished',Object.entries(players).filter(([,p])=>p.connected!==false&&!isRacer(p)).map(([id,p])=>[id,p.name,p.role,p.ready])]);
    if(audience._rosterState!==audienceState){
      audience._rosterState=audienceState;audience.replaceChildren();
      for(const [id,player] of Object.entries(players).filter(([,player])=>player.connected!==false&&!isRacer(player))){
        const row=document.createElement('div');row.className='race-audience-member';
        const label=document.createElement('span');label.textContent=player.name+(id===self?' (you)':'');if(player.role==='queued')appendReadyBadge(label,player);row.append(label);
        if(host&&!ghost&&id!==self)row.append(removeButton(id,player));
        const state=document.createElement('span');state.textContent=player.role==='queued'?'queued for next race':'watching';row.append(state);
        $('#raceAudience').append(row);
      }
    }
    $('#raceBots').hidden=!host||!!ghost;
    Array.from($('#raceBotChoices').children).forEach(button=>button.disabled=raceSettingsLocked()||Object.values(players).filter(p=>p.connected!==false&&isRacer(p)).length>=8);
    $('#roomVisibility').hidden=!host||!!ghost;
    $('#roomVisibility').disabled=hostIsReady();
    $('#roomVisibility').textContent=unlisted?'make public':'make private';
    $('#roomPrivacyStatus').textContent=ghost?'':unlisted?'private room · code or invite only':'public room · listed for everyone';
    $('#replayAllResult').textContent=relay?'▶ replay all lanes':'▶ replay all racers';
    $('#replayAllResult').hidden=phase!=='finished'||!roundReplay||!done;
    $('#raceNewAttempt').hidden=!ghost||phase!=='finished'||!localResultId||!history.find(result=>result.id===localResultId)?.replay;
    $('#startRace').hidden=!host;$('#raceDurationForm').hidden=!host||!!ghost;$('#raceInvite').hidden=!!ghost;
    const locked=raceSettingsLocked();
    $('#raceCustomText').disabled=locked;
    document.querySelectorAll('[data-race-passage]').forEach(button=>button.disabled=locked);
    $('#shuffleRacePassage').hidden=passageMode!=='verse';
    $('#shuffleRacePassage').disabled=locked;
    $('#raceFormatting').disabled=locked;
    $('#raceFormatting').classList.toggle('active',raceFormatting);
    $('#raceFormatting').setAttribute('aria-pressed',String(raceFormatting));
    $('#raceTimeLimit').textContent=defaultRaceDuration(preparedText)+'s time limit · set automatically';
    const nextPlayers=nextRoundPlayers(), humans=nextPlayers.filter(p=>!p.botWpm);
    const idle=phase==='lobby'||phase==='finished';
    $('#leaveRace').disabled=!!players[self]?.ready;
    $('#leaveRace').title=players[self]?.ready?'Unready before leaving the room.':'';
    $('#readyRace').hidden=!!ghost||players[self]?.role==='watcher';
    $('#readyRace').disabled=!idle;
    $('#readyRace').textContent=players[self]?.ready?'✓ ready':'ready';
    $('#readyRace').setAttribute('aria-pressed',String(!!players[self]?.ready));
    $('#raceReadyStatus').hidden=!!ghost;
    $('#raceReadyStatus').textContent=idle?humans.filter(p=>p.ready).length+'/'+humans.length+' players ready · everyone must ready up for the next race.':'';
    const startAllowed=readyStartAllowed();
    $('#startRace').disabled=nextPlayers.length<(relay?1:2)||!idle||!startAllowed;
    if(host&&!ghost&&idle&&allRacersReady()&&$('#startRace').disabled&&nextPlayers.length>=(relay?1:2))$('#raceReadyStatus').textContent='Everyone is ready · enabling start in one second…';
    $('#startRace').textContent=phase==='finished'?'race again →':'start race →';
    if(phase==='lobby')status(host?'Share the invite link. Start when everyone has joined.':'You’re in! Waiting for the host to start.');
    if(phase==='finished'){$('#wpm').parentElement.hidden=false;$('#rawWpm').parentElement.hidden=false;$('#chart').hidden=false;$('#chartLegend').hidden=false;if(done)drawChart();}
    if(phase==='finished'){
      const winner=ordered.find(([,player])=>completedPassage(player));
      status('Race complete'+(winner?' · '+winner[1].name+' wins':' · no racer finished the passage')+' · finishers ranked by time; unfinished racers are unranked. '+(ghost?'Race again to challenge this replay.':'The host can start a rematch.'));
      if(!relay&&winner?.[0]===self&&celebratedRound!==round){celebratedRound=round;celebrateJourney(7,4500);}
    }
    paintRelay();
    if(api.spectating)status(players[self]?.role==='queued'?'Queued for the next race · watching this round.':'Watching this race · queue to participate in the next round.');
    paintReadyPreview();
  }
  function paintReadyPreview(){
    const preview=!ghost&&phase==='finished'&&!!players[self]?.ready;
    document.body.classList.toggle('race-ready-preview',preview);
    if(preview){
      $('#results').style.display='none';$('#testSection').style.display='block';input.disabled=true;
      render(false,false);
    }else if(phase==='finished'&&done&&!api.spectating){
      $('#results').style.display='block';$('#testSection').style.display=relay?'block':'none';
    }
  }
  function showError(message) { const el=$('#raceError');if(el)el.textContent=message;else status(message); }
  function showRoom() {
    pauseMenu();currentMenu="race";
    document.body.classList.remove("race-lobby-open");$("#raceLobby").hidden=true;saved={mode,limit};api.active=true;api.running=false;updateBookProgress();renderBookContext();
    syncNavigation(true);
    clearInterval(timer);document.body.classList.remove('focus','running');
    document.body.classList.add('in-room');document.body.classList.toggle('replay-race',!!ghost);$('.config').inert=true;
    $('#racePanel').hidden=false;$('#raceTitle').textContent=ghost?'race against replay':`friends · ${room}`;
    $('#racePanel').setAttribute('aria-label',ghost?'Race against replay':'Friends race');
    $('#leaveRace').textContent=ghost?'leave replay race':host?'close room':'leave room';
    $('#modal').close();renderChat('roomChatLog',roomMessages);if(host&&!ghost)preparePassage();paint();
    if(!ghost&&!$('#roomChatInput').disabled)$('#roomChatInput').focus();
  }
  function showCountdown(value){
    const overlay=$('#raceCountdown');
    overlay.hidden=false;
    overlay.classList.toggle('is-go',value==='GO!');
    if($('#raceCountdownValue').textContent!==String(value))$('#raceCountdownValue').textContent=value;
  }
  function hideCountdown(){
    clearTimeout(countdownTimeout);
    $('#raceCountdown').hidden=true;
  }
  let afterLeave=null;
  function requestLeave(next){
    afterLeave=typeof next==='function'?next:null;
    if(!api.active)return;
    if(players[self]?.ready){status('Unready before leaving the room.');afterLeave=null;return;}
    $('#leaveRaceTitle').textContent=ghost?'leave replay race?':host?'close room?':'leave room?';
    $('#leaveRaceMessage').textContent=api.spectating?(players[self]?.role==='queued'?'Leave this room and its queue?':'Stop watching this room?'):ghost?'Your current replay race will end.':host
      ?'All racers will be disconnected when you close this room.'
      :'Your place in the race will be lost when you leave.';
    $('#confirmLeaveRace').textContent=ghost?'leave race':host?'close room':'leave room';
    if(!$('#leaveRaceDialog').open)$('#leaveRaceDialog').showModal();
    $('#cancelLeaveRace').focus();
  }
  api.requestLeave=requestLeave;
  $('#cancelLeaveRace').onclick=()=>{afterLeave=null;$('#leaveRaceDialog').close()};
  $('#leaveRaceDialog').addEventListener('cancel',()=>{afterLeave=null});
  $('#confirmLeaveRace').onclick=()=>{
    $('#leaveRaceDialog').close();
    const next=afterLeave;afterLeave=null;
    if(api.active&&players[self]?.ready){status('Unready before leaving the room.');return;}
    if(api.active)leave(undefined,!next);
    if(next)next();
  };
  function leave(message, returnToLobby=true) {
    if($('#publicRoomDialog').open)$('#publicRoomDialog').close();
    if($('#removeRacerDialog').open)$('#removeRacerDialog').close();pendingRemove=null;
    hideCountdown();
    if($('#restartReplayDialog').open)$('#restartReplayDialog').close();
    if($('#leaveRaceDialog').open)$('#leaveRaceDialog').close();
    clearInterval(clock);clearTimeout(connectionTimeout);clearInterval(timer);
    if(readyGate.timer!==null)clearTimeout(readyGate.timer);readyGate.since=null;readyGate.key='';readyGate.timer=null;
    api.active=false;api.running=false;api.spectating=false;$('#raceChangeNotice').textContent='';remoteHostReady=false;
    roomProfiles.clear();lastSharedRecords='';roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;renderChat('roomChatLog',[]);$('#roomChatInput').value='';$('#roomChatStatus').textContent='';
    window.raceRooms?.setRoom(null);
    $('#raceTextMarkers').hidden=true;clearTextPositions();
    syncNavigation();
    peer?.destroy();peer=null;ghost=null;attemptReplays.clear();roundReplay=null;links.clear();players={};phase='lobby';round=0;celebratedRound=null;
    $('#racePanel').hidden=true;document.body.classList.remove('in-room','replay-race','race-spectator','relay-race','relay-waiting','relay-preview','race-ready-preview');$('.config').inert=false;
    if(saved){({mode,limit}=saved);saved=null;}
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const url=new URL(location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url);
    if(returnToLobby){open();if(message)showError(message);}
  }
  function connect(isHost, code, name, intent='join', privateRoom=false) {
    if(peer)peer.destroy();clearTimeout(connectionTimeout);
    roomProfiles.clear();lastSharedRecords='';roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;roomChatSequence=0;
    remoteHostReady=false;relay=false;relayLegs={};relayStarted=false;relayLaneCount=0;ghost=null;removedPeers.clear();unlisted=!!isHost&&privateRoom;host=isHost;room=code;players={};links=new Map();phase='lobby';round=0;queueSequence=0;celebratedRound=null;preparedText='';
    showError('Connecting…');$('#createRoom').disabled=$('#createPrivateRoom').disabled=$('#joinRoom').disabled=true;
    if(typeof Peer==='undefined'){failure('Could not load racing. Refresh and try again.');return;}
    peer=new Peer(isHost?`logostype-${code}`:undefined);
    connectionTimeout=setTimeout(()=>failure('Could not connect. Check the code and your network, then try again.'),15000);
    function failure(message){leave(message);}
    peer.on('error',error=>{
      if(error.type==='unavailable-id')failure('That room code is in use. Create a room again.');
      else if(api.active)status('Connection interrupted. Leave and rejoin if friends stop updating.');
      else failure('Unable to reach the room. Keep the host’s tab open and try again.');
    });
    peer.on('open',id=>{
      self=id;
      if(host){clearTimeout(connectionTimeout);players[self]={name,role:'racer',connected:true,finished:false,wpm:0,progress:0};showRoom();}
      else {const connection=peer.connect(`logostype-${code}`,{reliable:true,metadata:{name,intent}});links.set('host',connection);wire(connection);}
    });
    peer.on('connection',connection=>{
      if(!host)return connection.close();
      connection.on('open',()=>{
        const locked=phase==='racing'||phase==='countdown'||hostIsReady();
        if(links.size>=31){send(connection,{type:'reject',message:'This room is full of racers and viewers. Try again later.'});setTimeout(()=>connection.close(),300);return;}
        const requested=connection.metadata?.intent;
        const reserved=Object.values(players).filter(p=>p.connected!==false&&p.role!=='watcher').length;
        const role=requested==='watch'?'watcher':locked||reserved>=8?'queued':'racer';
        if(role==='racer')settingsChanged();
        players[connection.peer]={name:cleanName(connection.metadata?.name),role,eligibleRound:hostIsReady()?round+2:round+1,queueOrder:role==='queued'?++queueSequence:0,connected:true,finished:false,wpm:0,progress:0};
        links.set(connection.peer,connection);wire(connection);shareRoomRecords();for(const [id,summary] of roomProfiles)if(id!==connection.peer)send(connection,{type:'personal-records',id,summary});send(connection,{type:'roomChatHistory',messages:roomMessages});publish();
      });
    });
    function wire(connection){
      connection.on('open',()=>{if(!host)send(connection,{type:'hello'});});
      connection.on('data',data=>{
        if(!data||typeof data!=='object')return;
        if(host){
          if(!players[connection.peer]||removedPeers.has(connection.peer))return;
          if(data.type==='personal-records'){
            const summary=window.friendRecords?.cleanSummary({...data.summary,name:players[connection.peer].name});if(!summary)return;
            window.friendRecords.accept(summary);roomProfiles.set(connection.peer,summary);
            for(const link of links.values())if(link!==connection)send(link,{type:'personal-records',id:connection.peer,summary});
            return;
          }
          if(data.type==='hello'){send(connection,snapshot());send(connection,{type:'roomChatHistory',messages:roomMessages});}
          if(data.type==='ready'){setReady(connection.peer,data.ready);return;}
          if(data.type==='lane'){selectLane(connection.peer,data.lane);return;}
          if(data.type==='add-lane'){addRelayLane(connection.peer);return;}
          if(data.type==='chat-message'){acceptRoomChat(connection.peer,data.text);return;}
          if(data.type==='queue'&&!isRacer(players[connection.peer])){
            players[connection.peer].eligibleRound=hostIsReady()?round+2:round+1;players[connection.peer].role='queued';players[connection.peer].queueOrder||=++queueSequence;publish();
          }
          if(!isRacer(players[connection.peer]))return;
          if(data.type==='attemptReplay'&&data.round===round&&!attemptReplays.has(connection.peer)){
            try{
              const replay=validateAttemptReplay(data.replay);
              if(replay.target!==(relay?relayLegs[connection.peer]?.text:roundText))return;
              attemptReplays.set(connection.peer,replay);
              if(phase==='finished')publishRaceReplay();
            }catch{return;}
          }
          if(data.type==='progress'&&data.round===round&&phase==='racing'){
            const p=players[connection.peer];
            if(relay&&!relayTurn(connection.peer)&&Date.now()<roundStartsAt+duration*1000)return;
            if(data.gaveUp&&!p.finished&&!lastRacer(connection.peer))return;
            if(!p.finished){
              p.progress=Math.max(0,Math.min(100,Number(data.progress)||0));p.wpm=Math.max(0,Math.min(500,Number(data.wpm)||0));p.accuracy=Math.max(0,Math.min(100,Number(data.accuracy)||0));p.finished=!!data.finished;
              p.position=Number.isInteger(data.position)?Math.max(0,Math.min(relay?relayLegs[connection.peer]?.text.length||0:target.length,data.position)):Math.round(p.progress/100*target.length);
              if(relay){if(typeof data.relayInput==='string'&&data.relayInput.length<=20000)p.relayInput=data.relayInput;else delete p.relayInput;}
              p.gaveUp=!!data.gaveUp;
              p.passageComplete=p.finished&&!p.gaveUp&&p.progress===100&&data.passageComplete!==false;
              p.finishMs=p.finished&&Number.isSafeInteger(data.finishMs)&&data.finishMs>=0?data.finishMs:null;
            }
            checkFinished();publish();
          }
        } else {
          if(data.type==='personal-records'){if(data.id!==self)window.friendRecords?.accept(data.summary);return;}
          if(data.type==='settings-changed'){$('#raceChangeNotice').textContent='The race format or settings changed. Your ready status was cleared — please ready up again.';return;}
          if(data.type==='roomChat'){receiveRoomChat(data.message);return;}
          if(data.type==='roomChatHistory'&&Array.isArray(data.messages)&&data.messages.length<=50){roomMessages=data.messages.map(cleanRoomChat).filter(Boolean);renderChat('roomChatLog',roomMessages);return;}
          if(data.type==='removed'){leave('The host removed you from this room.');return;}
          if(data.type==='reject'){failure(data.message);return;}
          if(data.type==='roundReplay'&&data.round===round){saveRaceReplay(data.replay);paint();}
          if(data.type==='roster'){
            if(!data.players||!data.players[self])return;
            remoteHostReady=!!data.hostReady;relay=!!data.relay;relayLaneCount=Math.max(0,Math.min(8,Number(data.relayLaneCount)||0));relayLegs=data.relayLegs||{};players=data.players;if(players[self]?.ready)$('#raceChangeNotice').textContent='';phase=data.phase;round=data.round;unlisted=!!data.unlisted;api.spectating=!isRacer(players[self]);if(phase==='finished'){clearInterval(clock);api.running=false;}
            if(!api.active){clearTimeout(connectionTimeout);showRoom();}
            const preview=data.preview;
            if((api.spectating||phase==='lobby'||phase==='finished')&&preview&&typeof preview.text==='string'&&preview.text.length<=10000&&Number.isInteger(preview.duration)&&preview.duration>=0&&preview.duration<=4000){
              raceFormatting=preview.formatting!==false;
              if(preparedText!==preview.text){preparedText=preview.text;if(api.spectating||phase==='lobby')showPreparedPassage(preparedText,preview.custom===true);}
            }
            if(api.spectating)syncWatchClock(data.clock);
            paint();
          }
          if(data.type==='start'){relay=!!data.relay;relayLegs=data.relayLegs||{};}
          if(data.type==='start'&&typeof data.text==='string'&&data.text.trim().length>0&&data.text.length<=10000&&Number.isInteger(data.duration)&&data.duration>=0&&data.duration<=4000){if(api.spectating)beginWatching(data);else begin(data);}
        }
      });
      connection.on('close',()=>{
        if(!api.active)return;
        if(!host){leave('The host left the room. Create a new room or join another.');return;}
        if(players[connection.peer]){
          if(isRacer(players[connection.peer])&&(phase==='lobby'||phase==='finished')){if(players[self])players[self].ready=false;releaseDeferredQueue();settingsChanged();}
          players[connection.peer].connected=false;
        }
        roomProfiles.delete(connection.peer);links.delete(connection.peer);checkFinished();publish();
      });
      connection.on('error',()=>status('A friend lost connection. They can leave and rejoin after the race.'));
    }
  }
  function promoteQueued(){
    let slots=8-Object.values(players).filter(player=>player.connected!==false&&isRacer(player)).length;
    const queued=Object.values(players).filter(player=>player.connected!==false&&player.role==='queued'&&(player.eligibleRound||0)<=round+1).sort((a,b)=>(a.queueOrder||0)-(b.queueOrder||0));
    for(const player of queued){if(slots--<=0)break;player.role='racer';}
  }
  function beginWatching(data){
    clearTextPositions();
    raceFormatting=data.formatting!==false;
    round=data.round;phase='countdown';roundReplay=null;localResultId=null;
    roundText=preparedText=data.text;showPreparedPassage(data.text,data.custom===true);
    syncWatchClock({untilStartMs:3000,elapsedMs:0,duration:data.duration});paint();
  }
  function syncWatchClock(info){
    clearInterval(clock);
    api.running=false;input.disabled=true;
    if(phase==='finished'||phase==='lobby'){hideCountdown();return;}
    const until=Number.isFinite(info?.untilStartMs)?Math.max(0,info.untilStartMs):0;
    const elapsed=Number.isFinite(info?.elapsedMs)?Math.max(0,info.elapsedMs):0;
    duration=Number.isFinite(info?.duration)?info.duration:duration;
    watchStartsAt=Date.now()+until-elapsed;
    function tick(){
      const remaining=watchStartsAt-Date.now();
      if(remaining>0)showCountdown(Math.ceil(remaining/1000));
      else{hideCountdown();$('#counter').textContent='watching · '+Math.max(0,Math.ceil(duration+remaining/1000))+'s';}
    }
    tick();clock=setInterval(tick,100);
  }
  function checkFinished(){
    if(phase==='racing'&&Object.values(players).filter(p=>p.connected!==false&&isRacer(p)).every(p=>p.finished)){phase='finished';clearInterval(clock);api.running=false;if(host){publishRaceReplay();if(!ghost&&passageMode==='verse')preparePassage(true,false);}}
  }
  function begin(data){
    if(readyGate.timer!==null)clearTimeout(readyGate.timer);readyGate.since=null;readyGate.key='';readyGate.timer=null;
    $('#raceChangeNotice').textContent='';
    clearTextPositions();
    attemptReplays=new Map();roundReplay=null;submittedReplay=false;localResultId=null;
    botRuns=new Map();
    if(ghost)attemptReplays.set('replay-ghost',ghost.result.replay);
    raceFormatting=data.formatting!==false;
    punctuation=capitalization=raceFormatting;
    hideCountdown();showCountdown(3);
    duration=data.duration;round=data.round;celebratedRound=null;phase='countdown';api.running=false;lastReport=0;gaveUp=false;finishMs=null;
    for(const [id,p] of Object.entries(players)){
      if(p.connected===false){delete players[id];continue;}
      p.relayInput='';p.ready=false;p.progress=0;p.position=0;p.wpm=0;p.finished=false;p.gaveUp=false;p.finishMs=null;p.passageComplete=false;
    }
    api.preparing=true;mode=data.custom===true?'custom':'quote';limit=25;reset();api.preparing=false;
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    relayStarted=false;
    roundText=preparedText=data.text;
    target=relay?relayLegs[self].text:data.text;rawTarget=target;input.disabled=relay;render();input.blur();done=false;
    $('#words').scrollTop=0;
    $('.test').scrollIntoView({block:'center',behavior:'instant'});
    if(ghost){
      capitalization=ghost.result.mode==='book'||ghost.result.capitalization===true;
      punctuation=ghost.result.mode==='book'||ghost.result.punctuation===true;
      ghost.value='';ghost.next=0;ghost.total=0;ghost.errors=0;
      input.disabled=false;
    }
    if(ghost){$('#restart').title='Restart replay race';$('#restart').setAttribute('aria-label','Restart replay race');}
    const passageLabel=ghost?'replay opponent':data.custom===true?'custom text':'verse';
    const startsAt=roundStartsAt=Date.now()+3000;
    publish();clearInterval(clock);
    clock=setInterval(()=>{
      const remaining=startsAt-Date.now();
      if(remaining>0){showCountdown(Math.ceil(remaining/1000));status(`Starting in ${Math.ceil(remaining/1000)}… · ${passageLabel} · ${duration}s limit`);return;}
      // A host roster can advance phase before this racer's countdown ends.
      // Initialize the local clock independently of that shared phase.
      if(!api.running&&(phase==='countdown'||phase==='racing')){
        phase='racing';api.running=true;start=startsAt;
        showCountdown('GO!');countdownTimeout=setTimeout(hideCountdown,700);
        document.body.classList.add('running');status('Go! Type the same words as your friends.');input.focus({preventScroll:true});
      }
      if(phase==='racing'){
        const elapsed=(Date.now()-(relay?roundStartsAt:start))/1000;
        if(ghost)updateGhost(elapsed*1000);
        updateBots();
        if(relay&&!done){
          const ready=relayTurn(self);input.disabled=!ready;
          if(ready&&!relayStarted){relayStarted=true;document.body.classList.remove('relay-waiting');start=Date.now();input.focus({preventScroll:true});}
          if(!ready)status('Waiting for your teammate · Lane '+relayLegs[self].lane+' · leg '+(relayLegs[self].index+1)+' of '+relayLegs[self].members.length);
        }
        if(!done){
          $('#counter').textContent=`${Math.max(0,Math.ceil(duration-elapsed))}s`;
          if(!relay||relayStarted)sampleWpm();if(elapsed>=duration){if(relay&&!relayStarted){finish(false);}else finish();}
        }
        // Repeat the terminal report until the host acknowledges the round as finished.
        report(false);
        paintChatAvailability();
        if(relay)paintRelay();
      }
    },100);
    status(`Starting in 3… · ${passageLabel} · ${duration}s limit`);
  }
  function saveRaceReplay(data){
    try{roundReplay=validateRaceReplay(data);}catch{return;}
    const result=history.find(item=>item.id===localResultId);
    if(result){
      result.raceReplay=roundReplay;
      saveTypingHistory();
      if(lastResultId===result.id)$('#replayAllResult').hidden=false;
    }
  }
  function relayReplay(id,player){
    const replay=attemptReplays.get(id)||null;
    if(!relay||!replay)return replay;
    const offset=Math.max(0,(player.finishMs||0)-replay.durationMs);
    return {...replay,durationMs:replay.durationMs+offset,events:replay.events.map(event=>({...event,time:event.time+offset}))};
  }
  function relayRaceParticipants() {
    const lanes=[];
    for(let lane=1;lane<=8;lane++){
      const members=Object.entries(relayLegs).filter(([,leg])=>leg.lane===lane).sort((a,b)=>a[1].index-b[1].index);
      if(!members.length)continue;
      const complete=members.every(([id])=>completedPassage(players[id]||{}));
      const finishTime=Math.max(...members.map(([id])=>players[id]?.finishMs||0));
      const text=members.map(([,leg])=>leg.text).join(' ');
      const recordings=members.map(([id])=>relayReplay(id,players[id]||{}));
      let replay=null;
      if(recordings.every(Boolean)){
        const edits=recordings.flatMap((recording,index)=>recording.events.map((event,sequence)=>({event,index,sequence})))
          .sort((a,b)=>a.event.time-b.event.time||a.index-b.index||a.sequence-b.sequence);
        const values=members.map(()=>'');let previous='';const events=[];
        for(const {event,index} of edits){
          values[index]=values[index].slice(0,event.at)+event.text+values[index].slice(event.at+event.remove);
          let value='';
          values.forEach((part,partIndex)=>{
            if(!part.length)return;
            const offset=members[partIndex][1].offset;
            value=value.padEnd(offset,' ')+part;
          });
          let prefix=0;while(prefix<previous.length&&prefix<value.length&&previous[prefix]===value[prefix])prefix++;
          let suffix=0;while(suffix<previous.length-prefix&&suffix<value.length-prefix&&previous[previous.length-1-suffix]===value[value.length-1-suffix])suffix++;
          if(previous!==value)events.push({time:event.time,at:prefix,remove:previous.length-prefix-suffix,text:value.slice(prefix,value.length-suffix)});
          previous=value;
        }
        replay={target:text,rawTarget:text,durationMs:Math.max(finishTime,...recordings.map(item=>item.durationMs)),events,references:[],sourceRanges:[]};
      }
      const characters=members.reduce((sum,[id,leg])=>sum+leg.text.length*Math.min(100,players[id]?.progress||0)/100+(leg.index>0&&players[id]?.progress>0?1:0),0);
      const accuracy=members.reduce((sum,[id,leg])=>sum+leg.text.length*(players[id]?.accuracy??100),0)/members.reduce((sum,[,leg])=>sum+leg.text.length,0);
      lanes.push({id:'lane-'+lane,name:('Lane '+lane+' · '+members.map(([id])=>players[id]?.name||'typist').join(' → ')).slice(0,150),
        wpm:finishTime?Math.round(characters/5/(finishTime/60000)):0,accuracy:Math.round(accuracy),completed:complete,
        gaveUp:members.some(([id])=>players[id]?.gaveUp),finishMs:finishTime||null,place:null,replay});
    }
    lanes.sort((a,b)=>Number(b.completed)-Number(a.completed)||(a.completed?a.finishMs-b.finishMs:0)||b.wpm-a.wpm||a.id.localeCompare(b.id));
    lanes.forEach((lane,index)=>{lane.place=lane.completed?index+1:null;});
    return lanes;
  }
  function publishRaceReplay(){
    if(!host||phase!=='finished')return;
    const participants=relay?relayRaceParticipants():raceStandings(players).map(([id,player],index)=>({
      id,name:(relay?'Lane '+(relayLegs[id]?.lane||'?')+' · ':'')+player.name,wpm:player.wpm||0,accuracy:player.accuracy??100,place:completedPassage(player)?index+1:null,completed:completedPassage(player),
      gaveUp:!!player.gaveUp,finishMs:Number.isFinite(player.finishMs)?player.finishMs:null,
      replay:relayReplay(id,player)
    }));
    saveRaceReplay({participants,...(relay?{relay:true}:{})});
    if(roundReplay)broadcast({type:'roundReplay',round,replay:roundReplay});
  }
  function raceReplay(result){
    if(!result?.replay)return;
    if(api.active){requestLeave(()=>raceReplay(result));return;}
    withRacerName(name=>startReplayRace(result,name));
  }
  function startReplayRace(result,name){
    if(peer){peer.destroy();peer=null;}
    clearTimeout(connectionTimeout);
    relay=false;relayLegs={};ghost={result,readings:buildReplayReadings(result.replay)};
    host=true;self='replay-you';room='';round=0;phase='lobby';links.clear();
    players={
      [self]:{name,connected:true,finished:false,wpm:0,progress:0},
      'replay-ghost':{name:'replay · '+result.date,connected:true,finished:false,wpm:0,progress:0}
    };
    roomProfiles.clear();lastSharedRecords='';roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;
    showRoom();
    startGhostRound();
  }
  function restartReplay(){
    if(!api.active||!ghost)return;
    if(!$('#restartReplayDialog').open)$('#restartReplayDialog').showModal();
    $('#cancelRestartReplay').focus();
  }
  $('#cancelRestartReplay').onclick=()=>{$('#restartReplayDialog').close();input.focus();};
  $('#restartReplayDialog').addEventListener('cancel',()=>input.focus());
  $('#confirmRestartReplay').onclick=()=>{
    $('#restartReplayDialog').close();
    if(api.active&&ghost)startGhostRound();
  };
  function startGhostRound(){
    if(!ghost)return;
    if($('#restartReplayDialog').open)$('#restartReplayDialog').close();
    const result=ghost.result;
    const seconds=ghost.durationSeconds??(result.mode==='time'?result.limit:
      Math.max(defaultRaceDuration(result.replay.target),Math.ceil(result.replay.durationMs/1000)*2,10));
    begin({round:round+1,text:result.replay.target,duration:seconds,custom:result.mode==='custom',
      formatting:result.mode==='book'||result.punctuation===true||result.capitalization===true});
  }
  function updateGhost(elapsedMs){
    const opponent=players['replay-ghost'];
    if(!ghost||!opponent||opponent.finished)return;
    const data=ghost.result.replay, time=Math.min(elapsedMs,data.durationMs);
    while(ghost.next<data.events.length&&data.events[ghost.next].time<=time){
      const event=data.events[ghost.next++], before=ghost.value;
      ghost.value=before.slice(0,event.at)+event.text+before.slice(event.at+event.remove);
      const parsed=parseTyping(ghost.value,false,data.target);
      for(let index=0;index<parsed.raw.length;index++){
        if(index>=before.length||parsed.raw[index]!==before[index]){
          ghost.total++;
          if(parsed.raw[index]!==parsed.expected[index])ghost.errors++;
        }
      }
    }
    const parsed=parseTyping(ghost.value,false,data.target);
    opponent.progress=Math.min(parsed.text.length/data.target.length*100,100);
    opponent.position=Math.min(parsed.text.length,data.target.length);
    opponent.wpm=replaySpeedsAt(ghost.readings,time).average;
    opponent.accuracy=ghost.total?Math.round((ghost.total-ghost.errors)/ghost.total*100):100;
    if(elapsedMs>=data.durationMs){
      opponent.finished=true;opponent.finishMs=data.durationMs;
      opponent.passageComplete=parsed.text===data.target&&!parsed.extraCount;
      opponent.gaveUp=!opponent.passageComplete;
      if(Number.isFinite(ghost.result.wpm))opponent.wpm=ghost.result.wpm;
      if(Number.isFinite(ghost.result.accuracy))opponent.accuracy=ghost.result.accuracy;
    }
    checkFinished();publish();
  }
  function report(finished, elapsedMs){
    if(!api.active||api.spectating||(relay&&!relayStarted&&!finished&&!done)||phase!=='racing'||(!finished&&Date.now()-lastReport<150))return;
    lastReport=Date.now();
    // A periodic update must never undo an already completed local race.
    const completed=!!(finished||done);
    if(completed&&!submittedReplay){
      submittedReplay=true;localResultId=gaveUp?null:(lastResultId||null);
      const replay=captureAttemptReplay();
      attemptReplays.set(self,replay);
      if(!host)send(links.get('host'),{type:'attemptReplay',round,replay});
    }
    if(completed&&finishMs===null)finishMs=Math.min(duration*1000,Math.max(0,relay?Date.now()-roundStartsAt:(elapsedMs??Date.now()-start)));
    const savedResult=localResultId?history.find(result=>result.id===localResultId):null;
    const data={type:'progress',round,...(relay?{relayInput:input.value.slice(0,20000)}:{}),position:typed.length,progress:Math.min(typed.length/target.length*100,100),wpm:completed&&savedResult?savedResult.wpm:speed(),accuracy:total?Math.round((total-errors)/total*100):100,finished:completed,gaveUp,finishMs,passageComplete:completed&&!gaveUp&&typed===target&&!parseTyping(input.value).extraCount};
    if(completed)paintChatAvailability();
    if(completed)status(gaveUp?'You gave up · waiting for the final standings.':'You finished · waiting for the other racers.');
    if(host){Object.assign(players[self],data);checkFinished();publish();}else send(links.get('host'),data);
  }
  function open(){
    if(api.active){$('#racePanel').scrollIntoView({behavior:'smooth'});return;}
    pauseMenu();currentMenu='raceLobby';setReadingView(false);updateBookProgress();syncNavigation(true);
    document.body.classList.add('race-lobby-open');$('#raceLobby').hidden=false;
    $('#modal').close();
    $('#createRoom').disabled=$('#createPrivateRoom').disabled=$('#joinRoom').disabled=false;showError('');
    const invite=new URL(location.href).searchParams.get('race');
    $('#roomCode').value=invite||'';
    $('#joinRoom').focus();
    window.raceRooms?.start(renderAvailableRooms);
    window.raceRooms?.startChat?.((messages,state)=>{renderChat('lobbyChatLog',messages);$('#lobbyChatStatus').textContent=state==='ready'?'':'Lobby chat is reconnecting. You can send when it reconnects.';});
  }
  function randomRacerName(){
    const adjectives=['Swift','Bright','Calm','Brave','Keen','Nimble','Steady','Quiet'];
    const animals=['Sparrow','Otter','Robin','Fox','Wren','Falcon','Finch','Owl'];
    return adjectives[Math.floor(Math.random()*adjectives.length)]+' '+animals[Math.floor(Math.random()*animals.length)]+' '+Math.floor(10+Math.random()*90);
  }
  function withRacerName(action){
    const existing=getProfileName()||raceNameSession;
    if(existing){action(cleanName(existing));return;}
    if(pendingNameAction)return;
    pendingNameAction=action;$('#raceName').value='';
    if(!$('#raceNameDialog').open)$('#raceNameDialog').showModal();
    $('#raceName').focus();
  }
  function completeRaceName(random=false){
    const action=pendingNameAction;
    if(!action)return;
    pendingNameAction=null;
    const entered=random?'':$('#raceName').value.trim();
    const name=entered?cleanName(entered):randomRacerName();
    $('#raceNameDialog').close();
    try{localStorage.setItem('logostype-racer',name);raceNameSession='';}catch{raceNameSession=name;}
    updateProfileLabel();action(name);
  }
  $('#confirmRaceName').onclick=()=>completeRaceName();
  $('#raceName').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();completeRaceName();}};
  $('#raceNameDialog').addEventListener('cancel',event=>{event.preventDefault();completeRaceName(true);});
  function joinCode(code,intent='join'){
    if($('#joinRoom').disabled)return;
    code=code.trim().toLowerCase();
    if(!/^[a-f0-9]{8}$/.test(code)){
      if($('#joinCodeDialog').open)$('#roomCodeError').textContent='Enter the 8-character room code.';
      else showError('Enter the 8-character room code.');
      return;
    }
    $('#joinCodeDialog').close();$('#roomCodeError').textContent='';
    showError('');withRacerName(name=>connect(false,code,name,intent));
  }
  function updateJoinAction(){
    const code=$('#roomCode').value.trim().toLowerCase();
    const listing=directoryRooms.find(room=>room.code===code);
    $('#confirmJoinRoom').textContent=listing&&(listing.phase==='racing'||listing.phase==='countdown')?'queue →':'join →';
  }
  $('#roomCode').oninput=()=>{$('#roomCodeError').textContent='';updateJoinAction();};
  function renderAvailableRooms(rooms, state){
    directoryRooms=rooms;updateJoinAction();
    const list=$('#availableRooms');
    const listingState=JSON.stringify([rooms,$('#joinRoom').disabled]);
    $('#roomDirectoryStatus').textContent=state==='ready'?(rooms.length?'Choose a room to join, queue, or watch.':'No rooms are open yet. Create one to get started.'):
      state==='unavailable'?'Room discovery is unavailable. You can still create a room or join by code.':'Looking for rooms…';
    if(list._listingState===listingState)return;
    list._listingState=listingState;list.replaceChildren();
    for(const listing of rooms){
      const row=document.createElement('div');row.className='available-room';
      const details=document.createElement('div');details.textContent=listing.name+' · '+listing.code;
      const summary=document.createElement('small');
      const locked=listing.phase==='racing'||listing.phase==='countdown';
      summary.textContent=listing.count+'/8 racers · '+(locked?'racing':listing.count>=8?'full':'open');details.append(summary);
      const button=document.createElement('button');button.type='button';button.textContent=locked?'queue':'join';
      button.disabled=(!locked&&listing.count>=8)||$('#joinRoom').disabled;
      button.onclick=()=>{$('#roomCode').value=listing.code;joinCode(listing.code,locked?'queue':'join');};
      const actions=document.createElement('div');actions.className='room-actions';actions.append(button);
      const watch=document.createElement('button');watch.type='button';watch.textContent='watch';watch.disabled=$('#joinRoom').disabled;watch.onclick=()=>joinCode(listing.code,'watch');actions.append(watch);
      row.append(details,actions);list.append(row);
    }
  }
  function createRoom(privateRoom=false){
    if($('#createRoom').disabled||$('#createPrivateRoom').disabled)return;
    showError('');withRacerName(name=>connect(true,Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>n.toString(16).padStart(2,'0')).join(''),name,'join',privateRoom));
  }
  $('#createRoom').onclick=()=>createRoom();
  $('#createPrivateRoom').onclick=()=>createRoom(true);
  $('#joinRoom').onclick=()=>{
    if($('#joinRoom').disabled)return;
    $('#roomCodeError').textContent='';updateJoinAction();
    if(!$('#joinCodeDialog').open)$('#joinCodeDialog').showModal();
    $('#roomCode').focus();
  };
  $('#confirmJoinRoom').onclick=()=>joinCode($('#roomCode').value);
  $('#cancelJoinCode').onclick=()=>{$('#joinCodeDialog').close();$('#joinRoom').focus();};
  $('#roomCode').onkeydown=event=>{
    if(event.key==='Enter'&&!event.isComposing){event.preventDefault();$('#confirmJoinRoom').click();}
  };
  $('#words').addEventListener('scroll',paintTextPositions);
  window.addEventListener('resize',paintTextPositions);
  $('#raceNewAttempt').onclick=()=>{
    if(!ghost||phase!=='finished'||!localResultId)return;
    const result=history.find(item=>item.id===localResultId);
    if(!result?.replay)return;
    ghost={result,readings:buildReplayReadings(result.replay),durationSeconds:duration};
    players['replay-ghost'].name='replay · '+result.date;
    startGhostRound();
  };
  for(const [name,icon,speed] of botSpeeds){
    const button=document.createElement('button');button.type='button';button.textContent=icon;
    button.title=name+' · '+speed+' WPM';button.setAttribute('aria-label','Add '+name+' bot at '+speed+' WPM');
    button.onclick=()=>addBot(speed);$('#raceBotChoices').append(button);
  }
  $('#relayMode').onclick=()=>{if(!host||ghost||raceSettingsLocked())return;editRelayTeams();settingsChanged();relay=!relay;if(relay){let lane=0;for(const player of Object.values(players))if(player.connected!==false&&isRacer(player))joinRelayLane(player,++lane);}publish();};
  function requestLane(lane){
    if(host)selectLane(self,lane);else send(links.get('host'),{type:'lane',lane});
  }
  function addRelayLane(id){
    if(!relay||raceSettingsLocked()||players[id]?.ready||relayLaneCount>=8||!players[id]||players[id].connected===false||!isRacer(players[id]))return;
    if(Object.values(players).filter(p=>p.connected!==false&&isRacer(p)&&p.lane===players[id].lane).length<2)return;
    editRelayTeams();settingsChanged();joinRelayLane(players[id],relayLaneCount+1);publish();
  }
  $('#addRelayLane').onclick=()=>{if(host)addRelayLane(self);else send(links.get('host'),{type:'add-lane'});};
  $('#raceDurationForm').onsubmit=e=>e.preventDefault();
  $('#shuffleRacePassage').onclick=()=>{if(passageMode==='verse')preparePassage();};
  $('#raceFormatting').onclick=()=>{
    if(!host||!api.active||raceSettingsLocked())return;
    raceFormatting=!raceFormatting;
    preparePassage(false);
  };
  document.querySelectorAll('[data-race-passage]').forEach(button=>button.onclick=()=>{
    if(!host||!api.active||raceSettingsLocked())return;
    passageMode=button.dataset.racePassage;
    document.querySelectorAll('[data-race-passage]').forEach(option=>{
      const active=option.dataset.racePassage===passageMode;
      option.classList.toggle('active',active);
      option.setAttribute('aria-pressed',String(active));
    });
    $('#raceCustomTextGroup').hidden=passageMode!=='custom';
    $('#raceCustomText').required=passageMode==='custom';
    preparePassage();
  });
  $('#raceCustomText').oninput=()=>{if(!host||raceSettingsLocked())return;$('#raceCustomText').setCustomValidity('');preparePassage();};
  $('#giveUpRace').onclick=()=>{
    if(done||!lastRacer(self))return;
    gaveUp=true;$('#giveUpRace').hidden=true;finish(false);
  };
  $('#friends').onclick=open;$('#leaveRace').onclick=requestLeave;
  for(const [button,destination] of [[$('#home'),enterTyping],[$('.brand'),enterBook]])button.onclick=()=>{
    if(api.active){requestLeave(destination);return;}
    destination();
  };
  window.addEventListener('beforeunload',event=>{
    if(!api.active||api.spectating)return;
    event.preventDefault();event.returnValue='';
  });
  async function copyRoomInvite(fullLink){
    const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('race',room);
    const value=fullLink?url.href:room;
    try{
      await navigator.clipboard.writeText(value);
      status(fullLink?'Full link copied. Send it to your friends.':'Room code copied. Send it to your friends.');
    }catch{
      status('Could not copy automatically. '+(fullLink?'Full link: ':'Room code: ')+value);
    }
  }
  $('#copyRoomCode').onclick=()=>copyRoomInvite(false);
  $('#copyInvite').onclick=()=>copyRoomInvite(true);
  $('#lobbyChatForm').onsubmit=event=>{
    event.preventDefault();const field=$('#lobbyChatInput'),text=field.value.trim();if(!text)return;
    withRacerName(name=>{
      if(window.raceRooms?.sendChat(name,text)){$('#lobbyChatStatus').textContent='';if(field.value.trim()===text)field.value='';}
      else $('#lobbyChatStatus').textContent='Please wait a moment and retry. Chat may be reconnecting.';
    });
  };
  $('#roomChatForm').onsubmit=event=>{
    event.preventDefault();const field=$('#roomChatInput'),text=field.value.trim();if(!text)return;
    if(racerChatLocked(self)){$('#roomChatStatus').textContent='Chat is disabled while you type your part of the race.';return;}
    if(sendRoomChat(text)){$('#roomChatStatus').textContent='';field.value='';}
    else $('#roomChatStatus').textContent='Please wait a moment and retry. Chat may be reconnecting.';
  };
  $('#roomVisibility').onclick=()=>{
    if(!host||ghost||!api.active||hostIsReady())return;
    if(unlisted){
      if(!$('#publicRoomDialog').open)$('#publicRoomDialog').showModal();
      $('#cancelPublicRoom').focus();
      return;
    }
    settingsChanged();unlisted=true;publish();
  };
  $('#cancelPublicRoom').onclick=()=>$('#publicRoomDialog').close();
  $('#confirmPublicRoom').onclick=()=>{
    $('#publicRoomDialog').close();
    if(!host||ghost||!api.active||hostIsReady()||!unlisted)return;
    settingsChanged();unlisted=false;publish();
  };
  $('#cancelRemoveRacer').onclick=()=>{pendingRemove=null;$('#removeRacerDialog').close();};
  $('#removeRacerDialog').addEventListener('cancel',()=>{pendingRemove=null;});
  $('#confirmRemoveRacer').onclick=()=>{
    const id=pendingRemove;pendingRemove=null;$('#removeRacerDialog').close();
    if(!host||!api.active||hostIsReady()||!id||id===self||!players[id])return;
    settingsChanged();
    const link=links.get(id);removedPeers.add(id);players[id].connected=false;
    if(!players[id].finished){players[id].finished=true;players[id].passageComplete=false;}
    send(link,{type:'removed'});roomProfiles.delete(id);links.delete(id);checkFinished();publish();
    setTimeout(()=>link?.close(),200);
  };
  $('#readyRace').onclick=()=>{if(host)setReady(self,!players[self]?.ready);else send(links.get('host'),{type:'ready',ready:!players[self]?.ready});};
  $('#queueRace').onclick=()=>{if(api.spectating)send(links.get('host'),{type:'queue'});};
  $('#startRace').onclick=()=>{
    if(!host||$('#startRace').disabled)return;
    if(ghost){startGhostRound();return;}
    const customMode=passageMode==='custom';
    let text=preparedText;
    if(customMode){
      const passage=$('#raceCustomText');
      text=preparedText;
      passage.setCustomValidity(!text?'Enter a passage for the race.':text.length>10000?'Use at most 10,000 characters.':'');
      if(!passage.reportValidity())return;
    }
    if(!text)return;
    if(!allRacersReady()||!readyStartAllowed()){status('Wait one second after everyone is ready.');return;}
    promoteQueued();
    if(relay){
      normalizeRelayLanes();
      const racers=Object.values(players).filter(p=>p.connected!==false&&isRacer(p));
      if(!racers.length||racers.some(p=>!p.lane)){status('Choose a lane for every racer.');return;}
      relayLegs=buildRelayLegs(text,players);
      if(Object.values(relayLegs).some(leg=>!leg.text)){status('Use at least as many words as the largest team has players.');return;}
    }else relayLegs={};
    publish();
    const data={type:'start',round:round+1,text,relay,relayLegs,duration:defaultRaceDuration(text),custom:customMode,formatting:raceFormatting};broadcast(data);begin(data);
  };
  $('#modal').addEventListener('close',()=>{if(!api.active){syncNavigation();if(peer){clearTimeout(connectionTimeout);peer.destroy();peer=null;}}});
  const invitedRoom=new URL(location.href).searchParams.get('race');
  if(invitedRoom!==null){
    open();
    joinCode(invitedRoom);
  }
})();
