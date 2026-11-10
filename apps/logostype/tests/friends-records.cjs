const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const source=fs.readFileSync(path.join(root,'friends-records.js'),'utf8');
function browser(name,history=[],saved=new Map()){
  const context=vm.createContext({window:{},document:{getElementById:()=>null},history,
    getProfileName:()=>name,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}});
  vm.runInContext(app.slice(app.indexOf('function personalRecordCategories('),app.indexOf('function renderPersonalRecords(')),context);
  vm.runInContext(source,context);
  return {context,api:context.window.friendRecords,saved};
}
const result=(wpm,extra={})=>({mode:'time',limit:60,wpm,accuracy:98,date:'2026-11-10',capitalization:false,punctuation:false,...extra});
const alice=browser('Alice',[result(80),result(95),result(100,{capitalization:true,punctuation:true}),result(999,{mode:'custom'})]);
const bob=browser('Bob',[result(110)]);
assert.equal(alice.api.summary().records.length,3,'only populated category/settings summaries shared');
assert(!JSON.stringify(alice.api.summary()).includes('events'),'recordings are never in summaries');
bob.api.accept(alice.api.summary());
assert.equal(bob.api.export().find(record=>record.setting===0).wpm,100,'all-time personal best selected');
assert.equal(bob.api.export().find(record=>record.setting===1).wpm,95);
assert.equal(bob.api.export().find(record=>record.setting===2).wpm,100);
assert.equal(bob.api.export()[0].name,'Alice');
const reloaded=browser('Bob',[],bob.saved);
assert.equal(JSON.stringify(reloaded.api.export()),JSON.stringify(bob.api.export()),'records persist after reload');
const slower=browser('Slow',[result(50)]);bob.api.accept(slower.api.summary());
assert.equal(bob.api.export().find(record=>record.setting===1).wpm,95,'slower peers never overwrite best');
const fast=browser('<Fast>',[result(120)]);bob.api.accept(fast.api.summary());
assert.equal(bob.api.export().find(record=>record.setting===0).name,'<Fast>');
assert(bob.api.render().includes('&lt;Fast>'),'record holder names escape HTML');
assert(!bob.api.accept({name:'Bad',records:[{category:99,setting:0,wpm:999}]}));
assert(!bob.api.accept({name:'Bad',records:Array(31).fill({})}));
assert.throws(()=>bob.api.validate([{...bob.api.export()[0],wpm:Infinity}]));
const merged=bob.api.merge(bob.api.export(),alice.api.export());
assert.equal(merged.find(record=>record.setting===0).wpm,120,'backup merges retain best');
bob.api.replace([]);assert.equal(bob.api.export().length,0,'clear saved data clears in-memory records');
alice.context.history.unshift(result(130));
assert.equal(alice.api.summary().records.find(record=>record.setting===0).wpm,130,'new results refresh online summary');
console.log('Friends record checks passed: category/settings bests, compact sharing, persistence, holder names, escaping, validation, merge, clearing, and live updates.');

Object.assign(alice.context,{scriptureReferences:[],validateJourneyDates:value=>value,validateJourneyAttempts:value=>value,validateBookJourneys:value=>value});
const data=fs.readFileSync(path.join(root,'data.js'),'utf8');
vm.runInContext(data.slice(data.indexOf('function validateBackup('),data.indexOf('function historyKey(')),alice.context);
alice.context.backup={format:'logostype-backup',version:1,bookProgress:0,history:[],friendRecords:reloaded.api.export()};
const restored=vm.runInContext('validateBackup(backup)',alice.context);
assert.equal(restored.friendRecords.length,reloaded.api.export().length,'friends scores survive backup validation');
assert.equal(vm.runInContext('validateBackup({...backup,friendRecords:undefined}).friendRecords.length',alice.context),0,'older backups remain supported');
assert.throws(()=>vm.runInContext('validateBackup({...backup,friendRecords:[{category:100}]})',alice.context));
console.log('Friends backup checks passed: valid records preserved, older backups accepted, and malformed scores rejected.');
