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
raceSource=raceSource.replace('  const invitedRoom=', `  window.relayTest={previewRelayLegs,promoteQueued,buildRelayLegs,relayTurn,selectLane,begin,paintRelay,relayReplay,relayLanePositions,addRelayLane,normalizeRelayLanes,relayRaceParticipants,paint,preparePassage,snapshot,chooseMode(value){passageMode=value;},setReady,allRacersReady,nextRoundPlayers,addBot,updateBots,normal(){relay=false;},getRecordings:()=>attemptReplays,setPassage(text){preparedText=text;passageMode='verse';},
  recordings(entries){attemptReplays=new Map(entries);phase='finished';},
  setup(roster,id,legs){players=roster;self=id;relay=true;relayLegs=legs;if(legs[id])preparedText=legs[id].members.map(member=>legs[member].text).join(' ');host=true;phase='lobby';api.active=true;normalizeRelayLanes();},
  phase:()=>phase,players:()=>players};
  const invitedRoom=`);
vm.runInContext(raceSource, context);

context.escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('),app.indexOf('function positionCaret(')),context);
context.captureAttemptReplay=()=>null;

const race=context.window.relayTest;
const roster={host:{name:'Host',lane:1},friend:{name:'Friend',lane:1},queued:{name:'Queued',role:'queued',queueOrder:1,eligibleRound:1},shared:{name:'Shared',role:'queued',queueOrder:2,eligibleRound:1,lane:1},later:{name:'Deferred',role:'queued',queueOrder:3,eligibleRound:2}};
race.setup(roster,'queued',{});race.setPassage('one two three four five six seven eight nine');race.recordings([]);
const preview=race.previewRelayLegs();
assert(preview.queued,'eligible queued racer gets a projected section');
assert(preview.shared,'queued racer with a lane is included in that split');
assert(!preview.later,'deferred arrivals do not change upcoming assignment');
assert.equal(roster.queued.role,'queued','preview does not promote spectators');
assert.equal(roster.queued.lane,undefined,'preview does not mutate queued lane');
race.setReady('queued',true);
const markup=context.window.friendRace.relayPassageMarkup({});
assert(markup.includes('relay-assigned'),'ready queued racer sees assigned text');
assert(markup.includes('Queued (you)'));
assert.equal(elements.get('#results').style.display,'none');
assert.equal(elements.get('#testSection').style.display,'block');
race.promoteQueued();race.normalizeRelayLanes();
const actual=race.buildRelayLegs(race.snapshot().preview.text,race.players());
assert.equal(JSON.stringify(actual),JSON.stringify(preview),'preview matches real promotion, normalization, and split');
assert.equal(roster.later.role,'queued');

const full={};for(let index=0;index<8;index++)full['r'+index]={name:'Racer '+index,lane:index+1};
full.q={name:'Waiting',role:'queued',queueOrder:1,eligibleRound:1};
race.setup(full,'r0',{});race.setPassage('one two three four');
assert(!race.previewRelayLegs().q,'overflow queue has no upcoming section');
full.r7.connected=false;
assert(race.previewRelayLegs().q,'free seat appears in projection immediately');
console.log('Queued relay checks passed: ready preview, shared splits, projection matches promotion, no premature mutation, deferred exclusion, and capacity.');
