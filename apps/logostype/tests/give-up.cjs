const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map();
let writes = 0, reports = 0;
const original = {id:'previous-result',wpm:90};
const context = vm.createContext({
  $: selector => {
    if (!elements.has(selector)) elements.set(selector, {style:{},parentElement:{},insertAdjacentHTML(){}});
    return elements.get(selector);
  },
  done:false, sampleWpm(){}, completeBookVerse(){}, clearInterval(){}, timer:null,
  document:{body:{classList:{remove(){}}}}, Date,
  start:Date.now()-2000, speed:()=>30, rawSpeed:()=>35, total:10,errors:2,
  typed:'partial',mode:'quote',limit:25,punctuation:false,capitalization:false,
  testReferences:[],testSourceRanges:[],rawTarget:'passage',defaultCustomText:'other',
  crypto:{randomUUID:()=> 'new-result'},captureChart:()=>({}),captureAttemptReplay:()=>({}),
  newPersonalRecord:()=>'',history:[original],lastResultId:'previous-result',
  localStorage:{setItem(){writes++;}},saveTypingHistory(){writes++;return true;},drawChart(){},
  window:{friendRace:{active:true,running:true,report(){reports++;}}},
});
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
vm.runInContext(source.slice(source.indexOf('function finish('),source.indexOf('function hideChartHover(')),context);
vm.runInContext('finish(false)',context);
assert.equal(context.history.length,1);
assert.equal(context.history[0],original);
assert.equal(context.lastResultId,'');
assert.equal(writes,0,'giving up must not write a history result');
assert.equal(reports,1,'giving up still sends the terminal race report');
assert.equal(context.done,true);
context.done=false;
vm.runInContext('finish()',context);
assert.equal(context.history.length,2,'ordinary completion continues saving results');
assert.equal(context.history[0].id,'new-result');
assert.equal(context.lastResultId,'new-result');
assert.equal(writes,1);
console.log('Give-up checks passed: no saved result, original history preserved, terminal report sent, normal completion still saved.');
const bursts=[];
context.celebrateJourney=colors=>bursts.push(colors);
context.escapeHtml=String;
vm.runInContext(source.slice(source.indexOf('function newPersonalRecord('),source.indexOf('function renderPersonalRecords(')),context);
context.window.friendRace.active=false;context.mode='words';context.limit=25;context.done=false;
vm.runInContext('finish()',context);
assert.deepEqual(bursts,[1],'new personal record uses one confetti color');
context.done=false;vm.runInContext('finish()',context);
assert.deepEqual(bursts,[1],'ties do not trigger record confetti');
context.window.friendRace.active=true;context.done=false;vm.runInContext('finish()',context);
assert.deepEqual(bursts,[1],'race results do not trigger personal-record confetti');
console.log('Personal record checks passed: single-color celebration, ties excluded, race results excluded.');

context.done=false;context.speed=()=>300;context.mode='words';context.window.friendRace.active=false;
let invalidCharts=0;context.drawChart=()=>invalidCharts++;
const beforeInvalid=context.history.length;
vm.runInContext('finish()',context);
assert.equal(context.history.length,beforeInvalid,'invalid speed is not saved');
assert.equal(invalidCharts,1,'invalid speed still draws its final chart');
assert.equal(elements.get('#chart').hidden,false);
assert.match(elements.get('#resultDetails').textContent,/invalid result/);
console.log('Invalid result chart checks passed: note and chart retained without saving.');
