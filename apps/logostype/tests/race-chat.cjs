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
raceSource=raceSource.replace('  const invitedRoom=', `  window.relayTest={buildRelayLegs,relayTurn,selectLane,begin,paintRelay,relayReplay,relayLanePositions,addRelayLane,normalizeRelayLanes,relayRaceParticipants,racerChatLocked,acceptRoomChat,paintChatAvailability,paint,preparePassage,snapshot,chooseMode(value){passageMode=value;},setReady,allRacersReady,nextRoundPlayers,addBot,updateBots,normal(){relay=false;},getRecordings:()=>attemptReplays,setPassage(text){preparedText=text;passageMode='verse';},
  recordings(entries){attemptReplays=new Map(entries);phase='finished';},
  setup(roster,id,legs){players=roster;self=id;relay=true;relayLegs=legs;if(legs[id])preparedText=legs[id].members.map(member=>legs[member].text).join(' ');host=true;phase='lobby';api.active=true;normalizeRelayLanes();},
  phase:()=>phase,players:()=>players};
  const invitedRoom=`);
vm.runInContext(raceSource, context);

context.escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('),app.indexOf('function positionCaret(')),context);
context.captureAttemptReplay=()=>null;

const chat=context.window.relayTest;
const team={a:{name:'First',lane:1},b:{name:'Second',lane:1},c:{name:'Other lane',lane:2}};
const text='cat dog owl fox',legs=chat.buildRelayLegs(text,team);
chat.setup(team,'b',legs);
chat.begin({round:1,text,duration:30,custom:true,formatting:false});
assert(!chat.racerChatLocked('a')&&!chat.racerChatLocked('b'),'everyone can chat during countdown');
now=4000;for(const callback of [...timers.values()])callback();
assert(chat.racerChatLocked('a'),'first teammate is actively typing');
assert(!chat.racerChatLocked('b'),'next teammate can chat while waiting');
assert(!elements.get('#roomChatInput').disabled);
assert(!chat.acceptRoomChat('a','blocked'));
assert(chat.acceptRoomChat('b','waiting chat'));
team.a.finished=true;team.a.passageComplete=true;team.a.progress=100;team.a.finishMs=1000;
now=5000;for(const callback of [...timers.values()])callback();
assert(chat.racerChatLocked('b'),'baton locks chat for new active typist');
assert(elements.get('#roomChatInput').disabled);
assert(chat.acceptRoomChat('a','finished chat'),'finished teammate can send during race');
assert(!chat.acceptRoomChat('b','blocked'));
context.typed=context.input.value=legs.b.text;context.finish();
assert.equal(chat.phase(),'racing','other lane is still typing');
assert(!chat.racerChatLocked('b'));
assert(!elements.get('#roomChatInput').disabled);
assert(chat.acceptRoomChat('b','my leg is done'));

const normal={you:{name:'You'},other:{name:'Other'}};
chat.setup(normal,'you',{});chat.normal();
chat.begin({round:2,text:'cat',duration:30,custom:true,formatting:false});
now+=3000;for(const callback of [...timers.values()])callback();
assert(chat.racerChatLocked('you'));
context.typed=context.input.value='cat';context.finish();
assert.equal(chat.phase(),'racing');
assert(!chat.racerChatLocked('you'),'normal race finishers can chat immediately');
assert(!elements.get('#roomChatInput').disabled);
assert(chat.racerChatLocked('other'),'unfinished opponent still cannot chat');
console.log('Active chat checks passed: countdown, relay waiting and baton handoff, finished teammates, independent lanes, and normal finishers.');
