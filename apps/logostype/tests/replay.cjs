const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
function element() {
  return { value: '', style: {}, classList: { toggle() {} }, setAttribute() {},
    querySelectorAll: () => [], focus() {}, close() {}, innerHTML: '' };
}
let now = 1000;
const context = vm.createContext({
  $: selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  },
  window: {}, Date: { now: () => now },
  target: 'cat dog', rawTarget: 'Cat dog', attemptReplayEvents: [],
  sampleTimes: [1], start: 1000, testReferences: ['John 1:1'],
  testSourceRanges: [{ reference: 'John 1:1', start: 0 }],
  scriptureReferences: ['John 1:1'], input: { disabled: false, focus() {} },
  mode: 'words', limit: 25, capitalization: false, punctuation: false,
  typed: 'untouched', escapeHtml: value => String(value).replaceAll('<', '&lt;'),
});
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(app.slice(app.indexOf('function parseTyping('), app.indexOf('function render(smooth')), context);
vm.runInContext(app.slice(app.indexOf('function typingPassageMarkup('), app.indexOf('function positionCaret(')), context);
vm.runInContext(app.slice(app.indexOf('function averageCorrectCharacters('), app.indexOf('function speed()')), context);
vm.runInContext(fs.readFileSync(path.join(root, 'replay.js'), 'utf8'), context);
const data = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
vm.runInContext(data.slice(data.indexOf('function validateAttemptReplay('), data.indexOf('function getProfileName(')), context);
const run = code => vm.runInContext(code, context);
let value = '';
for (const next of ['c', 'cx', 'c', 'cat', 'catx', 'catx dog']) {
  context.before = value;
  context.after = next;
  run('recordReplayEdit(before, after)');
  value = next;
  now += 100;
}
assert.equal(run('replayValueAt(attemptReplayEvents, 100)'), 'cx');
assert.equal(run('replayValueAt(attemptReplayEvents, 200)'), 'c');
assert.equal(run('replayValueAt(attemptReplayEvents, 500)'), 'catx dog');
assert.equal(run('parseTyping(replayValueAt(attemptReplayEvents, 500), false, "cat dog").spaceTypos[3]'), 'x');
assert.equal(context.typed, 'untouched');
run('var saved = captureAttemptReplay(); var restored = validateAttemptReplay(JSON.parse(JSON.stringify(saved)))');
assert.equal(run('replayValueAt(restored.events, restored.durationMs)'), 'catx dog');
run('attemptReplayEvents = []');
assert.equal(run('saved.events.length'), 6, 'saved edits must survive the next reset');
run('var readings = buildReplayReadings(saved)');
assert.equal(run('replaySpeedsAt(readings, 100).average'), 0, 'mistyped words earn no average credit');
assert.equal(run('replaySpeedsAt(readings, 350).average'), 103, 'corrected words regain credit');
assert.equal(run('replaySpeedsAt(readings, 450).average'), 0, 'space extras invalidate the word');
assert.equal(run('replaySpeedsAt(readings, 500).average'), 72);
assert.equal(run('replaySpeedsAt(readings, 500).instant'), 168);
assert.equal(run('replaySpeedsAt(readings, 4000).instant'), 0, 'instant WPM decays during pauses');
assert.equal(run('replaySpeedsAt(readings, 0).average'), 0);
assert.throws(() => run('validateAttemptReplay({...saved, events:[{time:0,at:99,remove:0,text:"a"}]})'));
assert.throws(() => run('validateAttemptReplay({...saved, durationMs:1})'));
let destination, preserved;
context.switchTypingMenu = value => { destination = value; };
context.reset = value => { preserved = value; context.typed = ''; };
context.render = () => {};
context.history = [{ wpm: 40 }];
run('retrySavedAttempt({mode:"book",limit:1,reference:"John 1:1",replay:saved})');
assert.equal(destination, 'typing');
assert.equal(preserved, true);
assert.equal(context.mode, 'quote', 'Journey retries must not mutate Journey progress');
assert.equal(context.target, 'cat dog');
assert.equal(context.capitalization, true);
assert.equal(context.history.length, 1, 'retry must not overwrite the original score');
console.log('Replay checks passed: timed edits, corrections, space errors, backup validation, isolated retry.');

let clock = 0, playbackTick, stopped = false;
context.performance = { now: () => clock };
context.setInterval = callback => { playbackTick = callback; return 1; };
context.clearInterval = () => { stopped = true; };
const words = context.$('#attemptReplayWords');
words.querySelector = () => null;
words.isConnected = true;
context.$('#attemptReplaySeek').isConnected = true;
context.$('#modal').open = true;
run('openAttemptReplay({replay:saved}, 0)');
clock = 100;
playbackTick();
assert(context.$('#attemptReplayTime').textContent.startsWith('0.10s'));
assert(words.innerHTML.includes('incorrect'));
context.$('#attemptReplayPlay').onclick();
clock = 300;
playbackTick();
assert(context.$('#attemptReplayTime').textContent.startsWith('0.10s'), 'pause freezes playback');
context.$('#attemptReplaySeek').value = 500;
context.$('#attemptReplaySeek').oninput();
assert(words.innerHTML.includes('incorrect">x</span>'), 'scrubbing reconstructs space mistakes');
assert.equal(context.$('#attemptReplayAverage').textContent, 72);
assert.equal(context.$('#attemptReplayInstant').textContent, 168);
context.$('#attemptReplayRestart').onclick();
assert(context.$('#attemptReplayTime').textContent.startsWith('0.00s'));
assert.equal(context.$('#attemptReplayAverage').textContent, 0);
assert.equal(context.$('#attemptReplayInstant').textContent, 0);
words.isConnected = false;
context.$('#attemptReplaySeek').isConnected = false;
playbackTick();
assert(stopped, 'leaving playback releases its timer');
console.log('Playback checks passed: time progression, pause, scrub, restart, and cleanup.');
context.$('#attemptReplaySeek').isConnected = true;
words.isConnected = true;
context.$('#attemptReplayWords1').querySelector = () => null;
run(`var group = {participants:[
  {id:'one',name:'First <racer>',place:2,wpm:72,accuracy:90,finishMs:1000,gaveUp:false,replay:saved},
  {id:'two',name:'Second',place:1,wpm:840,accuracy:100,finishMs:100,gaveUp:false,
   replay:{...saved,durationMs:100,events:[{time:0,at:0,remove:0,text:'cat'},{time:100,at:3,remove:0,text:' dog'}]}},
  {id:'old',name:'Older app',place:3,wpm:10,accuracy:100,finishMs:null,gaveUp:false,replay:null}
]};
var restoredGroup=validateRaceReplay(JSON.parse(JSON.stringify(group)));
openRaceReplay({raceReplay:restoredGroup});`);
assert(context.$('#modalContent').innerHTML.includes('First &lt;racer>'));
assert(context.$('#modalContent').innerHTML.includes('Recording unavailable'));
context.$('#attemptReplaySeek').value = 500;
context.$('#attemptReplaySeek').oninput();
assert.equal(context.$('#attemptReplayAverage').textContent, 72);
assert.equal(context.$('#attemptReplayAverage1').textContent, 840, 'finished racers keep their final speed');
assert.equal(context.$('#attemptReplayProgress1').style.width, '100%');
context.$('#attemptReplayRestart').onclick();
assert.equal(context.$('#attemptReplayAverage1').textContent, 0);
assert.throws(() => run('validateRaceReplay({participants:[group.participants[0],group.participants[0]]})'));
console.log('Group replay checks passed: synchronized scrubbing, individual progress and WPM, restart, unavailable participants, escaped names, and backup validation.');
// The same controls drive separate and overlapping race views.
assert(context.$('#modalContent').innerHTML.indexOf('class="replay-toolbar"') > context.$('#modalContent').innerHTML.indexOf('class="race-replay-participant"'));
context.$('#attemptReplaySeek').value=500;
context.$('#attemptReplaySeek').oninput();
const beforeOverlap=context.$('#attemptReplayTime').textContent;
context.$('#attemptReplayOverlap').onclick();
assert.equal(context.$('#attemptReplayShared').hidden,false);
assert.equal(context.$('#attemptReplayWords').hidden,true);
assert.equal(context.$('#attemptReplayWords1').hidden,true);
const overlapMarkup=context.$('#attemptReplayOverlapWords').innerHTML;
assert.equal((overlapMarkup.match(/class="race-text-marker replay-overlap-marker"/g)||[]).length,2,'one marker per available recording');
assert(overlapMarkup.includes('First &lt;racer>'),'marker names escape HTML');
assert(overlapMarkup.includes('Second ✓'),'finished racer remains marked at passage end');
assert.equal(context.$('#attemptReplayTime').textContent,beforeOverlap,'toggle preserves playback position');
context.$('#attemptReplaySeek').value=0;context.$('#attemptReplaySeek').oninput();
assert(!context.$('#attemptReplayOverlapWords').innerHTML.includes('Second ✓'),'scrubbing rewinds shared markers');
context.$('#attemptReplayOverlap').onclick();
assert.equal(context.$('#attemptReplayShared').hidden,true);
assert.equal(context.$('#attemptReplayWords').hidden,false);
const replayHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(/\.replay-entries\s*\{[^}]*overflow-y:\s*auto;/s.test(replayHtml),'entries scroll independently of controls');
assert(/\.replay-toolbar\s*\{[^}]*flex-shrink:\s*0;[^}]*background:\s*var\(--panel\);/s.test(replayHtml),'bottom controls stay fixed and match popup background');
console.log('Overlap replay checks passed: shared markers, finished positions, escaping, synchronized seeking, view toggle, and fixed bottom controls matching popup background.');
run(`var incompleteRace=validateRaceReplay({participants:[{
 id:'timeout',name:'Timed out',place:1,wpm:150,accuracy:100,finishMs:1000,gaveUp:false,
 replay:{...saved,events:[{time:0,at:0,remove:0,text:'ca'}]}
}]});`);
assert.equal(run('incompleteRace.participants[0].place'),null,'remove stale ranks from older unfinished replays');
assert.equal(run('incompleteRace.participants[0].completed'),false);
run('openRaceReplay({raceReplay:incompleteRace})');
assert(context.$('#modalContent').innerHTML.includes(' · unfinished'));
assert(!context.$('#modalContent').innerHTML.includes(' · #1'));
console.log('Unfinished replay checks passed: legacy rank removed and unfinished status displayed.');
