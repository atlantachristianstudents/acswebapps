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
const roster={a:{name:'First',lane:1},b:{name:'Second',lane:1},c:{name:'Other',lane:2}};
const text='cat dog owl fox';
race.setup(roster,'a',race.buildRelayLegs(text,roster));
race.begin({round:1,text,duration:30,formatting:false,custom:true});
now=4000;for(const callback of [...timers.values()])callback();
const list=elements.get('#racers'),before=[...list.children];
const hover=before[0]._parts.name.children[1];
let replacements=0;const replace=list.replaceChildren;
list.replaceChildren=function(){replacements++;return replace.call(this);};
roster.c.progress=90;roster.c.position=12;roster.c.wpm=150;
race.paint();race.paintRelay();
assert.equal(list.children[0],before[0],'leading lane cannot reorder race rows');
assert.equal(list.children[1],before[1]);
assert.equal(list.children[0]._parts.name.children[1],hover,'hover content survives progress updates');
assert.equal(replacements,0,'steady roster updates do not detach rows');
assert.equal(list.children[1]._parts.bar.style.width,'90%','progress still updates');

const normal={first:{name:'First'},second:{name:'Second'},third:{name:'Third'}};
race.setup(normal,'first',{});race.normal();
race.begin({round:2,text,duration:30,formatting:false,custom:true});
now+=3000;for(const callback of [...timers.values()])callback();
const normalRows=[...list.children];replacements=0;
normal.second.wpm=200;normal.second.progress=99;race.paint();
assert.equal(list.children[0],normalRows[0]);assert.equal(list.children[1],normalRows[1]);
assert.equal(replacements,0,'live WPM changes preserve ordinary racer rows');
normal.second.finished=true;normal.second.progress=100;normal.second.passageComplete=true;normal.second.finishMs=1000;
race.paint();
assert.equal(list.children[1],normalRows[1],'finishing does not move an ordinary racer mid-round');
assert.equal(list.children[1]._parts.track.children[1].textContent,'1st','finish place still updates');
console.log('Race layout checks passed: stable lane/racer order, persistent row and hover nodes, progress updates, and correct finish badges.');
// Repeated passive passage refreshes should neither replace identical HTML nor follow the caret.
let htmlWrites=0,html='',lastFollow;
const words={};Object.defineProperty(words,'innerHTML',{get:()=>html,set:value=>{htmlWrites++;html=value;}});
const renderContext=vm.createContext({$:()=>words,input:{value:''},target:'cat',typed:'',
 window:{friendRace:{relayPassageMarkup:()=>'<span>cat</span>'}},parseTyping:()=>({spaceTypos:{}}),
 renderBookContext(){},positionCaret(smooth,follow){lastFollow=follow;}});
vm.runInContext(app.slice(app.indexOf('function render(smooth'),app.indexOf('function typingPassageMarkup(')),renderContext);
vm.runInContext('render(false,false);render(false,false);',renderContext);
assert.equal(htmlWrites,1,'identical passage HTML is not replaced by remote updates');
assert.equal(lastFollow,false,'passive renders preserve the readers scroll position');
const caret={style:{}},box={scrollTop:77},letter={offsetTop:80,getBoundingClientRect:()=>({left:10,top:10,height:20})};
const caretContext=vm.createContext({$:selector=>selector==='.cursor'?letter:selector==='#typingCaret'?caret:selector==='#words'?box:{getBoundingClientRect:()=>({left:0,top:0})},
 document:{body:{classList:{contains:()=>false}}},getComputedStyle:()=>({lineHeight:'20'}),window:{friendRace:{paintTextPositions(){}}}});
vm.runInContext(app.slice(app.indexOf('function positionCaret('),app.indexOf('function reset(')),caretContext);
vm.runInContext('positionCaret(false,false)',caretContext);assert.equal(box.scrollTop,77);
vm.runInContext('positionCaret(false)',caretContext);assert.equal(box.scrollTop,60,'local typing still follows the caret');
console.log('Passage layout checks passed: unchanged HTML retained, passive scroll preserved, and local caret following retained.');
