// Shared, browser-hosted room directory using the existing PeerJS service.
// A well-known peer coordinates listings; another browser takes over on disconnect.
(() => {
  const directoryId = 'logostype-room-directory-v1';
  let peer, leader, candidate, connection, retryTimer, heartbeat, listener, chatListener;
  let chatMessages=[], chatSequence=0, localChatAt=-Infinity;
  const chatTimes=new Map();
  let listing = null, rooms = [], state = 'connecting', stopped = false;
  const entries = new Map(), clients = new Map(), profiles = new Map();
  let lastProfile='';
  function cleanListing(value) {
    if (!value || !/^[a-f0-9]{8}$/.test(value.code) || typeof value.name !== 'string' ||
        !Number.isInteger(value.count) || value.count < 1 || value.count > 8 ||
        !['lobby', 'countdown', 'racing', 'finished'].includes(value.phase)) return null;
    return { code: value.code, name: value.name.trim().slice(0, 24) || 'typist', count: value.count, phase: value.phase };
  }
  function emit() { if (listener) listener(rooms, state); if(chatListener)chatListener(chatMessages,state); }
  function send(link, data) { if (link?.open) link.send(data); }
  function cleanChat(value){
    if(!value||typeof value.id!=='string'||value.id.length>150||typeof value.name!=='string'||value.name.length>24||typeof value.text!=='string'||!value.text.trim()||value.text.length>500||!Number.isFinite(value.time)||value.time<0)return null;
    return {id:value.id,name:value.name,text:value.text,time:value.time};
  }
  function receiveChat(value){
    const message=cleanChat(value);
    if(!message||chatMessages.some(item=>item.id===message.id))return;
    chatMessages=[...chatMessages,message].slice(-50);
    if(chatListener)chatListener(chatMessages,state);
  }
  function acceptChat(id,name,text){
    if(typeof name!=='string'||typeof text!=='string'||!text.trim()||text.length>500)return false;
    const now=Date.now();
    if(now-(chatTimes.get(id)??-Infinity)<750)return false;
    chatTimes.set(id,now);
    const message={id:peer.id+'-'+now+'-'+(++chatSequence),name:name.trim().slice(0,24)||'typist',text:text.trim(),time:now};
    receiveChat(message);
    for(const client of clients.values())send(client,{type:'chat',message});
    return true;
  }
  function flush() {
    const now = Date.now();
    for (const [id, entry] of entries) if (now - entry.seen > 20000) entries.delete(id);
    rooms = [...new Map([...entries.values()].map(entry => [entry.listing.code, entry.listing])).values()]
      .sort((a, b) => a.code.localeCompare(b.code));
    state = 'ready'; emit();
    for (const client of clients.values()) send(client, { type: 'rooms', rooms });
  }
  function shareRecords(){
    const summary=window.friendRecords?.summary();if(!summary||!peer)return;
    const value=JSON.stringify(summary);if(value===lastProfile)return;lastProfile=value;
    if(leader?.open){
      profiles.set(peer.id,summary);
      for(const client of clients.values())send(client,{type:'personal-records',id:peer.id,summary});
    }else send(connection,{type:'personal-records',summary});
  }
  function announce() {
    shareRecords();
    if (leader?.open) {
      if (listing) entries.set(peer.id, { listing, seen: Date.now() });
      else entries.delete(peer.id);
      flush();
    } else send(connection, { type: 'listing', listing });
  }
  function retry() {
    if (retryTimer || stopped) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (peer?.open) connectDirectory(); else ensurePeer();
    }, 1000 + Math.random() * 1000);
  }
  function elect() {
    if (stopped || !peer?.open || leader || candidate) return;
    const attempt = candidate = new Peer(directoryId);
    attempt.on('open', () => {
      if (candidate !== attempt) return;
      candidate = null; leader = attempt;
      connection?.close(); connection = null;
      entries.clear(); clients.clear();profiles.clear();lastProfile='';chatTimes.clear(); announce();
    });
    attempt.on('connection', client => {
      if (client.metadata?.directory !== directoryId || clients.size >= 256) { client.close(); return; }
      client.on('open', () => { clients.set(client.peer, client);for(const [id,summary] of profiles)send(client,{type:'personal-records',id,summary});flush();send(client,{type:'chatHistory',messages:chatMessages}); });
      client.on('data', data => {
        if (!clients.has(client.peer)) return;
        if(data?.type==='personal-records'){
          const summary=window.friendRecords?.cleanSummary(data.summary);if(!summary)return;
          window.friendRecords.accept(summary);
          if(JSON.stringify(profiles.get(client.peer))!==JSON.stringify(summary)){
            profiles.set(client.peer,summary);
            for(const other of clients.values())if(other!==client)send(other,{type:'personal-records',id:client.peer,summary});
          }
          return;
        }
        if(data?.type==='chat'){acceptChat(client.peer,data.name,data.text);return;}
        if(data?.type!=='listing')return;
        if (data.listing === null) entries.delete(client.peer);
        else {
          const value = cleanListing(data.listing);
          if (!value) return;
          entries.set(client.peer, { listing: value, seen: Date.now() });
        }
        flush();
      });
      function remove() {
        // A replacement connection with the same peer ID owns its own listing.
        if (clients.get(client.peer) !== client) return;
        clients.delete(client.peer);profiles.delete(client.peer); entries.delete(client.peer);chatTimes.delete(client.peer); flush();
      }
      client.on('close', remove); client.on('error', remove);
    });
    attempt.on('error', () => {
      if (candidate === attempt) candidate = null;
      if (leader === attempt) { leader = null; entries.clear(); clients.clear(); rooms = []; state = 'connecting'; emit(); }
      attempt.destroy(); retry();
    });
    attempt.on('close', () => {
      if (leader !== attempt) return;
      leader = null; entries.clear(); clients.clear(); rooms = []; state = 'connecting'; emit(); retry();
    });
    attempt.on('disconnected', () => {
      if (leader === attempt && !attempt.destroyed) attempt.reconnect();
    });
  }
  function connectDirectory() {
    if (stopped || !peer?.open || leader?.open || connection?.open || candidate) return;
    const link = connection = peer.connect(directoryId, { reliable: true, metadata: { directory: directoryId } });
    const timeout = setTimeout(() => {
      if (connection !== link || link.open) return;
      connection = null; link.close(); state = 'unavailable'; emit(); elect();
    }, 5000);
    link.on('open', () => {
      clearTimeout(timeout);
      if (connection === link){lastProfile='';announce();}
    });
    link.on('data', data => {
      if(connection!==link)return;
      if(data?.type==='personal-records'){if(data.id!==peer.id)window.friendRecords?.accept(data.summary);return;}
      if(data?.type==='chat'){receiveChat(data.message);return;}
      if(data?.type==='chatHistory'&&Array.isArray(data.messages)&&data.messages.length<=50){chatMessages=data.messages.map(cleanChat).filter(Boolean);if(chatListener)chatListener(chatMessages,state);return;}
      if (data?.type !== 'rooms' || !Array.isArray(data.rooms) || data.rooms.length > 256) return;
      rooms = data.rooms.map(cleanListing).filter(Boolean); state = 'ready'; emit();
    });
    function lost() {
      clearTimeout(timeout);
      if (connection !== link) return;
      connection = null; rooms = []; state = 'connecting'; emit(); retry();
    }
    link.on('close', lost); link.on('error', lost);
  }
  function ensurePeer() {
    if (stopped) return;
    if (peer?.destroyed) peer = null;
    if (peer) {
      if (peer.disconnected) { try { peer.reconnect(); } catch { retry(); } }
      return;
    }
    if (typeof Peer === 'undefined') { state = 'unavailable'; emit(); return; }
    const session = peer = new Peer();
    session.on('open', connectDirectory);
    session.on('error', error => {
      if (session !== peer) return;
      if (error.type === 'peer-unavailable') {
        const old = connection; connection = null; old?.close(); elect();
      } else { state = 'unavailable'; emit(); retry(); }
    });
    session.on('disconnected', () => { if (!session.destroyed) session.reconnect(); });
    session.on('close', () => {
      if (session !== peer) return;
      peer = null; connection = null; state = 'connecting'; rooms = []; emit(); retry();
    });
  }
  window.raceRooms = {
    start(callback) {
      if(typeof callback==='function')listener = callback; stopped = false; emit(); ensurePeer();
      if (!heartbeat) heartbeat = setInterval(() => {
        if (!peer) ensurePeer();
        else if (leader?.open || connection?.open) announce();
        else { state = 'connecting'; emit(); connectDirectory(); }
      }, 5000);
    },
    startChat(callback){chatListener=callback;this.start(listener);},
    sendChat(name,text){
      if(typeof text!=='string'||!text.trim()||text.length>500||Date.now()-localChatAt<1000)return false;
      let accepted=false;
      if(leader?.open)accepted=acceptChat(peer.id,name,text);
      else if(connection?.open){send(connection,{type:'chat',name,text:text.trim()});accepted=true;}
      if(accepted)localChatAt=Date.now();
      return accepted;
    },
    setRoom(value) {
      const next = value === null ? null : cleanListing(value);
      if (value !== null && !next) return;
      if (JSON.stringify(next) === JSON.stringify(listing)) return;
      listing = next;
      this.start(listener); announce();
    },
  };
  window.addEventListener('pagehide', () => {
    stopped = true; clearTimeout(retryTimer); clearInterval(heartbeat);
    connection?.close(); candidate?.destroy(); leader?.destroy(); peer?.destroy();
    connection = candidate = leader = peer = retryTimer = heartbeat = null;
    rooms = []; state = 'connecting';
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && (listener || listing)) window.raceRooms.start(listener);
  });
})();
