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

const bots=context.window.relayTest;
const human={name:'Human'};
bots.setup({human},'human',{});bots.normal();
assert.equal(elements.get('#raceBotChoices').children.length,6);
const speeds=[30,60,90,120,150,180];
for(const speed of speeds)bots.addBot(speed);
bots.addBot(30); // Fill the eighth racer seat with another turtle.
assert.equal(Object.keys(bots.players()).length,8);
bots.addBot(30);bots.addBot(999);
assert.equal(Object.keys(bots.players()).length,8,'capacity and preset validation');
bots.setPassage('a'.repeat(100));
bots.begin({round:1,text:'a'.repeat(100),duration:10,custom:true,formatting:false});
now=4000;for(const callback of [...timers.values()])callback();
now=6000;for(const callback of [...timers.values()])callback();
const roster=bots.players();
assert(Object.values(roster).filter(p=>p.botWpm).every(p=>!p.name.includes('wpm')&&!/\d/.test(p.name)),'bot names omit speed numbers');
for(const player of Object.values(roster).filter(p=>p.botWpm)){
  assert.equal(player.position,player.botWpm/6,'five characters per WPM minute');
}
const count=Object.keys(roster).length;bots.addBot(30);
assert.equal(Object.keys(roster).length,count,'adding bots locks during race');
now=14000;for(const callback of [...timers.values()])callback();
assert(Object.values(roster).filter(p=>p.botWpm).every(p=>p.finished));
const turtle=Object.entries(roster).find(([,p])=>p.botWpm===30);
assert(!turtle[1].passageComplete,'slow bot times out unranked');
const rocket=Object.entries(roster).find(([,p])=>p.botWpm===180);
assert(rocket[1].passageComplete);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8').split('function getProfileName(')[0],context);
for(const recording of bots.getRecordings().values())if(recording)context.validateAttemptReplay(recording);
assert.equal(bots.getRecordings().get(rocket[0]).events.length,100);

const team={human:{name:'Human',lane:1}};
bots.setup(team,'human',{});bots.addBot(60);
const botId=Object.keys(team).find(id=>id!=='human');
assert.equal(team[botId].lane,2,'relay bot receives its own lane');
bots.selectLane('human',2);
const legs=bots.buildRelayLegs('cat dog',team);
bots.setup(team,'human',legs);
bots.begin({round:2,text:'cat dog',duration:10,custom:true,formatting:false});
now+=3000;for(const callback of [...timers.values()])callback();
assert.equal(team[botId].position,0,'relay bot waits for the human');
team.human.finished=true;team.human.passageComplete=true;team.human.progress=100;team.human.finishMs=1000;
now+=1000;for(const callback of [...timers.values()])callback();
assert.equal(team[botId].position,0,'baton begins at human finish');
now+=600;for(const callback of [...timers.values()])callback();
assert(team[botId].passageComplete);
assert.equal(team[botId].finishMs,1600,'team time includes baton delay');
context.validateAttemptReplay(bots.getRecordings().get(botId));
console.log('Bot checks passed: six icon presets, capacity, exact pacing, timeout, finishing, recordings, relay assignment, and baton timing.');
