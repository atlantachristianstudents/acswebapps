const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../collaborative.js'),'utf8');
const context=vm.createContext({crypto:require('node:crypto').webcrypto,scriptureReferences:['A 1:1','A 1:2','B 1:1'],journeyBooks:[{name:'A',start:0,end:2},{name:'B',start:2,end:3}],save:()=>{},refreshSaved:()=>{},paint:()=>{}});
vm.runInContext(source.slice(source.indexOf('  const bounds'),source.indexOf('  let records'))+'\nlet records=[], current=null;\n'+source.slice(source.indexOf('  function prepareImport('),source.indexOf('  const deleteDialog=')),context);
const run=code=>vm.runInContext(code,context);
vm.runInContext(source.slice(source.indexOf('  function journeyCode()'),source.indexOf('  const bounds')),context);
for(let i=0;i<100;i++)assert.match(run('journeyCode()'),/^[0-9]{12}$/,'new codes contain exactly twelve digits');
assert.equal(run("validCode('000123456789')"),true,'numeric codes preserve leading zeroes');
assert.equal(run("validCode('12345678901')"),false);
assert.equal(run("validCode('1234567890123')"),false);
assert.equal(run("validCode('abcdefgh')"),true);
assert.equal(run("validCode('abcdefg1')"),false,'mixed eight-character codes are invalid');
assert.equal(run("validCode('abcdefg')"),false);

const entry=(id,verse,name)=>({id:id.repeat(24),verse,name,at:'2026-11-11T12:00:00Z'});
const journey={id:'a'.repeat(24),title:'Together',scope:'A',entries:[entry('b',0,'Ann')]};
context.numericJourney=[{...journey,id:'000123456789'}];assert.equal(run('validate(numericJourney)[0].id'),'000123456789','numeric journeys survive validation');
context.shortJourney=[{...journey,id:'abcdefgh'}];assert.equal(run('validate(shortJourney)[0].id'),'abcdefgh','eight-letter journeys survive validation');
context.incoming=[journey];run('merge(incoming)');run('merge(incoming)');
assert.equal(run('records[0].entries.length'),1,'rejoining and importing is idempotent');
context.incoming=[{...journey,entries:[entry('c',1,'Bob'),entry('d',0,'Chris')]}];run('merge(incoming)');
assert.equal(run('records[0].entries.length'),3,'concurrent and offline contributions preserved');
assert.equal(run('new Set(records[0].entries.map(e=>e.verse)).size'),2,'duplicate verse counts once toward progress');
assert.equal(run('records[0].entries.map(e=>e.name).sort().join(",")'),'Ann,Bob,Chris');
context.bad=[{...journey,entries:[entry('e',2,'Ann')]}];
assert.throws(()=>run('validate(bad)'),'contributions outside chosen book rejected');
context.bad=[{...journey,entries:[entry('e',0,'')]}];assert.throws(()=>run('validate(bad)'));
context.bad=[{...journey,scope:'invalid'}];assert.throws(()=>run('validate(bad)'));
context.bad=[{...journey,scope:'',entries:[entry('e',2,'Ann')]}];assert.equal(run('validate(bad)[0].entries[0].verse'),2,'entire Scriptures accepts all books');
context.bad=[{...journey,title:'different'}];assert.throws(()=>run('merge(bad)'),'same code cannot silently change journey scope or title');
assert(!source.includes('recordJourneyVerse('),'shared typing never writes personal journey progress');
const data=fs.readFileSync(require('node:path').join(__dirname,'../data.js'),'utf8');
assert(data.includes('collaborativeJourneys:window.collaborativeJourneys?.export()'));
assert(data.includes('window.collaborativeJourneys?.prepareImport(backup.collaborativeJourneys'));
assert(data.includes('window.collaborativeJourneys?.clear()'));
console.log('Collaborative validation, merge, contributor, scope, separation, and backup checks passed.');

// Exercise the shared journey adapter through the normal typing completion hook.
const fields={Title:{value:''},Name:{value:'Ann'},Feedback:{textContent:''}};
const shared=vm.createContext({
  showInvalidJourneyResult:()=>{},start:Date.now()-2000,crypto:require('node:crypto').webcrypto,done:false,sampleWpm:()=>{},activeJourneyAttempt:null,
  speed:()=>45,rawSpeed:()=>48,total:10,errors:1,selectedJourneyBook:'',captureChart:()=>({}),captureAttemptReplay:()=>({}),newPersonalRecord:()=>'',history:[],saveTypingHistory:()=>{},
  currentMenu:'collaborative',mode:'book',typed:'Verse two.',target:'Verse two.',
  input:{value:'Verse two.'},parseTyping:()=>({extraCount:0}),
  scriptureReferences:['A 1:1','A 1:2'],journeyBooks:[{name:'A',start:0,end:2}],
  el:id=>fields[id],getProfileName:()=> 'Ann',uid:()=> 'e'.repeat(24),save:()=>{},publish:()=>{},paint:()=>{},
  window:{},
});
vm.runInContext("let current={id:'abcdefgh',title:'Journey with Ann',scope:'A',entries:[{verse:0}]},verse=null,sharedShuffle=false;"+
  source.slice(source.indexOf('  const bounds'),source.indexOf('  const validCode'))+
  source.slice(source.indexOf('  function journey()'),source.indexOf("  el('Name').addEventListener")),shared);
vm.runInContext('window.collaborativeJourneys={journey,position,contribute,historyInfo}; function journeyPosition(){return position();}',shared);
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
vm.runInContext(app.slice(app.indexOf('function completeBookVerse()'),app.indexOf('const defaultCustomText')),shared);
const sharedRun=code=>vm.runInContext(code,shared);
assert.equal(sharedRun('journey().progress'),1);
assert.equal(sharedRun('position()'),1,'shared engine targets the next unfinished verse');
sharedRun('updateDefaultTitle()');assert.equal(fields.Title.value,'Journey with Ann');
fields.Name.value='Bob';sharedRun('updateDefaultTitle()');assert.equal(fields.Title.value,'Journey with Bob');
fields.Title.value='Our custom title';fields.Name.value='Chris';sharedRun('updateDefaultTitle()');assert.equal(fields.Title.value,'Our custom title');
sharedRun("typed='incorrect'");assert.equal(sharedRun('completeBookVerse()'),false);
assert.equal(sharedRun('current.entries.length'),1,'mistakes do not contribute');
sharedRun("typed=target");assert.equal(sharedRun('completeBookVerse()'),true);
assert.equal(sharedRun('current.entries.length'),2,'normal journey completion writes one collaborative contribution');
assert.equal(sharedRun('current.entries[1].name'),'Chris');
assert.equal(sharedRun('history.length'),1,'one history entry per completed collaborative verse');
assert.equal(sharedRun('history[0].collaborationId'),'abcdefgh');
assert.equal(sharedRun('history[0].journey'),'Journey with Ann');
assert.equal(sharedRun('history[0].contributor'),'Chris');
assert.equal(sharedRun('history[0].reference'),'A 1:2');
assert.equal(sharedRun('history[0].wpm'),45);
assert.equal(sharedRun('history[0].accuracy'),90);
assert.equal(sharedRun('journey().progress'),2);
assert.equal(sharedRun('position()'),2,'completed shared journey stops at its end');
sharedRun("scriptureReferences.push('A 1:3','A 1:4','A 1:5');journeyBooks[0].end=5;current.entries=[];verse=2;contribute(2)");
assert.equal(sharedRun('position()'),3,'manual verse selection continues forward instead of jumping to the earliest gap');
sharedRun('current.entries.push({verse:4});contribute(3)');
assert.equal(sharedRun('position()'),0,'after reaching the end, resume earlier unfinished verses');
sharedRun('current.entries=[];verse=1;current.entries.push({verse:2});contribute(1)');
assert.equal(sharedRun('position()'),3,'forward continuation skips completed verses');
console.log('Shared typing completion, separate records, ordered advance, and default/custom title checks passed.');

// Verify both collaboration-picker states and the empty-state destination.
let menu3Clicks=0,openedJourney=0;
const node=tag=>({tag,children:[],attributes:{},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(key,value){this.attributes[key]=value;}});
const list=node('div');
const pickerContext=vm.createContext({
  document:{createElement:node,querySelector:()=>({click(){menu3Clicks++;}})},
  el:()=>list,picker:{close(){}},select:()=>{},openJourney:()=>openedJourney++,
});
vm.runInContext('let records=[],current=null,selected=false;'+source.slice(source.indexOf('  function refreshSaved()'),source.indexOf('  function paint()')),pickerContext);
vm.runInContext('refreshSaved()',pickerContext);
assert.equal(list.children.length,1);
assert.equal(list.children[0].textContent,'Create or join a collaboration');
assert.equal(list.children[0].className,'collaboration-create-link');
assert.equal(list.children[0].href,'#collaborative');
list.children[0].onclick({preventDefault(){}});assert.equal(menu3Clicks,1,'empty state opens menu 3');
vm.runInContext("records=[{id:'abcdefgh',title:'Journey with Ann',scope:'A',entries:[]}];refreshSaved()",pickerContext);
assert.equal(list.children.length,1);
assert.match(list.children[0].children[0].textContent,/Journey with Ann/);
list.children[0].children[0].onclick();assert.equal(openedJourney,1,'saved collaboration opens shared typing in menu 1');
console.log('Collaboration picker checks passed: boxed create/join link, menu 3 destination, saved journey selection.');

let navigations=0;
const joinFields={Code:{value:'abcdefgh'},Name:{value:'Ann'}};
const peerHandlers={},connectionHandlers={};
const connection={peer:'host',open:true,on:(event,callback)=>connectionHandlers[event]=callback,send(){},close(){}};
const peerIds=[];
class FakePeer {constructor(id){peerIds.push(id);}on(event,callback){peerHandlers[event]=callback;}connect(){return connection;}}
const flow=vm.createContext({Peer:FakePeer,setTimeout:()=>1,clearTimeout:()=>{},scheduleSync:()=>{},el:id=>joinFields[id],status:()=>{},disconnect:()=>{},syncConnection:()=>{},
  paint:()=>{},refreshTyping:()=>{},updateBookProgress:()=>{},renderBookContext:()=>{},publish:()=>{},send:()=>{},
  menuStates:new Map(),openJourney:()=>navigations++,
});
vm.runInContext("let autoSync=true,connectTimeout=null,current=null, records=[], currentMenu='collaborationSetup',peer=null,host=false,links=new Map(),verse=null,selected=false;"+
  source.slice(source.indexOf('  const validCode'),source.indexOf('  function validate'))+
  "function merge(incoming){if(!incoming[0].scope)throw Error('invalid');records=incoming;}"+
  source.slice(source.indexOf('  function connect('),source.indexOf("  let chosenScope")),flow);
vm.runInContext('connect(false)',flow);
assert.equal(navigations,0,'joining waits for a valid shared record');
peerHandlers.open();connectionHandlers.open();
connectionHandlers.data({type:'journey',journey:{id:'abcdefgh',scope:''}});
assert.equal(navigations,0,'invalid shared data does not navigate');
connectionHandlers.data({type:'journey',journey:{id:'abcdefgh',scope:'A'}});
assert.equal(navigations,1,'successful join immediately opens menu 1');
connectionHandlers.data({type:'journey',journey:{id:'abcdefgh',scope:'A'}});
assert.equal(navigations,1,'later sync messages do not navigate again');
const createFields={Create:{},Name:{value:'Ann'},Title:{value:'Journey with Ann'}};
const createFlow=vm.createContext({withName:action=>action(),el:id=>createFields[id],journeyCode:()=> 'abcdefgh',select:()=>{},save:()=>{},connect:()=>{},openJourney:()=>navigations++});
vm.runInContext("let records=[],chosenScope='A';"+source.slice(source.indexOf("  el('Create').onclick"),source.indexOf("  el('Connection').onclick")),createFlow);
createFields.Create.onclick();assert.equal(navigations,2,'creating immediately opens menu 1');
console.log('Creation and join navigation checks passed: immediate opening, validated join, no repeated navigation on sync.');

vm.runInContext('connect(true,true)',flow);
assert.equal(peerIds.at(-1),'logostype-journey-abcdefgh','saved journey first attempts automatic hosting');
peerHandlers.error({type:'unavailable-id'});
assert.equal(peerIds.at(-1),undefined,'when a host already exists, automatic sync joins it');
console.log('Automatic sync checks passed: saved journey hosting and existing-host fallback.');

const disk=new Map();
const storageContext=vm.createContext({localStorage:{setItem:(key,value)=>disk.set(key,value)},status:()=>{}});
vm.runInContext("const key='logostype-collaborative-journeys';let records=[{id:'abcdefgh',title:'Journey with Ann',scope:'A',entries:[]}];"+source.slice(source.indexOf('  function save()'),source.indexOf('  function merge(')),storageContext);
assert.equal(vm.runInContext('save()',storageContext),true);
assert.equal(JSON.parse(disk.get('logostype-collaborative-journeys'))[0].id,'abcdefgh','local record survives serialization for reload');
console.log('Local persistence check passed: collaborations are written to browser storage.');

const backupContext=vm.createContext({window:{},scriptureReferences:['A 1:1','A 1:2'],journeyBooks:[{name:'A'}],validateJourneyDates:v=>v,validateJourneyAttempts:v=>v,validateBookJourneys:v=>v,validateHistoryChart:v=>v,validateAttemptReplay:v=>v});
vm.runInContext(data.slice(data.indexOf('function validateBackup('),data.indexOf('function historyKey(')),backupContext);
backupContext.backup={format:'logostype-backup',version:1,bookProgress:0,history:JSON.parse(sharedRun('JSON.stringify(history)'))};
const restoredHistory=vm.runInContext('validateBackup(backup).history',backupContext);
assert.equal(restoredHistory[0].collaborationId,'abcdefgh');
assert.equal(restoredHistory[0].contributor,'Chris');
assert.equal(restoredHistory[0].journey,'Journey with Ann');
backupContext.backup.history[0].collaborationId='bad';
assert.throws(()=>vm.runInContext('validateBackup(backup)',backupContext));
console.log('Collaborative typing history checks passed: results, chart/replay fields, attribution, and backup metadata.');

let prompted=0,resumed=0;
const nameField={value:''};
const nameContext=vm.createContext({el:()=>nameField,getProfileName:()=>'',updateDefaultTitle:()=>{},nameDialog:{showModal:()=>prompted++}});
nameField.focus=()=>{};
vm.runInContext('let afterName=null;'+source.slice(source.indexOf('  function withName('),source.indexOf("  nameDialog.querySelector('.close')")),nameContext);
nameContext.action=()=>resumed++;
vm.runInContext('withName(action)',nameContext);
assert.equal(prompted,1);assert.equal(resumed,0,'missing name waits for popup');
nameField.value='Ann';vm.runInContext('withName(action)',nameContext);
assert.equal(resumed,1,'chosen name continues immediately');

// Claimed personal progress must be backed by completed typing records in this backup.
backupContext.journeyBooks[0].start=0;backupContext.journeyBooks[0].end=2;
backupContext.validateJourneyShuffled=v=>v;
const typedVerse=(reference,journey='Entire Scriptures')=>({mode:'book',limit:1,date:'2026-11-11',wpm:40,accuracy:100,reference,journey});
const checkBackup=value=>{backupContext.progressBackup={format:'logostype-backup',version:1,bookProgress:0,history:[],...value};return vm.runInContext('validateBackup(progressBackup)',backupContext);};
assert.throws(()=>checkBackup({bookProgress:1}),/matching typing record/);
assert.doesNotThrow(()=>checkBackup({bookProgress:1,history:[typedVerse('A 1:1')]}));
assert.throws(()=>checkBackup({bookProgress:2,history:[typedVerse('A 1:1')]}),/A 1:2/);
assert.throws(()=>checkBackup({bookProgress:1,history:[typedVerse('A 1:1','A')]}),/matching typing record/);
assert.throws(()=>checkBackup({bookJourneys:{A:{progress:1,completions:[]}}}),/matching typing record/);
assert.doesNotThrow(()=>checkBackup({bookJourneys:{A:{progress:1,completions:[]}},history:[typedVerse('A 1:1','A')]}));
assert.throws(()=>checkBackup({journeyShuffled:{'Entire Scriptures':{cycle:null,verses:[1]}}}),/A 1:2/);
assert.throws(()=>checkBackup({journeyCompletions:['2026-11-11'],history:[typedVerse('A 1:1')]}),/A 1:2/);
assert.doesNotThrow(()=>checkBackup({history:[typedVerse('A 1:1')]}));
console.log('Backup progress checks passed: missing/partial history, journey matching, books, shuffled verses, and past completions.');
const cycleHistory=[typedVerse('A 1:1'),typedVerse('A 1:2')];
assert.throws(()=>checkBackup({journeyCompletions:['2026-10-01','2026-11-01'],history:cycleHistory}),/requires 2/);
assert.doesNotThrow(()=>checkBackup({journeyCompletions:['2026-10-01','2026-11-01'],history:[...cycleHistory,...cycleHistory]}));
assert.throws(()=>checkBackup({bookProgress:1,journeyCompletions:['2026-10-01'],history:cycleHistory}),/requires 2/);
assert.throws(()=>checkBackup({history:[{...typedVerse('A 1:1'),id:'same'},{...typedVerse('A 1:2'),id:'same'}]}),/Conflicting typing result/);
assert.throws(()=>checkBackup({history:Array(1000001)}),/too many records/);
context.conflicting=[{...journey,entries:[{...journey.entries[0],name:'Other'}]}];
assert.throws(()=>run('prepareImport(conflicting)'),/Conflicting collaborative/);
vm.runInContext(data.slice(data.indexOf('function historyKey('),data.indexOf('function importBackup(')),backupContext);
backupContext.localResults=[{...typedVerse('A 1:1'),id:'same'}];backupContext.incomingResults=[{...typedVerse('A 1:2'),id:'same'}];
assert.throws(()=>vm.runInContext('mergeTypingHistory(localResults,incomingResults)',backupContext),/Conflicting typing result/);
// Fail the last write: every earlier storage key must return to its previous value.
const importKeys=Array.from({length:14},(_,i)=>'key'+i),before=new Map(importKeys.map(key=>[key,'old'])),transactionDisk=new Map(before);
let failWrite=true;
const transaction=vm.createContext({keys:importKeys,previous:importKeys.map(()=> 'old'),merged:[],progress:1,name:'Ann',completedAt:null,completions:[],mergedBooks:{},mergedAttempts:[],backup:{},mergedJourneyDates:{},retainedLimit:0,mergedShuffled:{},mergedFriends:[],mergedCollaborations:[],localStorage:{setItem(key,value){if(key==='key13'&&failWrite){failWrite=false;throw Error('quota');}transactionDisk.set(key,value);},removeItem:key=>transactionDisk.delete(key)}});
const transactionStart=data.indexOf('  try{\n    localStorage.setItem(keys[0]');
assert.throws(()=>vm.runInContext(data.slice(transactionStart,data.indexOf('  window.friendRecords?.replace(mergedFriends)',transactionStart)),transaction),/Could not save/);
assert.deepEqual(transactionDisk,before,'failed collaborative persistence rolls back all imported keys');
console.log('Import hardening checks passed: cycle counts, duplicate/conflicting IDs, record limits, and storage rollback.');

const fastResult={mode:'words',limit:10,date:'2026-11-11',wpm:300,accuracy:100,durationMs:1001};
assert.throws(()=>checkBackup({history:[fastResult]}),/300 WPM/);
assert.doesNotThrow(()=>checkBackup({history:[{...fastResult,wpm:299}]}));
assert.doesNotThrow(()=>checkBackup({history:[{...fastResult,durationMs:1000}]}));
assert.doesNotThrow(()=>checkBackup({history:[{...fastResult,mode:'custom'}]}));
assert.throws(()=>checkBackup({history:[{...fastResult,mode:'time',limit:15,durationMs:undefined}]}),/300 WPM/);
assert.throws(()=>checkBackup({history:[{...fastResult,durationMs:undefined,chart:{sampleTimes:[1,2]}}]}),/300 WPM/);
assert.throws(()=>checkBackup({history:[{...fastResult,durationMs:undefined,replay:{durationMs:2000}}]}),/300 WPM/);
sharedRun('speed=()=>300;start=Date.now()-2000');
const oldEntries=sharedRun('current.entries.length'),oldHistory=sharedRun('history.length');
assert.equal(sharedRun('completeBookVerse()'),false,'invalid speed does not complete a shared verse');
assert.equal(sharedRun('current.entries.length'),oldEntries);
assert.equal(sharedRun('history.length'),oldHistory);
console.log('Speed validity checks passed: threshold, duration boundary, custom exemption, imported duration evidence, and shared progress.');

let confirmDelete=false,deleteFailure=false,disconnects=0,personalReturns=0;
const deletedDisk=new Map();
const deleteContext=vm.createContext({window:{confirm:()=>confirmDelete},localStorage:{setItem(k,v){if(deleteFailure)throw Error('quota');deletedDisk.set(k,v);}},status:()=>{},disconnect:()=>disconnects++,enterBook:()=>personalReturns++,refreshSaved:()=>{},paint:()=>{},menuStates:new Map()});
vm.runInContext("const key='copies';let records=[{id:'one',title:'One'},{id:'two',title:'Two'}],current=records[0],selected=true,verse=0,infoExpanded=true,autoSync=true,currentMenu='collaborative';"+source.slice(source.indexOf('  function remove('),source.indexOf('  function refreshSaved(')),deleteContext);
const removeCopy=()=>vm.runInContext("remove('one')",deleteContext);
confirmDelete=true;deleteFailure=true;assert.equal(removeCopy(),false);
assert.equal(vm.runInContext('records.length',deleteContext),2,'storage failure preserves local copies');
deleteFailure=false;assert.equal(removeCopy(),true);
assert.equal(disconnects,1);assert.equal(personalReturns,1);
assert.equal(vm.runInContext('current',deleteContext),null);
assert.deepEqual(JSON.parse(deletedDisk.get('copies')),[{id:'two',title:'Two'}]);
console.log('Collaboration deletion checks passed: confirmation, cancellation, storage failure, local persistence, and active disconnect.');

// The themed dialog must wait for explicit confirmation; cancel is the default focus.
let removedByDialog=0,focusedCancel=0;
const confirmControls={'#cjDeleteMessage':{},'[data-cancel]':{focus:()=>focusedCancel++},'[data-confirm]':{}};
let onDeleteClose;
const mockDeleteDialog={setAttribute(){},querySelector:key=>confirmControls[key],showModal(){this.open=true;},close(){this.open=false;onDeleteClose();},addEventListener(type,handler){if(type==='close')onDeleteClose=handler;}};
const themedDelete=vm.createContext({document:{createElement:()=>mockDeleteDialog,body:{append(){}},activeElement:null},remove:()=>{removedByDialog++;return true;}});
vm.runInContext("let records=[{id:'one',title:'One'}];"+source.slice(source.indexOf('  const deleteDialog='),source.indexOf('  function remove(')),themedDelete);
vm.runInContext("requestRemove('one')",themedDelete);assert.equal(removedByDialog,0);assert.equal(focusedCancel,1);
confirmControls['[data-cancel]'].onclick();assert.equal(removedByDialog,0,'themed cancel keeps local copy');
vm.runInContext("requestRemove('one')",themedDelete);confirmControls['[data-confirm]'].onclick();assert.equal(removedByDialog,1,'themed confirmation deletes once');
