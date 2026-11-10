const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
function element() {
  return { children: [], dataset: {}, style: {}, parentElement: {}, value: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    append(...children) { this.children.push(...children);for(const child of children)child.parentElement=this; },
    remove(){if(this.parentElement?.children)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);},
    replaceChildren() { this.children = []; }, setAttribute() {},
    querySelectorAll: () => [], addEventListener() {}, focus() {}, blur() {},
    scrollIntoView(options) { this.scrollOptions = options; },
    close() { this.open = false; }, showModal() { this.open = true; } };
}
let now = 1000, nextTimer = 0, celebrations = 0, peerCalls = 0;
const timers = new Map();
const context = vm.createContext({
  $: selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  },
  document: { createElement: element, querySelectorAll: () => [], body: { classList: { add() {}, remove() {}, toggle() {} } } },
  window: { addEventListener() {}, history: { replaceState() {} } },
  location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/' }, URL,
  Date: class extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} },
  Peer: function() { peerCalls++; throw new Error('Ghost races must not connect to a server'); },
  setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; },
  clearInterval: id => timers.delete(id), setTimeout: () => 0, clearTimeout() {},
  getProfileName: () => 'Player', setReadingView() {}, syncNavigation() {}, updateBookProgress() {}, renderBookContext() {},
  pauseMenu() {}, currentMenu: 'typing', mode: 'words', limit: 25, punctuation: false, capitalization: false,
  target: '', rawTarget: '', typed: '', done: true, start: 0, timer: null,
  total: 0, errors: 0, history: [], lastResultId: 'local-result', scriptureReferences: [], scriptureLines: [], input: element(),
  localStorage: {setItem() {}},saveTypingHistory(){return true;},
  reset() { context.typed = ''; context.done = false; context.input.value = ''; context.start = 0; },
  render() {}, drawChart() {}, sampleWpm() {}, speed: () => 36,
  enterTyping() {}, enterBook() {}, switchTypingMenu: destination => { context.currentMenu = destination; },
  celebrateJourney: () => { celebrations++; },
});
context.finish = (saveResult = true) => {
  context.done = true;
  if (saveResult) {
    context.history.unshift({ id: 'local-result', date: 'new saved attempt', mode: context.mode, limit: context.limit, wpm: 36, accuracy: 100, replay: context.captureAttemptReplay() });
    context.lastResultId = 'local-result';
  } else context.lastResultId = '';
  context.window.friendRace.report(true, now - context.start);
};
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(app.slice(app.indexOf('function parseTyping('), app.indexOf('function render(smooth')), context);
vm.runInContext(app.slice(app.indexOf('function averageCorrectCharacters('), app.indexOf('function speed()')), context);
const replay = fs.readFileSync(path.join(root, 'replay.js'), 'utf8');
vm.runInContext(replay.slice(replay.indexOf('function buildReplayReadings('), replay.indexOf('function openAttemptReplay(')), context);
let raceSource=fs.readFileSync(path.join(root,'race.js'),'utf8');
raceSource=raceSource.replace('  const invitedRoom=', `  window.relayTest={buildRelayLegs,relayTurn,selectLane,begin,paintRelay,relayReplay,relayLanePositions,addRelayLane,normalizeRelayLanes,relayRaceParticipants,paint,snapshot,attach(id){const messages=[];links.set(id,{open:true,send:data=>messages.push(data)});return messages;},setReady,allRacersReady,nextRoundPlayers,addBot,updateBots,normal(){relay=false;},getRecordings:()=>attemptReplays,setPassage(text){preparedText=text;passageMode='verse';},
  recordings(entries){attemptReplays=new Map(entries);phase='finished';},
  setup(roster,id,legs){players=roster;self=id;relay=true;relayLegs=legs;if(legs[id])preparedText=legs[id].members.map(member=>legs[member].text).join(' ');host=true;phase='lobby';api.active=true;normalizeRelayLanes();},
  phase:()=>phase,players:()=>players};
  const invitedRoom=`);
vm.runInContext(raceSource, context);

context.escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('),app.indexOf('function positionCaret(')),context);
context.captureAttemptReplay=()=>null;

const ready=context.window.relayTest;
const roster={host:{name:'Host'},friend:{name:'Friend'},bot:{name:'Bot',botWpm:30},watcher:{name:'Viewer',role:'watcher'}};
ready.setup(roster,'host',{});ready.normal();ready.setPassage('cat dog');ready.paint();
assert(elements.get('#startRace').disabled);
ready.setReady('host',true);assert(elements.get('#startRace').disabled);
ready.setReady('friend',true);assert(elements.get('#startRace').disabled);now+=1000;ready.paint();assert(!elements.get('#startRace').disabled);
assert(ready.allRacersReady(),'bots and watchers do not require ready');
ready.setReady('friend',false);assert(elements.get('#startRace').disabled);
ready.setReady('friend',true);
ready.setReady('watcher',true);assert(!roster.watcher.ready,'watcher cannot ready');
ready.setReady('friend','true');assert(roster.friend.ready,'nonboolean ignored');
now+=999;ready.paint();assert(elements.get('#startRace').disabled,'delay is at least one second');
now+=1;ready.paint();assert(!elements.get('#startRace').disabled);
elements.get('#startRace').onclick();
assert.equal(ready.phase(),'countdown');assert(!roster.host.ready&&!roster.friend.ready,'new round resets human readiness');
ready.setReady('host',true);assert(!roster.host.ready,'countdown locks readiness');
ready.recordings([]);ready.paint();
assert(elements.get('#startRace').disabled,'rematch requires everyone again');
ready.setReady('host',true);ready.setReady('friend',true);now+=1000;ready.paint();
assert(!elements.get('#startRace').disabled);

const queueRoster={host:{name:'Host',ready:true},q1:{name:'First',role:'queued',queueOrder:1},q2:{name:'Second',role:'queued',queueOrder:2},viewer:{name:'Viewer',role:'watcher'}};
for(let n=1;n<=6;n++)queueRoster['bot'+n]={name:'Bot',botWpm:30};
ready.setup(queueRoster,'host',{});ready.normal();ready.paint();
assert.equal(ready.nextRoundPlayers().length,8);
assert(elements.get('#startRace').disabled,'next admitted queued racer must ready up');
ready.setReady('q1',true);now+=1000;ready.paint();
assert(!elements.get('#startRace').disabled,'overflow queue does not block starting');
queueRoster.q1.connected=false;ready.paint();
assert(elements.get('#startRace').disabled,'next queued player now needs to ready up');
ready.setReady('q2',true);now+=1000;ready.paint();assert(!elements.get('#startRace').disabled);
console.log('Ready checks passed: host and guest gating, toggling, bots and watchers, countdown lock, reset, rematch, and queue capacity.');

const lockedRoster={host:{name:'Host',lane:1},friend:{name:'Friend',lane:2},bot:{name:'Bot',lane:2,botWpm:30}};
ready.setup(lockedRoster,'host',{});ready.setPassage('cat dog');context.scriptureLines=['cat','dog'];
const guestMessages=ready.attach('friend');
ready.setReady('friend',true);
ready.selectLane('friend',1);assert.equal(lockedRoster.friend.lane,2,'ready player cannot join another lane');
ready.addRelayLane('friend');assert.equal(lockedRoster.friend.lane,2,'ready player cannot split a lane');
ready.setReady('host',true);
assert(elements.get('#leaveRace').disabled);
context.window.friendRace.requestLeave();assert(!elements.get('#leaveRaceDialog').open,'ready player cannot open leave dialog');
const setupBefore=JSON.stringify(ready.snapshot());
elements.get('#raceFormatting').onclick();elements.get('#shuffleRacePassage').onclick();
elements.get('#relayMode').onclick();elements.get('#roomVisibility').onclick();ready.addBot(60);ready.selectLane('friend',1);
assert.equal(JSON.stringify(ready.snapshot()),setupBefore,'host readiness locks all setup handlers');
assert(elements.get('#raceCustomText').disabled);assert(elements.get('#raceFormatting').disabled);
ready.setReady('host',false);assert(!elements.get('#leaveRace').disabled);
elements.get('#raceFormatting').onclick();
assert(!lockedRoster.friend.ready,'format change clears other players readiness');
assert(guestMessages.some(message=>message.type==='settings-changed'),'affected player receives setting-change notice');
assert(elements.get('#startRace').disabled);
lockedRoster.later={name:'Later',role:'queued',eligibleRound:ready.snapshot().round+2};
assert(!ready.nextRoundPlayers().includes(lockedRoster.later),'arrivals after host readiness wait for a later round');
console.log('Ready lock checks passed: host setup lock, ready lane/leave restrictions, setting-change reset and notice, and deferred arrivals.');

// Unreadying the host releases arrivals frozen out of the next race.
const deferred={host:{name:'Host',lane:1},friend:{name:'Friend',lane:2}};
ready.setup(deferred,'host',{});ready.setReady('friend',true);ready.setReady('host',true);
const upcoming=ready.snapshot().round+1;
deferred.late={name:'Late arrival',role:'queued',queueOrder:1,eligibleRound:upcoming+1};
assert(!ready.nextRoundPlayers().includes(deferred.late));
const notice=ready.attach('friend');
ready.setReady('host',false);
assert.equal(deferred.late.eligibleRound,upcoming,'host unready releases deferred eligibility');
assert(ready.nextRoundPlayers().includes(deferred.late));
assert(!deferred.friend.ready,'changed lineup clears earlier readiness');
assert(notice.some(message=>message.type==='settings-changed'));
ready.setReady('host',true);ready.setReady('friend',true);
assert(elements.get('#startRace').disabled,'new arrival must ready up before starting');
ready.setReady('late',true);now+=999;ready.paint();
assert(elements.get('#startRace').disabled,'released lineup still waits one second');
now+=1;ready.paint();assert(!elements.get('#startRace').disabled);
elements.get('#startRace').onclick();
assert.equal(deferred.late.role,'racer','released player joins upcoming race instead of waiting an extra round');
console.log('Deferred queue checks passed: release on host unready, notice, readiness reset, one-second wait, and next-round admission.');
