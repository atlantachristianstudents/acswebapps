const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
let onInput, finishes = 0, verses = 0;
const context = vm.createContext({
  input: {value:'cxtx dog',addEventListener(type,handler){onInput=handler;}},
  target:'cat dog', typed:'', lastInput:'', start:1, done:false, mode:'quote',
  total:0, errors:0, recentCorrect:[], Date,
  window:{friendRace:{active:true,running:true,report(){}}},
  recordReplayEdit(){},recordMistake(){context.errors++;},render(){},
  finish(){finishes++;},completeBookVerse(){verses++;},reset(){},
});
vm.runInContext(app.slice(app.indexOf('function parseTyping('),app.indexOf('function render(smooth')),context);
const start=app.indexOf('input.addEventListener("input", () => {');
vm.runInContext(app.slice(start,app.indexOf('\n$(".test").onclick',start)),context);
onInput();
assert.equal(finishes,1,'race finishes at the end despite letter and space typos');
assert.equal(context.typed,'cxt dog');
assert(context.errors>0,'mistakes still count toward accuracy');
context.window.friendRace.active=false;
context.mode='book';context.lastInput='';context.typed='';
onInput();
assert.equal(verses,0,'Journey still requires correcting all mistakes');
assert.equal(finishes,1);
console.log('Race typo checks passed: typo completion, accuracy retained, Journey correction requirement preserved.');
