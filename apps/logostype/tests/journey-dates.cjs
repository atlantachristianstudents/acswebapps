const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let now = '2026-11-07T10:00:00.000Z';
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
}
const storage = new Map();
let journey = {name:'Entire Scriptures',progress:0,completions:[]};
const context = vm.createContext({
  window:{},Date:Clock,journeyBooks:[{name:'John'},{name:'Genesis'}],
  scriptureReferences:['John 1:1','Genesis 1:1'],
  currentJourney:()=>journey,escapeHtml:String,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
});
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = app.indexOf('// Keep completion date arrays compatible;');
const end = app.indexOf('// Attempts are saved on the first character', start);
vm.runInContext(app.slice(start, end), context);
const run = code => vm.runInContext(code, context);
run('trackJourneyStart()');
assert.equal(run('journeyDates["Entire Scriptures"].startedAt'),now);
now='2026-11-07T11:00:00.000Z';
run('trackJourneyStart()');
assert.equal(run('journeyDates["Entire Scriptures"].startedAt'),'2026-11-07T10:00:00.000Z','retries preserve the initial start');
journey={name:'John',progress:0,completions:[]};
run('trackJourneyStart()');
assert.equal(run('journeyDates.John.startedAt'),now);
now='2026-11-07T12:00:00.000Z';
run(`trackJourneyCompletion('John', '${now}', [])`);
assert.equal(run(`journeyDates.John.completions['${now}']`),'2026-11-07T11:00:00.000Z');
journey.completions.push(now);
run(`resetJourneyStart('John', ['${now}'])`);
assert.equal(run('journeyDates.John.startedAt'),null);
now='2026-11-08T10:00:00.000Z';
run('trackJourneyStart()');
assert.equal(run('journeyDates.John.startedAt'),now);
assert.equal(run('Object.keys(journeyDates.John.completions).length'),1);
journey={name:'Genesis',progress:1,completions:[]};
run('trackJourneyStart()');
assert.equal(run('journeyDates.Genesis.startedAt'),null,'do not invent a start for an older in-progress Journey');
run(`trackJourneyCompletion('Genesis', '${now}', [])`);
assert.equal(run(`journeyDates.Genesis.completions['${now}']`),null);
assert(run(`journeyCompletionDatesMarkup('Genesis','${now}')`).includes('started: not recorded'));
context.persisted=storage.get('logostype-journey-dates');
assert.equal(run('validateJourneyDates(JSON.parse(persisted)).John.startedAt'),now);
run('var imported=mergeJourneyDates(journeyDates, JSON.parse(persisted))');
assert.equal(run('Object.keys(imported.John.completions).length'),1,'repeated imports do not duplicate completions');
run(`var merged=mergeJourneyDates({John:{startedAt:'2026-11-07T11:00:00Z',afterCompletion:null,completions:{}}},imported)`);
assert.equal(run('merged.John.startedAt'),now,'a newer Journey cycle supersedes the completed cycle');
assert.throws(()=>run(`validateJourneyDates({John:{startedAt:null,completions:{'2026-11-07T10:00:00Z':'2026-11-08T10:00:00Z'}}})`));
assert.throws(()=>run(`validateJourneyDates({Unknown:{startedAt:null,completions:{}}})`));
context.validateJourneyAttempts=value=>value;
context.validateBookJourneys=value=>value;
const data=fs.readFileSync(path.join(root,'data.js'),'utf8');
vm.runInContext(data.slice(0,data.indexOf('function historyKey(')),context);
run(`var backup={format:'logostype-backup',version:1,bookProgress:0,history:[],journeyDates:imported};
var validated=validateBackup(backup);`);
assert.equal(run('validated.journeyDates.John.startedAt'),now);
assert.equal(run('Object.keys(validateBackup({...backup,journeyDates:undefined}).journeyDates).length'),0,'older backups remain valid');
console.log('Journey date checks passed: first start, retries, independent books, restart, legacy dates, persistence, merges, and backup compatibility.');
