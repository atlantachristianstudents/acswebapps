const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'race.js'), 'utf8');
function element() {
  return { children: [], style: {}, parentElement: {}, classList: { add() {}, toggle() {} },
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; }, setAttribute() {} };
}
const elements = new Map();
let celebrations = 0;
const context = vm.createContext({
  $: selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  },
  document: { createElement: element, querySelectorAll: () => [], body:{classList:{toggle(){}}} },
  unlisted:false, isRacer:player=>player.role!=='watcher'&&player.role!=='queued',
  self: 'winner', round: 1, celebratedRound: null, phase: 'finished',
  textMarkers:new Map(),markerLayout:'',api: {active:false}, target: "", roundReplay: null, ghost: null, host: true, done: true, passageMode: 'verse', raceFormatting: false,
  lastRacer: () => false, drawChart() {}, status() {},
  celebrateJourney: () => { celebrations++; },
  players: {
    winner: { name: 'Winner', finished: true, progress: 100, wpm: 80, finishMs: 8000 },
    second: { name: 'Second', finished: true, progress: 100, wpm: 80, finishMs: 8500 },
    timeout: { name: 'Timeout', finished: true, progress: 90, wpm: 100, finishMs: 10000 },
    gaveUp: { name: 'Gave up', finished: true, gaveUp: true, progress: 10, wpm: 120 },
  },
});
vm.runInContext(source.slice(source.indexOf('  function completedPassage('), source.indexOf('  function showError(')), context);
const run = code => vm.runInContext(code, context);
assert.equal(run('raceStandings(players).map(([id])=>id).join(",")'), 'winner,second,timeout,gaveUp');
assert.equal(run('[0,1,2,3,10,11,12,20].map(finishPlace).join(",")'), '1st,2nd,3rd,4th,11th,12th,13th,21st');
assert.equal(run('completedPassage({finished:true,progress:100,passageComplete:false})'), false,
  'uncorrected space extras at the time limit are not a completed passage');
run('paint()');
assert.equal(celebrations, 1);
const rows = elements.get('#racers').children;
assert.equal(rows[0].children[1].children[1].textContent, '1st');
assert.equal(rows[1].children[1].children[1].textContent, '2nd');
assert.equal(rows[3].children[1].children.length, 1, 'give-up result must not get a finish place');
run('paint()');
assert.equal(celebrations, 1, 'roster refresh must not repeat confetti');
run('round=2; paint()');
assert.equal(celebrations, 2, 'each rematch can celebrate again');
run('round=3; self="second"; paint()');
assert.equal(celebrations, 2, 'only the local winner gets confetti');
run('phase="racing"; players.second.finished=false; players.second.progress=50; paint()');
assert.equal(elements.get('#racers').children[0].children[1].children[1].textContent, '1st');
assert.equal(celebrations, 2, 'celebration waits for final standings');
console.log('Race checks passed: finish order, timeout and give-up placement, progress badges, local winner confetti, repeat suppression, rematches.');
// Marker geometry uses character position rather than correct-character progress.
const markerLayer = context.$('#raceTextMarkers'), passage = context.$('#words');
context.api.active = true;
context.target = 'cat dog';
context.players = {
  you:{name:'You',position:1,connected:true},
  rival:{name:'Rival <name>',position:5,progress:10,connected:true},
  left:{name:'Left',position:2,connected:false},
};
context.self='you';
passage.clientWidth=300;
passage.getBoundingClientRect=()=>({left:20,top:40,width:300,height:120,bottom:160});
context.$('.test').getBoundingClientRect=()=>({left:10,top:10});
let requestedPosition;
passage.querySelector=selector=>{
  requestedPosition=selector;
  return {getBoundingClientRect:()=>({left:120,top:75,bottom:105,height:30})};
};
const createElement=context.document.createElement;
context.document.createElement=()=>{
  const node=createElement();
  node.style.setProperty=()=>{};
  return node;
};
run('paintTextPositions()');
assert.equal(requestedPosition,'[data-typing-position="5"]');
assert.equal(markerLayer.children.length,1,'exclude the local racer and disconnected racers');
assert.equal(markerLayer.children[0].style.transform,'translate3d(100px,35px,0)');
assert.equal(markerLayer.children[0].children[0].style.left,'9px','name sits beside the triangle');
assert.equal(markerLayer.children[0].children[0].style.top,'-14px','name aligns vertically with the triangle');
assert.equal(markerLayer.children[0].children[0].textContent,'Rival <name>');
const originalMarker=markerLayer.children[0];
context.players.rival.position=6;
passage.querySelector=()=>({getBoundingClientRect:()=>({left:150,top:75,bottom:105,height:30})});
run('paintTextPositions()');
assert.equal(markerLayer.children[0],originalMarker,'reuse the marker node so CSS transitions can animate');
assert.equal(markerLayer.children.length,1);
assert.equal(originalMarker.style.transform,'translate3d(130px,35px,0)');
context.api.active=false;
run('paintTextPositions()');
assert.equal(markerLayer.hidden,true);
assert.equal(markerLayer.children.length,0);
console.log('Text marker checks passed: actual position, labeled geometry, disconnected filtering, and cleanup.');
const confettiBeforeTimeout=celebrations;
context.phase='finished';context.round=100;context.self='timeout';
context.players={timeout:{name:'Timed out',finished:true,progress:90,wpm:150,finishMs:10000,passageComplete:false}};
run('paint()');
assert.equal(celebrations,confettiBeforeTimeout,'unfinished racers must not receive winner confetti');
assert.equal(elements.get('#racers').children[0].children[1].children.length,1,'unfinished racers must not get a place badge');
context.players.finisher={name:'Finisher',finished:true,progress:100,wpm:50,finishMs:9000,passageComplete:true};
run('paint()');
assert.equal(celebrations,confettiBeforeTimeout,'higher-WPM unfinished racer does not win');
assert.equal(elements.get('#racers').children[0].children[1].children[1].textContent,'1st');
assert.equal(elements.get('#racers').children[1].children[1].children.length,1);
console.log('Unfinished racer checks passed: no rank or confetti, including when no participant finishes.');
vm.runInContext(source.slice(source.indexOf('  function promoteQueued(){'),source.indexOf('  function beginWatching(')),context);
context.players=Object.fromEntries(Array.from({length:8},(_,index)=>['r'+index,{role:'racer',connected:true}]));
context.players.later={role:'queued',connected:true,queueOrder:2};
context.players.first={role:'queued',connected:true,queueOrder:1};
run('promoteQueued()');
assert.equal(context.players.first.role,'queued','a full race leaves the queue waiting');
context.players.r7.connected=false;
run('promoteQueued()');
assert.equal(context.players.first.role,'racer','promote the earliest queued racer');
assert.equal(context.players.later.role,'queued','preserve the eight-seat limit');
console.log('Queue seat checks passed: capacity limit, arrival order, and overflow waiting.');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const passageBox={scrollTop:100,style:{}},caret={style:{}},letter={offsetTop:300,getBoundingClientRect:()=>({left:50,top:320,height:30})};
let raceView=true,watching=true;
const caretContext=vm.createContext({
 $:selector=>selector==='.cursor'?letter:selector==='#typingCaret'?caret:selector==='#words'?passageBox:{getBoundingClientRect:()=>({left:0,top:0})},
 document:{body:{classList:{contains:name=>raceView&&(name==='in-room'||(watching&&name==='race-spectator'))}}},
 getComputedStyle:()=>({lineHeight:'48px'}),window:{},
});
vm.runInContext(appSource.slice(appSource.indexOf('function positionCaret('),appSource.indexOf('function reset(')),caretContext);
vm.runInContext('positionCaret(false)',caretContext);
assert.equal(passageBox.scrollTop,0,'watchers see the whole passage without internal scrolling');
watching=false;
vm.runInContext('positionCaret(false)',caretContext);
assert.equal(passageBox.scrollTop,252,'active racers retain the scrolling typing area');
raceView=false;
vm.runInContext('positionCaret(false)',caretContext);
assert.equal(passageBox.scrollTop,252,'ordinary typing retains its scrolling behavior');
console.log('Passage visibility checks passed: full text for watchers, scrolling area for racers and ordinary typing.');
