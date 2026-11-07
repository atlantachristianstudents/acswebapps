// Shared, browser-hosted room directory using the existing PeerJS service.
// A well-known peer coordinates listings; another browser takes over on disconnect.
(() => {
  const directoryId = 'logostype-room-directory-v1';
  let peer, leader, candidate, connection, retryTimer, heartbeat, listener;
  let listing = null, rooms = [], state = 'connecting', stopped = false;
  const entries = new Map(), clients = new Map();
  function cleanListing(value) {
    if (!value || !/^[a-f0-9]{8}$/.test(value.code) || typeof value.name !== 'string' ||
        !Number.isInteger(value.count) || value.count < 1 || value.count > 8 ||
        !['lobby', 'countdown', 'racing', 'finished'].includes(value.phase)) return null;
    return { code: value.code, name: value.name.trim().slice(0, 24) || 'typist', count: value.count, phase: value.phase };
  }
  function emit() { if (listener) listener(rooms, state); }
  function send(link, data) { if (link?.open) link.send(data); }
  function flush() {
    const now = Date.now();
    for (const [id, entry] of entries) if (now - entry.seen > 20000) entries.delete(id);
    rooms = [...new Map([...entries.values()].map(entry => [entry.listing.code, entry.listing])).values()]
      .sort((a, b) => a.code.localeCompare(b.code));
    state = 'ready'; emit();
    for (const client of clients.values()) send(client, { type: 'rooms', rooms });
  }
  function announce() {
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
      entries.clear(); clients.clear(); announce();
    });
    attempt.on('connection', client => {
      if (client.metadata?.directory !== directoryId || clients.size >= 256) { client.close(); return; }
      client.on('open', () => { clients.set(client.peer, client); flush(); });
      client.on('data', data => {
        if (!clients.has(client.peer) || data?.type !== 'listing') return;
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
        clients.delete(client.peer); entries.delete(client.peer); flush();
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
      if (connection === link) announce();
    });
    link.on('data', data => {
      if (connection !== link || data?.type !== 'rooms' || !Array.isArray(data.rooms) || data.rooms.length > 256) return;
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
      listener = callback; stopped = false; emit(); ensurePeer();
      if (!heartbeat) heartbeat = setInterval(() => {
        if (!peer) ensurePeer();
        else if (leader?.open || connection?.open) announce();
        else { state = 'connecting'; emit(); connectDirectory(); }
      }, 5000);
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
