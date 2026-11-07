const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const elements=new Map(),stored=new Map();
let click,fail=false;
const context=vm.createContext({
 history:Array.from({length:40},(_,index)=>({id:String(index),date:new Date(2026,0,index+1).toISOString(),wpm:index,chart:{keep:true},replay:{keep:true},raceReplay:{keep:true}})),
 historyResultDate:result=>new Date(result.date),historyDescription:result=>result.id,historyKey:result=>result.id,escapeHtml:String,
 openModal(){},
 $:selector=>{
  if(!elements.has(selector))elements.set(selector,{value:'',dataset:{},open:false,showModal(){this.open=true;},close(){this.open=false;},focus(){},addEventListener(){}});
  return elements.get(selector);
 },
 localStorage:{getItem:key=>stored.get(key)||null,setItem(key,value){if(fail)throw Error('full');stored.set(key,value);}},
 document:{addEventListener:(type,handler)=>{if(type==='click')click=handler;}},
});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','history-store.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context);
function press(id,dataset={}){const button={id,dataset};click({target:{closest:()=>button}});}
context.$('#replayRetention').value='25';press('applyReplayRetention');
assert.equal(context.history.filter(result=>result.replay).length,40,'retention asks before deleting recordings');
context.$('#confirmHistoryCleanup').onclick();
assert.equal(context.history.length,40);assert.equal(context.history.filter(result=>result.replay).length,25);
assert(context.history[0].chart.keep);assert.equal(context.history[0].wpm,0);assert(!context.history[0].raceReplay);
assert.equal(stored.get('logostype-replay-limit'),'25');
context.history.unshift({id:'new',date:'2027-01-01',wpm:100,replay:{},chart:{}});
run('saveTypingHistory()');assert.equal(context.history.filter(result=>result.replay).length,25);assert(context.history[0].replay);
press('',{deleteHistoryIndex:'1'});context.history.unshift({id:'arrived',date:'2028-01-01',wpm:110});
context.$('#confirmHistoryCleanup').onclick();assert(!context.history.some(result=>result.id==='0'));assert(context.history.some(result=>result.id==='arrived'));
const previous=context.history;
fail=true;press('',{deleteHistoryIndex:'0'});context.$('#confirmHistoryCleanup').onclick();
assert.equal(context.history,previous,'failed writes restore history after deletion');fail=false;
press('deleteAllHistory');context.$('#cancelHistoryCleanup').onclick();assert(context.history.length>0);
press('deleteAllHistory');context.$('#confirmHistoryCleanup').onclick();assert.equal(context.history.length,0);
console.log('History storage checks passed: retention confirmation, score/chart preservation, future saves, targeted deletion, quota rollback, cancel, clear history.');

const data=fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8');
vm.runInContext(data.slice(data.indexOf('function historyKey('),data.indexOf('function importBackup(')),context);
vm.runInContext("var restored=mergeTypingHistory([{id:'saved',wpm:50}],[{id:'saved',wpm:50,replay:{recovered:true},raceReplay:{recovered:true}}])",context);
assert.equal(vm.runInContext('restored.length',context),1);
assert(vm.runInContext('restored[0].replay.recovered&&restored[0].raceReplay.recovered',context));
console.log('Replay restore checks passed: recover recordings without duplicating saved results.');
