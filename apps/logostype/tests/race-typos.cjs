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
assert.equal(finishes,0,'race waits for letter and space typos to be corrected');
assert.equal(context.typed,'cxt dog');
assert(context.errors>0,'mistakes still count toward accuracy');
context.input.value='cat dog';onInput();
assert.equal(finishes,1,'corrected passage finishes the race');
assert(context.errors>0,'corrections preserve historical mistakes');
context.input.value='cxtx dog';
context.window.friendRace.active=false;
context.mode='book';context.lastInput='';context.typed='';
onInput();
assert.equal(verses,0,'Journey still requires correcting all mistakes');
assert.equal(finishes,1);
console.log('Race typo checks passed: correction required, accuracy retained, Journey correction requirement preserved.');

for(const mode of ['words','quote','custom','race']){
  context.window.friendRace.active=mode==='race';
  context.mode=mode==='race'?'quote':mode;
  context.lastInput='';context.typed='';
  context.input.value='cxtx dogEXTRA';
  const before=finishes;onInput();
  assert.equal(finishes,before,mode+' waits for corrections');
  assert.equal(context.input.value,'cxtx dog',mode+' discards trailing extras even with unresolved typos');
  const errorsBefore=context.errors, totalBefore=context.total;
  context.input.value='cxtx dog MORE';onInput();
  assert.equal(context.errors,errorsBefore,mode+' ignores extras in accuracy');
  assert.equal(context.total,totalBefore,mode+' ignores extras in keystroke counts');
  context.input.value='cat dogEXTRA ';onInput();
  assert.equal(context.input.value,'cat dog',mode+' discards trailing characters and spaces');
  assert.equal(finishes,before+1,mode+' finishes after passage corrections');
}
console.log('Words, verse, custom, and race tests ignore trailing characters and require corrected passages.');
