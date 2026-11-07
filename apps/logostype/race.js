/* Private friend rooms: the host relays standings over WebRTC data channels. */
(() => {
  const api = window.friendRace = {active:false, running:false, preparing:false, spectating:false, report, raceReplay, paintTextPositions, restartReplay, getReplay:()=>roundReplay};
  let peer, host=false, self='', room='', players={}, links=new Map(), phase='lobby', round=0;
  let countdownTimeout, clock, connectionTimeout, lastReport=0, saved, duration=120, gaveUp=false, celebratedRound=null;
  let unlisted=false, pendingRemove=null;
  let roomMessages=[], roomChatSequence=0, localRoomChatAt=-Infinity;
  const roomChatTimes=new Map();
  const removedPeers=new Set();
  let ghost=null, attemptReplays=new Map(), roundReplay=null, submittedReplay=false, localResultId=null;
  let roundStartsAt=0, watchStartsAt=0, queueSequence=0, directoryRooms=[], raceNameSession='', pendingNameAction=null;
  const textMarkers=new Map();
  let markerLayout='';
  const isRacer=player=>player.role!=='watcher'&&player.role!=='queued';
  let passageMode='verse', preparedText='', preparedVerseIndex=-1, raceFormatting=false, finishMs=null;
  const cleanName = value => String(value || 'typist').trim().slice(0,24) || 'typist';
  const status = message => { $('#raceStatus').textContent=message; };
  function send(connection, data) { if(connection?.open) connection.send(data); }
  function broadcast(data) { for(const connection of links.values()) send(connection,data); }
  function snapshot() { return {type:'roster', players, phase, round, unlisted, clock:{untilStartMs:Math.max(0,roundStartsAt-Date.now()),elapsedMs:Math.max(0,Date.now()-roundStartsAt),duration}, preview:{text:preparedText, custom:passageMode==='custom', duration:Number($('#raceDuration').value), formatting:raceFormatting}}; }
  function publish() {
    paint();
    if(host){
      broadcast(snapshot());
      if(!ghost&&api.active)window.raceRooms?.setRoom(unlisted?null:{code:room,name:players[self]?.name||'typist',
        count:Object.values(players).filter(player=>player.connected!==false&&isRacer(player)).length,phase});
    }
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
  function preparePassage(shuffle=true) {
    if(ghost||!host||!api.active||phase==='countdown'||phase==='racing')return;
    const customMode=passageMode==='custom';
    if(customMode)preparedText=$('#raceCustomText').value.trim().replace(/\s+/g,' ');
    else {
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
    $('#raceDuration').value=defaultRaceDuration(preparedText);
    showPreparedPassage(preparedText,customMode);
    publish();
  }
  function lastRacer(id){
    const others=Object.entries(players).filter(([other,p])=>other!==id&&p.connected!==false&&isRacer(p));
    return phase==='racing'&&players[id]&&isRacer(players[id])&&players[id]?.connected!==false&&!players[id]?.finished&&others.length>0&&others.every(([,p])=>p.finished);
  }
  function completedPassage(player) {
    return !!(player.finished && !player.gaveUp && player.progress >= 100 && player.passageComplete !== false);
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
  function racerChatLocked(id){return !!players[id]&&isRacer(players[id])&&(phase==='countdown'||phase==='racing');}
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
    layer.hidden=!api.active||phase==='lobby';
    if(layer.hidden||!words.clientWidth){clearTextPositions();return;}
    const layout=words.clientWidth+':'+words.clientHeight+':'+words.scrollTop;
    snap=!!snap||layout!==markerLayout;markerLayout=layout;
    const visible=new Set();
    const box=words.getBoundingClientRect(), parent=$('.test').getBoundingClientRect();
    layer.style.left=box.left-parent.left+'px';layer.style.top=box.top-parent.top+'px';
    layer.style.width=box.width+'px';layer.style.height=box.height+'px';
    const colors=['#d08770','#5e81ac','#b48ead','#a3be8c','#d9a441','#bf616a','#48a0a0'];
    const labels=[];
    const opponents=Object.entries(players).filter(([id,player])=>id!==self&&player.connected!==false&&isRacer(player)).sort(([a],[b])=>a.localeCompare(b));
    for(const [index,[id,player]] of opponents.entries()){
      const position=Number.isInteger(player.position)?Math.max(0,Math.min(target.length,player.position)):
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
  function removeButton(id,player){
    const button=document.createElement('button');button.type='button';button.className='race-remove';button.textContent='remove';
    button.setAttribute('aria-label','Remove '+player.name+' from room');
    button.onclick=()=>{
      if(!host||ghost||!api.active)return;
      pendingRemove=id;$('#removeRacerMessage').textContent='Remove '+player.name+' from this room?';
      if(!$('#removeRacerDialog').open)$('#removeRacerDialog').showModal();
      $('#cancelRemoveRacer').focus();
    };
    return button;
  }
  function paint() {
    api.spectating=!!players[self]&&!isRacer(players[self]);
    document.body.classList.toggle('race-spectator',api.spectating);
    if(api.spectating){api.running=false;input.disabled=true;$('#typingCaret').hidden=true;}
    const chatLocked=racerChatLocked(self), wasChatLocked=$('#roomChatInput').disabled;
    $('#roomChatInput').disabled=chatLocked;$('#roomChatSend').disabled=chatLocked;
    if(chatLocked)$('#roomChatStatus').textContent='Chat is disabled for racers until this round ends.';
    else if(wasChatLocked)$('#roomChatStatus').textContent='';
    const list=$('#racers'); list.replaceChildren();
    paintTextPositions();
    const ordered=raceStandings(players);
    for(const [index,[id,p]] of ordered.entries()){
      const row=document.createElement('div');row.className='racer';
      const name=document.createElement('span');name.className='race-label';name.textContent=p.name+(id===self?' (you)':'')+(p.connected===false?' · left':'');
      const track=document.createElement('div');track.className='race-track';const bar=document.createElement('i');bar.style.width=`${Math.max(0,Math.min(100,p.progress||0))}%`;track.append(bar);
      if(completedPassage(p)){
        const place=document.createElement('span');place.className='race-place';place.textContent=finishPlace(index);track.append(place);
        if(index===0)row.classList.add('race-winner');
        track.setAttribute('aria-label',p.name+' · '+finishPlace(index)+' place');
      }
      const score=document.createElement('span');score.textContent=p.gaveUp?'gave up':phase==='finished'?`${p.wpm||0} wpm · ${p.accuracy??100}%`:phase==='lobby'?'ready':`${Math.round(p.progress||0)}%${p.finished?' · finished':''}`;
      if(p.finished&&!p.gaveUp&&Number.isFinite(p.finishMs))score.textContent+=` · ${(p.finishMs/1000).toFixed(2)}s`;
      if(host&&!ghost&&id!==self&&p.connected!==false)name.append(removeButton(id,p));
      row.append(name,track,score);
      list.append(row);
    }
    const connected=Object.values(players).filter(p=>p.connected!==false&&p.role!=='watcher');
    $('#giveUpRace').hidden=api.spectating||done||!lastRacer(self);
    $('#queueRace').hidden=!api.spectating||players[self]?.role==='queued';
    $('#raceAudience').replaceChildren();
    for(const [id,player] of Object.entries(players).filter(([,player])=>player.connected!==false&&!isRacer(player))){
      const row=document.createElement('div');row.className='race-audience-member';
      const label=document.createElement('span');label.textContent=player.name+(id===self?' (you)':'');row.append(label);
      if(host&&!ghost&&id!==self)row.append(removeButton(id,player));
      const state=document.createElement('span');state.textContent=player.role==='queued'?'queued for next race':'watching';row.append(state);
      $('#raceAudience').append(row);
    }
    $('#roomVisibility').hidden=!host||!!ghost;
    $('#roomVisibility').textContent=unlisted?'make public':'make private';
    $('#roomPrivacyStatus').textContent=ghost?'':unlisted?'private room · code or invite only':'public room · listed for everyone';
    $('#replayAllResult').hidden=phase!=='finished'||!roundReplay||!done;
    $('#raceNewAttempt').hidden=!ghost||phase!=='finished'||!localResultId||!history.find(result=>result.id===localResultId)?.replay;
    $('#startRace').hidden=!host;$('#raceDurationForm').hidden=!host||!!ghost;$('#raceInvite').hidden=!!ghost;$('#raceDuration').disabled=phase==='countdown'||phase==='racing';
    const locked=phase==='countdown'||phase==='racing';
    $('#raceCustomText').disabled=locked;
    document.querySelectorAll('[data-race-passage]').forEach(button=>button.disabled=locked);
    $('#shuffleRacePassage').hidden=passageMode!=='verse';
    $('#shuffleRacePassage').disabled=locked;
    $('#raceFormatting').disabled=locked;
    $('#raceFormatting').classList.toggle('active',raceFormatting);
    $('#raceFormatting').setAttribute('aria-pressed',String(raceFormatting));
    $('#startRace').disabled=connected.length<2||phase==='countdown'||phase==='racing';
    $('#startRace').textContent=phase==='finished'?'race again →':'start race →';
    if(phase==='lobby')status(host?'Share the invite link. Start when everyone has joined.':'You’re in! Waiting for the host to start.');
    if(phase==='finished'){$('#wpm').parentElement.hidden=false;$('#rawWpm').parentElement.hidden=false;$('#chart').hidden=false;$('#chartLegend').hidden=false;if(done)drawChart();}
    if(phase==='finished'){
      const winner=ordered.find(([,player])=>completedPassage(player));
      status('Race complete'+(winner?' · '+winner[1].name+' wins':' · no racer finished the passage')+' · finishers ranked by time; unfinished racers are unranked. '+(ghost?'Race again to challenge this replay.':'The host can start a rematch.'));
      if(winner?.[0]===self&&celebratedRound!==round){celebratedRound=round;celebrateJourney(7,4500);}
    }
    if(api.spectating)status(players[self]?.role==='queued'?'Queued for the next race · watching this round.':'Watching this race · queue to participate in the next round.');
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
    $('#inviteLink').value=`${location.origin}${location.pathname}?race=${room}`;
    $('#modal').close();renderChat('roomChatLog',roomMessages);if(host&&!ghost)preparePassage();paint();
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
    if(api.active)leave(undefined,!next);
    if(next)next();
  };
  function leave(message, returnToLobby=true) {
    if($('#removeRacerDialog').open)$('#removeRacerDialog').close();pendingRemove=null;
    hideCountdown();
    if($('#restartReplayDialog').open)$('#restartReplayDialog').close();
    if($('#leaveRaceDialog').open)$('#leaveRaceDialog').close();
    clearInterval(clock);clearTimeout(connectionTimeout);clearInterval(timer);
    api.active=false;api.running=false;api.spectating=false;
    roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;renderChat('roomChatLog',[]);$('#roomChatInput').value='';$('#roomChatStatus').textContent='';
    window.raceRooms?.setRoom(null);
    $('#raceTextMarkers').hidden=true;clearTextPositions();
    syncNavigation();
    peer?.destroy();peer=null;ghost=null;attemptReplays.clear();roundReplay=null;links.clear();players={};phase='lobby';round=0;celebratedRound=null;
    $('#racePanel').hidden=true;document.body.classList.remove('in-room','replay-race','race-spectator');$('.config').inert=false;
    if(saved){({mode,limit}=saved);saved=null;}
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const url=new URL(location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url);
    if(returnToLobby){open();if(message)showError(message);}
  }
  function connect(isHost, code, name, intent='join', privateRoom=false) {
    if(peer)peer.destroy();clearTimeout(connectionTimeout);
    roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;roomChatSequence=0;
    ghost=null;removedPeers.clear();unlisted=!!isHost&&privateRoom;host=isHost;room=code;players={};links=new Map();phase='lobby';round=0;queueSequence=0;celebratedRound=null;preparedText='';
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
        const locked=phase==='racing'||phase==='countdown';
        if(links.size>=31){send(connection,{type:'reject',message:'This room is full of racers and viewers. Try again later.'});setTimeout(()=>connection.close(),300);return;}
        const requested=connection.metadata?.intent;
        const reserved=Object.values(players).filter(p=>p.connected!==false&&p.role!=='watcher').length;
        const role=requested==='watch'?'watcher':locked||reserved>=8?'queued':'racer';
        players[connection.peer]={name:cleanName(connection.metadata?.name),role,queueOrder:role==='queued'?++queueSequence:0,connected:true,finished:false,wpm:0,progress:0};
        links.set(connection.peer,connection);wire(connection);send(connection,{type:'roomChatHistory',messages:roomMessages});publish();
      });
    });
    function wire(connection){
      connection.on('open',()=>{if(!host)send(connection,{type:'hello'});});
      connection.on('data',data=>{
        if(!data||typeof data!=='object')return;
        if(host){
          if(!players[connection.peer]||removedPeers.has(connection.peer))return;
          if(data.type==='hello'){send(connection,snapshot());send(connection,{type:'roomChatHistory',messages:roomMessages});}
          if(data.type==='chat-message'){acceptRoomChat(connection.peer,data.text);return;}
          if(data.type==='queue'&&!isRacer(players[connection.peer])){
            players[connection.peer].role='queued';players[connection.peer].queueOrder||=++queueSequence;publish();
          }
          if(!isRacer(players[connection.peer]))return;
          if(data.type==='attemptReplay'&&data.round===round&&!attemptReplays.has(connection.peer)){
            try{
              const replay=validateAttemptReplay(data.replay);
              if(replay.target!==target)return;
              attemptReplays.set(connection.peer,replay);
              if(phase==='finished')publishRaceReplay();
            }catch{return;}
          }
          if(data.type==='progress'&&data.round===round&&phase==='racing'){
            const p=players[connection.peer];
            if(data.gaveUp&&!p.finished&&!lastRacer(connection.peer))return;
            if(!p.finished){
              p.progress=Math.max(0,Math.min(100,Number(data.progress)||0));p.wpm=Math.max(0,Math.min(500,Number(data.wpm)||0));p.accuracy=Math.max(0,Math.min(100,Number(data.accuracy)||0));p.finished=!!data.finished;
              p.position=Number.isInteger(data.position)?Math.max(0,Math.min(target.length,data.position)):Math.round(p.progress/100*target.length);
              p.gaveUp=!!data.gaveUp;
              p.passageComplete=p.finished&&!p.gaveUp&&p.progress===100&&data.passageComplete!==false;
              p.finishMs=p.finished&&Number.isSafeInteger(data.finishMs)&&data.finishMs>=0&&data.finishMs<=duration*1000?data.finishMs:null;
            }
            checkFinished();publish();
          }
        } else {
          if(data.type==='roomChat'){receiveRoomChat(data.message);return;}
          if(data.type==='roomChatHistory'&&Array.isArray(data.messages)&&data.messages.length<=50){roomMessages=data.messages.map(cleanRoomChat).filter(Boolean);renderChat('roomChatLog',roomMessages);return;}
          if(data.type==='removed'){leave('The host removed you from this room.');return;}
          if(data.type==='reject'){failure(data.message);return;}
          if(data.type==='roundReplay'&&data.round===round){saveRaceReplay(data.replay);paint();}
          if(data.type==='roster'){
            if(!data.players||!data.players[self])return;
            players=data.players;phase=data.phase;round=data.round;unlisted=!!data.unlisted;api.spectating=!isRacer(players[self]);if(phase==='finished'){clearInterval(clock);api.running=false;}
            if(!api.active){clearTimeout(connectionTimeout);showRoom();}
            const preview=data.preview;
            if((api.spectating||phase==='lobby'||phase==='finished')&&preview&&typeof preview.text==='string'&&preview.text.length<=10000&&Number.isInteger(preview.duration)&&preview.duration>=1&&preview.duration<=4000){
              raceFormatting=preview.formatting!==false;
              if(preparedText!==preview.text){preparedText=preview.text;showPreparedPassage(preparedText,preview.custom===true);}
              $('#raceDuration').value=preview.duration;
            }
            if(api.spectating)syncWatchClock(data.clock);
            paint();
          }
          if(data.type==='start'&&typeof data.text==='string'&&data.text.trim().length>0&&data.text.length<=10000&&Number.isInteger(data.duration)&&data.duration>=1&&data.duration<=4000){if(api.spectating)beginWatching(data);else begin(data);}
        }
      });
      connection.on('close',()=>{
        if(!api.active)return;
        if(!host){leave('The host left the room. Create a new room or join another.');return;}
        if(players[connection.peer])players[connection.peer].connected=false;
        links.delete(connection.peer);checkFinished();publish();
      });
      connection.on('error',()=>status('A friend lost connection. They can leave and rejoin after the race.'));
    }
  }
  function promoteQueued(){
    let slots=8-Object.values(players).filter(player=>player.connected!==false&&isRacer(player)).length;
    const queued=Object.values(players).filter(player=>player.connected!==false&&player.role==='queued').sort((a,b)=>(a.queueOrder||0)-(b.queueOrder||0));
    for(const player of queued){if(slots--<=0)break;player.role='racer';}
  }
  function beginWatching(data){
    clearTextPositions();
    raceFormatting=data.formatting!==false;
    round=data.round;phase='countdown';roundReplay=null;localResultId=null;
    preparedText=data.text;showPreparedPassage(data.text,data.custom===true);
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
      else{hideCountdown();$('#counter').textContent='watching · '+Math.max(0,Math.ceil(duration+(remaining/1000)))+'s';}
    }
    tick();clock=setInterval(tick,100);
  }
  function checkFinished(){
    if(phase==='racing'&&Object.values(players).filter(p=>p.connected!==false&&isRacer(p)).every(p=>p.finished)){phase='finished';clearInterval(clock);api.running=false;if(host)publishRaceReplay();}
  }
  function begin(data){
    clearTextPositions();
    attemptReplays=new Map();roundReplay=null;submittedReplay=false;localResultId=null;
    if(ghost)attemptReplays.set('replay-ghost',ghost.result.replay);
    raceFormatting=data.formatting!==false;
    punctuation=capitalization=raceFormatting;
    hideCountdown();showCountdown(3);
    duration=data.duration;round=data.round;celebratedRound=null;phase='countdown';api.running=false;lastReport=0;gaveUp=false;finishMs=null;
    for(const [id,p] of Object.entries(players)){
      if(p.connected===false){delete players[id];continue;}
      p.progress=0;p.position=0;p.wpm=0;p.finished=false;p.gaveUp=false;p.finishMs=null;p.passageComplete=false;
    }
    api.preparing=true;mode=data.custom===true?'custom':'quote';limit=25;reset();api.preparing=false;
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    target=data.text;rawTarget=data.text;input.disabled=false;render();input.blur();done=false;
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
      if(phase==='countdown'){
        phase='racing';api.running=true;start=startsAt;
        showCountdown('GO!');countdownTimeout=setTimeout(hideCountdown,700);
        document.body.classList.add('running');status('Go! Type the same words as your friends.');input.focus();
      }
      if(phase==='racing'){
        const elapsed=(Date.now()-start)/1000;
        if(ghost)updateGhost(elapsed*1000);
        if(!done){
          $('#counter').textContent=`${Math.max(0,Math.ceil(duration-elapsed))}s`;
          sampleWpm();if(elapsed>=duration)finish();
        }
        // Repeat the terminal report until the host acknowledges the round as finished.
        report(false);
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
  function publishRaceReplay(){
    if(!host||phase!=='finished')return;
    const participants=raceStandings(players).map(([id,player],index)=>({
      id,name:player.name,wpm:player.wpm||0,accuracy:player.accuracy??100,place:completedPassage(player)?index+1:null,completed:completedPassage(player),
      gaveUp:!!player.gaveUp,finishMs:Number.isFinite(player.finishMs)?player.finishMs:null,
      replay:attemptReplays.get(id)||null
    }));
    saveRaceReplay({participants});
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
    ghost={result,readings:buildReplayReadings(result.replay)};
    host=true;self='replay-you';room='';round=0;phase='lobby';links.clear();
    players={
      [self]:{name,connected:true,finished:false,wpm:0,progress:0},
      'replay-ghost':{name:'replay · '+result.date,connected:true,finished:false,wpm:0,progress:0}
    };
    roomMessages=[];roomChatTimes.clear();localRoomChatAt=-Infinity;
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
      opponent.passageComplete=parsed.text.length>=data.target.length;
      if(Number.isFinite(ghost.result.wpm))opponent.wpm=ghost.result.wpm;
      if(Number.isFinite(ghost.result.accuracy))opponent.accuracy=ghost.result.accuracy;
    }
    checkFinished();publish();
  }
  function report(finished, elapsedMs){
    if(!api.active||api.spectating||phase!=='racing'||(!finished&&Date.now()-lastReport<150))return;
    lastReport=Date.now();
    // A periodic update must never undo an already completed local race.
    const completed=!!(finished||done);
    if(completed&&!submittedReplay){
      submittedReplay=true;localResultId=gaveUp?null:(lastResultId||null);
      const replay=captureAttemptReplay();
      attemptReplays.set(self,replay);
      if(!host)send(links.get('host'),{type:'attemptReplay',round,replay});
    }
    if(completed&&finishMs===null)finishMs=Math.min(duration*1000,Math.max(0,elapsedMs??Date.now()-start));
    const savedResult=localResultId?history.find(result=>result.id===localResultId):null;
    const data={type:'progress',round,position:typed.length,progress:Math.min(typed.length/target.length*100,100),wpm:completed&&savedResult?savedResult.wpm:speed(),accuracy:total?Math.round((total-errors)/total*100):100,finished:completed,gaveUp,finishMs,passageComplete:completed&&!gaveUp&&typed.length>=target.length};
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
    const list=$('#availableRooms');list.replaceChildren();
    $('#roomDirectoryStatus').textContent=state==='ready'?(rooms.length?'Choose a room to join, queue, or watch.':'No rooms are open yet. Create one to get started.'):
      state==='unavailable'?'Room discovery is unavailable. You can still create a room or join by code.':'Looking for rooms…';
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
  $('#raceDurationForm').onsubmit=e=>e.preventDefault();
  $('#shuffleRacePassage').onclick=()=>{if(passageMode==='verse')preparePassage();};
  $('#raceFormatting').onclick=()=>{
    if(!host||!api.active||phase==='countdown'||phase==='racing')return;
    raceFormatting=!raceFormatting;
    preparePassage(false);
  };
  document.querySelectorAll('[data-race-passage]').forEach(button=>button.onclick=()=>{
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
  $('#raceCustomText').oninput=()=>{$('#raceCustomText').setCustomValidity('');preparePassage();};
  $('#raceDuration').oninput=()=>{if(host&&api.active)broadcast(snapshot());};
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
  $('#copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText($('#inviteLink').value);status('Invite copied. Send it to your friends.');}catch{$('#inviteLink').select();status('Select and copy the invite link to share it.');}};
  $('#lobbyChatForm').onsubmit=event=>{
    event.preventDefault();const field=$('#lobbyChatInput'),text=field.value.trim();if(!text)return;
    withRacerName(name=>{
      if(window.raceRooms?.sendChat(name,text)){$('#lobbyChatStatus').textContent='';if(field.value.trim()===text)field.value='';}
      else $('#lobbyChatStatus').textContent='Please wait a moment and retry. Chat may be reconnecting.';
    });
  };
  $('#roomChatForm').onsubmit=event=>{
    event.preventDefault();const field=$('#roomChatInput'),text=field.value.trim();if(!text)return;
    if(racerChatLocked(self)){$('#roomChatStatus').textContent='Chat is disabled for racers until this round ends.';return;}
    if(sendRoomChat(text)){$('#roomChatStatus').textContent='';field.value='';}
    else $('#roomChatStatus').textContent='Please wait a moment and retry. Chat may be reconnecting.';
  };
  $('#roomVisibility').onclick=()=>{if(host&&!ghost&&api.active){unlisted=!unlisted;publish();}};
  $('#cancelRemoveRacer').onclick=()=>{pendingRemove=null;$('#removeRacerDialog').close();};
  $('#removeRacerDialog').addEventListener('cancel',()=>{pendingRemove=null;});
  $('#confirmRemoveRacer').onclick=()=>{
    const id=pendingRemove;pendingRemove=null;$('#removeRacerDialog').close();
    if(!host||!api.active||!id||id===self||!players[id])return;
    const link=links.get(id);removedPeers.add(id);players[id].connected=false;
    if(!players[id].finished){players[id].finished=true;players[id].passageComplete=false;}
    send(link,{type:'removed'});links.delete(id);checkFinished();publish();
    setTimeout(()=>link?.close(),200);
  };
  $('#queueRace').onclick=()=>{if(api.spectating)send(links.get('host'),{type:'queue'});};
  $('#startRace').onclick=()=>{
    if(!host||$('#startRace').disabled)return;
    if(ghost){startGhostRound();return;}
    const field=$('#raceDuration');if(!field.reportValidity())return;const seconds=Number(field.value);if(!Number.isInteger(seconds)||seconds<1||seconds>4000)return;
    const customMode=passageMode==='custom';
    let text=preparedText;
    if(customMode){
      const passage=$('#raceCustomText');
      text=preparedText;
      passage.setCustomValidity(!text?'Enter a passage for the race.':text.length>10000?'Use at most 10,000 characters.':'');
      if(!passage.reportValidity())return;
    }
    if(!text)return;
    promoteQueued();publish();
    const data={type:'start',round:round+1,text,duration:seconds,custom:customMode,formatting:raceFormatting};broadcast(data);begin(data);
  };
  $('#modal').addEventListener('close',()=>{if(!api.active){syncNavigation();if(peer){clearTimeout(connectionTimeout);peer.destroy();peer=null;}}});
  if(new URL(location.href).searchParams.has('race'))open();
})();
