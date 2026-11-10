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
raceSource=raceSource.replace('  const invitedRoom=', `  window.relayTest={buildRelayLegs,relayTurn,selectLane,begin,paintRelay,relayReplay,relayLanePositions,addRelayLane,normalizeRelayLanes,relayRaceParticipants,paint,addBot,updateBots,normal(){relay=false;},getRecordings:()=>attemptReplays,setPassage(text){preparedText=text;passageMode='verse';},
  recordings(entries){attemptReplays=new Map(entries);phase='finished';},
  setup(roster,id,legs){players=roster;self=id;relay=true;relayLegs=legs;if(legs[id])preparedText=legs[id].members.map(member=>legs[member].text).join(' ');host=true;phase='lobby';api.active=true;normalizeRelayLanes();},
  phase:()=>phase,players:()=>players};
  const invitedRoom=`);
vm.runInContext(raceSource, context);

context.escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('),app.indexOf('function positionCaret(')),context);
context.captureAttemptReplay=()=>null;
const relay=context.window.relayTest;
const roster={a:{name:'A',lane:1},b:{name:'B',lane:1},c:{name:'C',lane:2}};
const text='one two three four five six seven';
const legs=relay.buildRelayLegs(text,roster);
assert.equal(legs.a.text,'one two three');
assert.equal(legs.b.text,'four five six seven');
assert.equal(legs.c.text,text,'a solo lane covers the full passage');
assert.equal(legs.a.text+' '+legs.b.text,text,'a team covers every word exactly once');
relay.setup(roster,'b',legs);
assert(!relay.relayTurn('b'));
assert(relay.relayTurn('a'));
roster.a.finished=true;
assert(relay.relayTurn('b'),'completed teammate passes baton');
roster.a.finished=false;roster.a.connected=false;
assert(relay.relayTurn('b'),'disconnection releases next teammate');
roster.a.connected=true;
relay.selectLane('b',2);assert.equal(roster.b.lane,2);
relay.selectLane('b',9);assert.equal(roster.b.lane,2,'invalid lanes rejected');
roster.b.lane=1;relay.setup(roster,'b',legs);
relay.begin({round:1,text,duration:10,formatting:false,custom:true});
assert.equal(context.target,legs.b.text);
relay.selectLane('b',3);assert.equal(roster.b.lane,1,'lanes locked during countdown');
now=4000;for(const callback of [...timers.values()])callback();
assert(context.input.disabled,'second teammate cannot type at race start');
roster.a.finished=true;roster.a.progress=100;roster.a.passageComplete=true;
now=5000;for(const callback of [...timers.values()])callback();
assert(!context.input.disabled,'baton enables next teammate');
assert.equal(context.start,5000,'typing statistics exclude waiting time');
assert.equal(context.target,'four five six seven');
context.typed='fo';
roster.a.position=legs.a.text.length;
roster.c.position=3;
const fullMarkup=context.window.friendRace.relayPassageMarkup({});
assert(fullMarkup.includes('data-typing-position="32"'),'full passage extends beyond the local leg');
assert(fullMarkup.includes('class="letter relay-teammate" data-typing-position="0"'),'previous teammate letters highlighted');
assert(fullMarkup.includes('class="letter relay-assigned correct" data-typing-position="14"'),'local letters use absolute passage offsets');
assert(fullMarkup.includes('class="letter relay-assigned cursor" data-typing-position="16"'),'caret maps into assigned section');
const lanePositions=relay.relayLanePositions();
assert.equal(lanePositions.find(([id])=>id==='lane-1')[1].position,14,'baton starts at next leg');
assert.equal(lanePositions.find(([id])=>id==='lane-2')[1].position,3,'other lane marker uses its own progress');
console.log('Full relay passage checks passed: entire text, teammate highlights, assigned range, caret offset, and independent lane positions.');
console.log('Relay checks passed: unequal team sizes, complete passage coverage, baton handoff, disconnected teammates, lane validation, locked teams, assigned passage, and active typing clock.');

// Waiting players time out without saving an attempt or holding the round open.
const waiting={a:{name:'A',lane:1},b:{name:'B',lane:1},c:{name:'C',lane:2}};
relay.setup(waiting,'b',relay.buildRelayLegs(text,waiting));
relay.begin({round:2,text,duration:10,formatting:false,custom:true});
const savedCount=context.history.length;
now+=13001;for(const callback of [...timers.values()])callback();
assert(context.done);
assert.equal(context.history.length,savedCount);
assert(waiting.b.finished);
assert(!waiting.b.passageComplete);
console.log('Relay timeout checks passed: waiting legs finish unranked without saving results.');

relay.setup(waiting,'b',{});
// Enabling relay assigns every racer to a separate lane.
elements.get('#relayMode').onclick();elements.get('#relayMode').onclick();
assert.equal(new Set(Object.values(waiting).map(p=>p.lane)).size,3);
assert.equal(elements.get('#racers').children.length,3);
assert(elements.get('#addRelayLane').disabled,'solo players already have their own lane');
elements.get('#racers').children[0].onclick();
assert.equal(waiting.b.lane,waiting.a.lane,'lane row joins its team');
assert.equal(elements.get('#racers').children.length,2,'empty lane disappears');
assert.equal(elements.get('#racers').children.length,2,'one progress bar per lane');
assert(!elements.get('#addRelayLane').disabled,'team members can split into a new lane');
elements.get('#addRelayLane').onclick();
assert.notEqual(waiting.b.lane,waiting.a.lane);
assert.equal(elements.get('#racers').children.length,3);
assert.equal(elements.get('#racers').children.length,3);
assert(elements.get('#addRelayLane').disabled);
waiting.c.connected=false;relay.normalizeRelayLanes();relay.paintRelay();
assert.equal(elements.get('#racers').children.length,2,'disconnected racers leave no empty lanes');
console.log('Lane checks passed: automatic solo assignment, joining teams, empty-lane removal, splitting with plus, disconnected cleanup, and one progress bar per lane.');

// Combine lane recordings while preserving corrections and baton waits.
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8').split('function getProfileName(')[0],context);
const team={a:{name:'A',lane:1,finished:true,passageComplete:true,progress:100,finishMs:1000,accuracy:100},
 b:{name:'B',lane:1,finished:true,passageComplete:true,progress:100,finishMs:2000,accuracy:100},
 c:{name:'C',lane:2,finished:true,passageComplete:true,progress:100,finishMs:2500,accuracy:100}};
const teamText='cat dog owl', teamLegs=relay.buildRelayLegs(teamText,team);
relay.setup(team,'b',teamLegs);
const recording=(target,durationMs,events)=>({target,rawTarget:target,durationMs,events,references:[],sourceRanges:[]});
relay.recordings([
 ['a',recording('cat',600,[{time:0,at:0,remove:0,text:'car'},{time:600,at:2,remove:1,text:'t'}])],
 ['b',recording('dog owl',300,[{time:0,at:0,remove:0,text:'dog'},{time:300,at:3,remove:0,text:' owl'}])],
 ['c',recording(teamText,2500,[{time:2500,at:0,remove:0,text:teamText}])]
]);
const combined=relay.relayRaceParticipants();
assert.equal(combined.length,2,'one replay per lane');
const first=combined[0];
assert.equal(first.id,'lane-1');assert.equal(first.place,1);
assert.equal(first.replay.target,teamText);
assert.equal(first.replay.durationMs,2000);
assert.equal(first.wpm,66,'lane WPM uses full passage and shared elapsed time');
let value='';const stages=[];
for(const event of first.replay.events){value=value.slice(0,event.at)+event.text+value.slice(event.at+event.remove);stages.push([event.time,value]);}
assert.equal(JSON.stringify(stages),JSON.stringify([[400,'car'],[1000,'cat'],[1700,'cat dog'],[2000,teamText]]),'corrections and baton delays survive lane stitching');
context.validateRaceReplay({participants:combined,relay:true});
assert(context.validateRaceReplay({participants:combined,relay:true}).relay,'lane metadata survives backup validation');
relay.paintRelay();
assert(elements.get('#racers').children[0].children[2].textContent.includes('66 wpm'),'shared bar displays lane average WPM');
relay.recordings([['a',recording('cat',600,[])]]);
assert.equal(relay.relayRaceParticipants()[0].replay,null,'missing teammate recording is unavailable instead of fabricated');
console.log('Lane replay checks passed: merged full text, edits, baton delays, team ranking, overall WPM, missing recordings, and backup validation.');

const oneTeam={a:{name:'A',lane:1},b:{name:'B',lane:1}};
relay.setup(oneTeam,'a',{});relay.setPassage('cat dog');relay.paint();
assert(!elements.get('#startRace').disabled,'one occupied lane can start');
elements.get('#startRace').onclick();
assert.equal(relay.phase(),'countdown','single team starts a relay countdown');
assert.equal(context.target,'cat','single team passage still splits into legs');
relay.setup({a:{name:'Solo',lane:1}},'a',{});relay.setPassage('cat dog');relay.paint();
assert(!elements.get('#startRace').disabled,'solo relay player can start');
elements.get('#startRace').onclick();
assert.equal(relay.phase(),'countdown');assert.equal(context.target,'cat dog');
relay.setup({a:{name:'Solo',lane:1}},'a',{});
elements.get('#relayMode').onclick();
assert(elements.get('#startRace').disabled,'ordinary races still require two racers');
console.log('Single-lane start checks passed: team relay, solo relay, passage allocation, and ordinary race minimum.');

const previewPlayers={a:{name:'First',lane:1},b:{name:'Second',lane:1},c:{name:'Solo',lane:2}};
const previewText='cat dog owl fox';
relay.setup(previewPlayers,'b',relay.buildRelayLegs(previewText,previewPlayers));
context.target=previewText;context.typed='stale';context.done=false;
let preview=context.window.friendRace.relayPassageMarkup({});
assert(preview.includes('relay-leg-label">First</span>'));
assert(preview.includes('relay-leg-label">Second (you)</span>'));
assert(preview.includes('relay-assigned relay-preview-section relay-section-1" data-typing-position="8"'),'own preview starts at assigned offset even when typing target is full text');
assert(!preview.includes(' correct'),'previous typing does not color lobby preview');
assert(!preview.includes(' cursor'),'lobby preview has no active typing cursor');
relay.selectLane('b',2);
preview=context.window.friendRace.relayPassageMarkup({});
assert(preview.includes('Solo</span>'),'joining another team updates split labels');
assert(!preview.includes('relay-leg-label">First</span>'));
relay.setPassage('one two three four five six');relay.selectLane('b',previewPlayers.b.lane);
preview=context.window.friendRace.relayPassageMarkup({});
assert(preview.includes('data-typing-position="25"'),'passage changes recompute full preview');
console.log('Relay preview checks passed: pre-race split labels, assigned range, no stale typing, and live team/passage changes.');
