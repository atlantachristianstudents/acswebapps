const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'rooms.js'), 'utf8');
let now = 0, sequence = 0, nextPeer = 0;
const tasks = new Map(), peers = new Map();
function schedule(owner, callback, delay = 0, interval = 0) {
  const id = ++sequence;
  tasks.set(id, { owner, callback, due: now + delay, interval });
  return id;
}
function advance(until) {
  let count = 0;
  while (true) {
    const pending = [...tasks].filter(([, task]) => task.due <= until).sort((a,b) => a[1].due-b[1].due || a[0]-b[0])[0];
    if (!pending) break;
    assert(++count < 10000, 'directory must not loop endlessly');
    const [id, task] = pending;
    now = task.due;
    if (task.interval) task.due += task.interval; else tasks.delete(id);
    task.callback();
  }
  now = until;
}
class Events {
  constructor() { this.handlers = {}; }
  on(type, callback) { (this.handlers[type] ||= []).push(callback); }
  emit(type, value) { for (const callback of this.handlers[type] || []) callback(value); }
}
class Link extends Events {
  constructor(owner, peer, metadata) { super(); this.owner=owner;this.peer=peer;this.metadata=metadata;this.open=false; }
  send(data) { const copy=JSON.parse(JSON.stringify(data));schedule(this.owner,()=>{if(this.other?.open)this.other.emit('data',copy);}); }
  close() {
    if(this.closed)return;
    this.closed=true;this.open=false;
    schedule(this.owner,()=>this.emit('close'));
    if(this.other&&!this.other.closed)this.other.close();
  }
}
function browser(name) {
  const lifecycle = {};
  class Peer extends Events {
    constructor(id) {
      super();this.id=id||'browser-'+(++nextPeer);this.open=false;this.destroyed=false;this.links=[];
      schedule(name,()=>{
        if(this.destroyed)return;
        if(peers.has(this.id)){this.emit('error',{type:'unavailable-id'});return;}
        peers.set(this.id,this);this.open=true;this.emit('open',this.id);
      });
    }
    connect(id, options) {
      const outgoing=new Link(name,id,options.metadata);this.links.push(outgoing);
      schedule(name,()=>{
        const remote=peers.get(id);
        if(!remote){this.emit('error',{type:'peer-unavailable'});outgoing.emit('error',{});return;}
        const incoming=new Link(name,this.id,options.metadata);
        outgoing.other=incoming;incoming.other=outgoing;remote.links.push(incoming);
        remote.emit('connection',incoming);
        schedule(name,()=>{if(outgoing.closed||incoming.closed)return;incoming.open=outgoing.open=true;incoming.emit('open');outgoing.emit('open');});
      });
      return outgoing;
    }
    destroy() {
      if(this.destroyed)return;
      this.destroyed=true;this.open=false;
      if(peers.get(this.id)===this)peers.delete(this.id);
      for(const link of this.links)link.close();
      this.emit('close');
    }
    reconnect() {}
  }
  const updates=[];
  const context=vm.createContext({
    Peer,Date:{now:()=>now},Math:{random:()=>0},
    setTimeout:(fn,delay)=>schedule(name,fn,delay),clearTimeout:id=>tasks.delete(id),
    setInterval:(fn,delay)=>schedule(name,fn,delay,delay),clearInterval:id=>tasks.delete(id),
    window:{addEventListener:(type,fn)=>{lifecycle[type]=fn;}},
  });
  vm.runInContext(source,context);
  const api=context.window.raceRooms;
  api.start((rooms,state)=>updates.push({rooms:JSON.parse(JSON.stringify(rooms)),state}));
  return {api,lifecycle,updates,last:()=>updates.at(-1),name};
}
const first=browser('first'), second=browser('second');
advance(2000);
assert.equal(first.last().state,'ready');assert.equal(second.last().state,'ready');
first.api.setRoom({code:'1234abcd',name:'Host',count:1,phase:'lobby'});
advance(2100);
assert.equal(second.last().rooms[0].code,'1234abcd');
second.api.setRoom({code:'5678abcd',name:'Other',count:2,phase:'lobby'});
advance(2200);
assert.equal(first.last().rooms.length,2);
first.api.setRoom({code:'1234abcd',name:'Host',count:3,phase:'racing'});
advance(2300);
assert.equal(second.last().rooms.find(room=>room.code==='1234abcd').phase,'racing');
assert.equal(second.last().rooms.find(room=>room.code==='1234abcd').count,3);
first.lifecycle.pagehide();
advance(5000);
assert.equal(second.last().state,'ready','another browser takes over the directory');
assert.deepEqual(second.last().rooms.map(room=>room.code),['5678abcd']);
const third=browser('third');
advance(7000);
assert.equal(third.last().rooms[0].code,'5678abcd');
second.api.setRoom(null);advance(7100);
assert.equal(third.last().rooms.length,0,'leaving removes the shared listing');
third.api.setRoom({code:'abcdef12',name:'Suspended host',count:1,phase:'lobby'});
advance(7200);
assert.equal(second.last().rooms.length,1);
for(const [id,task] of tasks)if(task.owner==='third'&&task.interval)tasks.delete(id);
advance(35000);
assert.equal(second.last().rooms.length,0,'stale host listings expire');
second.api.setRoom({code:'bad',name:'Invalid',count:99,phase:'lobby'});
advance(35100);
assert.equal(second.last().rooms.length,0);
console.log('Shared room checks passed: concurrent discovery, global listings, occupancy/status updates, coordinator failover, removal, stale expiry, invalid listings.');
