/* Private friend rooms: the host relays standings over WebRTC data channels. */
(() => {
  const api = window.friendRace = {active:false, running:false, preparing:false, report};
  let peer, host=false, self='', room='', players={}, links=new Map(), phase='lobby', round=0;
  let countdownTimeout, clock, connectionTimeout, lastReport=0, saved, duration=120, gaveUp=false;
  const cleanName = value => String(value || 'typist').trim().slice(0,24) || 'typist';
  const status = message => { $('#raceStatus').textContent=message; };
  function send(connection, data) { if(connection?.open) connection.send(data); }
  function broadcast(data) { for(const connection of links.values()) send(connection,data); }
  function snapshot() { return {type:'roster', players, phase, round}; }
  function publish() { paint(); if(host) broadcast(snapshot()); }
  function lastRacer(id){
    const others=Object.entries(players).filter(([other,p])=>other!==id&&p.connected!==false);
    return phase==='racing'&&players[id]?.connected!==false&&!players[id]?.finished&&others.length>0&&others.every(([,p])=>p.finished);
  }
  function paint() {
    const list=$('#racers'); list.replaceChildren();
    const ordered=Object.entries(players).sort((a,b)=>(!!a[1].gaveUp-!!b[1].gaveUp)||(b[1].finished-a[1].finished)||(b[1].wpm-a[1].wpm));
    for(const [id,p] of ordered){
      const row=document.createElement('div');row.className='racer';
      const name=document.createElement('span');name.className='race-label';name.textContent=p.name+(id===self?' (you)':'')+(p.connected===false?' · left':'');
      const track=document.createElement('div');track.className='race-track';const bar=document.createElement('i');bar.style.width=`${Math.max(0,Math.min(100,p.progress||0))}%`;track.append(bar);
      const score=document.createElement('span');score.textContent=p.gaveUp?'gave up':phase==='finished'?`${p.wpm||0} wpm · ${p.accuracy||100}%`:phase==='lobby'?'ready':`${Math.round(p.progress||0)}%${p.finished?' · finished':''}`;
      row.append(name,track,score);list.append(row);
    }
    const connected=Object.values(players).filter(p=>p.connected!==false);
    $('#giveUpRace').hidden=done||!lastRacer(self);
    $('#startRace').hidden=!host;$('#raceDurationForm').hidden=!host;$('#raceDuration').disabled=phase==='countdown'||phase==='racing';
    $('#startRace').disabled=connected.length<2||phase==='countdown'||phase==='racing';
    $('#startRace').textContent=phase==='finished'?'race again →':'start race →';
    if(phase==='lobby')status(host?'Share the invite link. Start when everyone has joined.':'You’re in! Waiting for the host to start.');
    if(phase==='finished'){$('#wpm').parentElement.hidden=false;$('#rawWpm').parentElement.hidden=false;$('#chart').hidden=false;$('#chartLegend').hidden=false;if(done)drawChart();}
    if(phase==='finished')status('Race complete · standings ranked by WPM. The host can start a rematch.');
  }
  function showError(message) { const el=$('#raceError');if(el)el.textContent=message;else status(message); }
  function showRoom() {
    saved={mode,limit};api.active=true;api.running=false;updateBookProgress();renderBookContext();
    syncNavigation(true);
    clearInterval(timer);document.body.classList.remove('focus','running');
    document.body.classList.add('in-room');$('.config').inert=true;
    $('#racePanel').hidden=false;$('#raceTitle').textContent=`friends · ${room}`;
    $('#leaveRace').textContent=host?'close room':'leave room';
    $('#inviteLink').value=`${location.origin}${location.pathname}?race=${room}`;
    $('#modal').close();paint();
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
    $('#leaveRaceTitle').textContent=host?'close room?':'leave room?';
    $('#leaveRaceMessage').textContent=host
      ?'All racers will be disconnected when you close this room.'
      :'Your place in the race will be lost when you leave.';
    $('#confirmLeaveRace').textContent=host?'close room':'leave room';
    if(!$('#leaveRaceDialog').open)$('#leaveRaceDialog').showModal();
    $('#cancelLeaveRace').focus();
  }
  api.requestLeave=requestLeave;
  $('#cancelLeaveRace').onclick=()=>{afterLeave=null;$('#leaveRaceDialog').close()};
  $('#leaveRaceDialog').addEventListener('cancel',()=>{afterLeave=null});
  $('#confirmLeaveRace').onclick=()=>{
    $('#leaveRaceDialog').close();
    const next=afterLeave;afterLeave=null;
    if(api.active)leave();
    if(next)next();
    input.focus();
  };
  function leave(message) {
    hideCountdown();
    if($('#leaveRaceDialog').open)$('#leaveRaceDialog').close();
    clearInterval(clock);clearTimeout(connectionTimeout);clearInterval(timer);
    api.active=false;api.running=false;
    syncNavigation();
    peer?.destroy();peer=null;links.clear();players={};phase='lobby';round=0;
    $('#racePanel').hidden=true;document.body.classList.remove('in-room');$('.config').inert=false;
    if(saved){({mode,limit}=saved);saved=null;}
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const url=new URL(location.href);url.searchParams.delete('race');window.history.replaceState(null,'',url);
    reset();if(message){open();showError(message);}
  }
  function connect(isHost, code, name) {
    if(peer)peer.destroy();clearTimeout(connectionTimeout);
    host=isHost;room=code;players={};links=new Map();phase='lobby';round=0;
    showError('Connecting…');$('#createRoom').disabled=$('#joinRoom').disabled=true;
    if(typeof Peer==='undefined'){failure('Could not load racing. Refresh and try again.');return;}
    peer=new Peer(isHost?`logostype-${code}`:undefined);
    connectionTimeout=setTimeout(()=>failure('Could not connect. Check the code and your network, then try again.'),15000);
    function failure(message){leave();open();showError(message);}
    peer.on('error',error=>{
      if(error.type==='unavailable-id')failure('That room code is in use. Create a room again.');
      else if(api.active)status('Connection interrupted. Leave and rejoin if friends stop updating.');
      else failure('Unable to reach the room. Keep the host’s tab open and try again.');
    });
    peer.on('open',id=>{
      self=id;
      if(host){clearTimeout(connectionTimeout);players[self]={name,connected:true,finished:false,wpm:0,progress:0};showRoom();}
      else {const connection=peer.connect(`logostype-${code}`,{reliable:true,metadata:{name}});links.set('host',connection);wire(connection);}
    });
    peer.on('connection',connection=>{
      if(!host)return connection.close();
      connection.on('open',()=>{
        if(phase==='racing'||phase==='countdown'||Object.values(players).filter(p=>p.connected!==false).length>=8){send(connection,{type:'reject',message:'Room is racing or full. Try again after this race.'});setTimeout(()=>connection.close(),300);return;}
        players[connection.peer]={name:cleanName(connection.metadata?.name),connected:true,finished:false,wpm:0,progress:0};
        links.set(connection.peer,connection);wire(connection);publish();
      });
    });
    function wire(connection){
      connection.on('open',()=>{if(!host)send(connection,{type:'hello'});});
      connection.on('data',data=>{
        if(!data||typeof data!=='object')return;
        if(host){
          if(!players[connection.peer])return;
          if(data.type==='hello')send(connection,snapshot());
          if(data.type==='progress'&&data.round===round&&phase==='racing'){
            const p=players[connection.peer];
            if(data.gaveUp&&!p.finished&&!lastRacer(connection.peer))return;
            if(!p.finished){
              p.progress=Math.max(0,Math.min(100,Number(data.progress)||0));p.wpm=Math.max(0,Math.min(500,Number(data.wpm)||0));p.accuracy=Math.max(0,Math.min(100,Number(data.accuracy)||0));p.finished=!!data.finished;
              p.gaveUp=!!data.gaveUp;
            }
            checkFinished();publish();
          }
        } else {
          if(data.type==='reject'){failure(data.message);return;}
          if(data.type==='roster'){
            if(!data.players||!data.players[self])return;
            players=data.players;phase=data.phase;round=data.round;if(phase==='finished'){clearInterval(clock);api.running=false;}
            if(!api.active){clearTimeout(connectionTimeout);showRoom();}paint();
          }
          if(data.type==='start'&&typeof data.text==='string'&&data.text.length<=10000&&Number.isInteger(data.duration)&&data.duration>=1&&data.duration<=3600)begin(data);
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
  function checkFinished(){
    if(phase==='racing'&&Object.values(players).filter(p=>p.connected!==false).every(p=>p.finished)){phase='finished';clearInterval(clock);api.running=false;}
  }
  function begin(data){
    hideCountdown();showCountdown(3);
    duration=data.duration;round=data.round;phase='countdown';api.running=false;lastReport=0;gaveUp=false;
    for(const p of Object.values(players)){p.progress=0;p.wpm=0;p.finished=false;p.gaveUp=false;}
    api.preparing=true;mode='words';limit=25;reset();api.preparing=false;
    $('#modes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    target=data.text;render();input.blur();done=false;
    const startsAt=Date.now()+3000;
    paint();clearInterval(clock);
    clock=setInterval(()=>{
      const remaining=startsAt-Date.now();
      if(remaining>0){showCountdown(Math.ceil(remaining/1000));status(`Starting in ${Math.ceil(remaining/1000)}… · 25 words · ${duration}s limit`);return;}
      if(phase==='countdown'){
        phase='racing';api.running=true;start=startsAt;
        showCountdown('GO!');countdownTimeout=setTimeout(hideCountdown,700);
        document.body.classList.add('running');status('Go! Type the same words as your friends.');input.focus();
      }
      if(phase==='racing'){
        const elapsed=(Date.now()-start)/1000;
        if(!done){
          let corrections=[...extraLetters.values()].reduce((sum,letters)=>sum+letters.length,0);
          if(typed.length===target.length)for(let i=0;i<typed.length;i++)if(typed[i]!==target[i])corrections++;
          $('#counter').textContent=`${Math.max(0,Math.ceil(duration-elapsed))}s`+(corrections?` · ${corrections} character${corrections===1?'':'s'} to correct`:'');
          sampleWpm();if(elapsed>=duration)finish();
        }
        // Repeat the terminal report until the host acknowledges the round as finished.
        report(false);
      }
    },100);
    status(`Starting in 3… · 25 words · ${duration}s limit`);
  }
  function report(finished){
    if(!api.active||phase!=='racing'||(!finished&&Date.now()-lastReport<150))return;
    lastReport=Date.now();let correct=0;for(let i=0;i<typed.length;i++)if(typed[i]===target[i])correct++;
    // A periodic update must never undo an already completed local race.
    const completed=!!(finished||done);
    const data={type:'progress',round,progress:correct/target.length*100,wpm:completed&&history[0]?history[0].wpm:speed(),accuracy:total?Math.round((total-errors)/total*100):100,finished:completed,gaveUp};
    if(completed)status(gaveUp?'You gave up · waiting for the final standings.':'You finished · waiting for the other racers.');
    if(host){Object.assign(players[self],data);checkFinished();publish();}else send(links.get('host'),data);
  }
  function open(){
    if(api.active){$('#racePanel').scrollIntoView({behavior:'smooth'});return;}
    syncNavigation(true);
    $('#modalContent').innerHTML='<h2>race friends</h2><p>Same words. A shared countdown. See who finds their rhythm first. Up to 8 friends, no account needed.</p><label for="racerName">your name</label><input class="race-field" id="racerName" maxlength="24" placeholder="typist" autocomplete="nickname"><button class="option" id="createRoom">create a room →</button><p>Or join a friend’s room</p><label for="roomCode">room code</label><input class="race-field" id="roomCode" maxlength="8" placeholder="e.g. a1b2c3d4" autocapitalize="off" spellcheck="false"><button class="option" id="joinRoom">join room →</button><p id="raceError" role="status" aria-live="polite"></p><p>Keep the host’s tab open. Direct connections may be blocked on some networks.</p>';
    if(!$('#modal').open)$('#modal').showModal();
    $('#roomCode').value=new URL(location.href).searchParams.get('race')||'';
    try{$('#racerName').value=localStorage.getItem('logostype-racer')||'';}catch{}
    $('#racerName').focus();
    function name(){const value=cleanName($('#racerName').value);try{localStorage.setItem('logostype-racer',value);updateProfileLabel();}catch{}return value;}
    $('#createRoom').onclick=()=>connect(true,Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>n.toString(16).padStart(2,'0')).join(''),name());
    $('#joinRoom').onclick=()=>{const code=$('#roomCode').value.trim().toLowerCase();if(!/^[a-f0-9]{8}$/.test(code)){showError('Enter the 8-character room code from your friend.');return;}connect(false,code,name());};
  }
  $('#raceDurationForm').onsubmit=e=>e.preventDefault();
  $('#giveUpRace').onclick=()=>{
    if(done||!lastRacer(self))return;
    gaveUp=true;$('#giveUpRace').hidden=true;finish();
  };
  $('#friends').onclick=open;$('#leaveRace').onclick=requestLeave;
  for(const button of [$('#home'),$('.brand')])button.onclick=()=>{
    if(api.active){requestLeave(enterTyping);return;}
    enterTyping();
  };
  window.addEventListener('beforeunload',event=>{
    if(!api.active)return;
    event.preventDefault();event.returnValue='';
  });
  $('#copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText($('#inviteLink').value);status('Invite copied. Send it to your friends.');}catch{$('#inviteLink').select();status('Select and copy the invite link to share it.');}};
  $('#startRace').onclick=()=>{
    if(!host||$('#startRace').disabled)return;
    const field=$('#raceDuration');if(!field.reportValidity())return;const seconds=Number(field.value);if(!Number.isInteger(seconds)||seconds<1||seconds>3600)return;
    mode='words';limit=25;const data={type:'start',round:round+1,text:generate(),duration:seconds};broadcast(data);begin(data);
  };
  $('#modal').addEventListener('close',()=>{if(!api.active){syncNavigation();if(peer){clearTimeout(connectionTimeout);peer.destroy();peer=null;}}});
  if(new URL(location.href).searchParams.has('race'))open();
})();
