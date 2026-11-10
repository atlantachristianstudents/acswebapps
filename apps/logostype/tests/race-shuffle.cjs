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
raceSource=raceSource.replace('  const invitedRoom=', `  window.relayTest={buildRelayLegs,relayTurn,selectLane,begin,paintRelay,relayReplay,relayLanePositions,addRelayLane,normalizeRelayLanes,relayRaceParticipants,paint,preparePassage,snapshot,chooseMode(value){passageMode=value;},setReady,allRacersReady,nextRoundPlayers,addBot,updateBots,normal(){relay=false;},getRecordings:()=>attemptReplays,setPassage(text){preparedText=text;passageMode='verse';},
  recordings(entries){attemptReplays=new Map(entries);phase='finished';},
  setup(roster,id,legs){players=roster;self=id;relay=true;relayLegs=legs;if(legs[id])preparedText=legs[id].members.map(member=>legs[member].text).join(' ');host=true;phase='lobby';api.active=true;normalizeRelayLanes();},
  phase:()=>phase,players:()=>players};
  const invitedRoom=`);
vm.runInContext(raceSource, context);

context.escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('),app.indexOf('function positionCaret(')),context);
context.captureAttemptReplay=()=>null;

const race=context.window.relayTest;
context.scriptureLines=['cat','dog'];
context.Math=Object.create(Math);context.Math.random=()=>0;
race.setup({human:{name:'Human',lane:1}},'human',{});
race.preparePassage();race.setReady('human',true);now+=1000;race.paint();
assert.equal(race.snapshot().preview.text,'cat');
elements.get('#startRace').onclick();
now+=3000;for(const callback of [...timers.values()])callback();
context.typed=context.input.value='cat';context.finish();
assert.equal(race.phase(),'finished');
assert.equal(race.snapshot().preview.text,'dog','next verse selected immediately after race');
assert.equal(context.target,'cat','completed passage is preserved');
assert(context.done,'shuffle preserves completed result');
assert(context.window.friendRace.relayPassageMarkup({}).includes('data-typing-position="3"'));
race.setReady('human',true);
assert.equal(elements.get('#results').style.display,'none','ready hides completed chart');
assert.equal(elements.get('#testSection').style.display,'block','ready shows next passage');
assert(context.window.friendRace.relayPassageMarkup({}).replace(/<[^>]*>/g,'').includes('dog'),'ready relay preview uses next verse');
assert.equal(context.target,'cat','preview does not overwrite previous attempt');
race.setReady('human',false);assert.equal(elements.get('#results').style.display,'block','unready restores results');
race.setReady('human',true);now+=1000;race.paint();elements.get('#startRace').onclick();
assert.equal(context.target,'dog','rematch uses shuffled verse');
now+=3000;for(const callback of [...timers.values()])callback();
context.typed=context.input.value='dog';context.finish();
assert.equal(race.snapshot().preview.text,'cat','subsequent race shuffles once again');

race.setup({human:{name:'Human',lane:1}},'human',{});
race.chooseMode('custom');elements.get('#raceCustomText').value='fixed passage';
elements.get('#raceCustomText').setCustomValidity=()=>{};
elements.get('#raceCustomText').reportValidity=()=>true;
race.preparePassage();race.setReady('human',true);now+=1000;race.paint();elements.get('#startRace').onclick();
now+=3000;for(const callback of [...timers.values()])callback();
context.typed=context.input.value='fixed passage';context.finish();
assert.equal(race.snapshot().preview.text,'fixed passage','custom passage stays unchanged');
assert.equal(context.target,'fixed passage');
console.log('Race shuffle checks passed: immediate next-verse selection, no repeat, rematches, preserved results, and unchanged custom text.');
