const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let shortcut,secondary=false;
const actions=[];
const modal={open:true,dataset:{view:'records'},close(){this.open=false;actions.push('close');}};
const controls={};
for(const [selector,dialog] of [['#book'],['#readJourney'],['#home'],['#friends'],['#records','records'],['#history','history'],['header .account','settings']]){
 controls[selector]={title:'',dataset:dialog?{dialog}:{},click(){actions.push(selector);if(dialog){modal.open=true;modal.dataset.view=dialog;}}};
}
const document={
 activeElement:{id:'close',closest:()=>null},body:{classList:{contains:()=>false}},
 querySelector:selector=>selector==='#modal'?modal:selector==='dialog[open]:not(#modal)'?(secondary?{}:null):controls[selector]||null,
 addEventListener:(type,callback,capture)=>{if(type==='keydown'&&capture)shortcut=callback;},
};
const context=vm.createContext({focusLatestHistoryResult:()=>actions.push('focusLatest'),openModal:view=>{actions.push(view);modal.dataset.view=view;},document,mode:'custom',done:false});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','navigation.js'),'utf8'),context);
function key(value,repeat=false){shortcut({key:value,repeat,preventDefault(){},stopPropagation(){}});}
key('6');assert.equal(modal.dataset.view,'history');assert.deepEqual(actions,['#history']);
key('\\');assert.equal(modal.dataset.view,'settings');
key('3');assert.deepEqual(actions.slice(-2),['close','#home']);assert(!modal.open);
for(const view of ['history','settings','journeyCompletions','themes']){
 modal.open=true;modal.dataset.view=view;const count=actions.length;key('5');
 assert.equal(actions.length,count+1,view);assert.equal(modal.dataset.view,'records');
}
for(const [shortcutKey,view] of [['5','records'],['6','history'],['\\','settings']]){
 modal.open=true;modal.dataset.view=view;
 let count=actions.length;key(shortcutKey,true);
 assert(modal.open,'holding a shortcut does not close the menu');assert.equal(actions.length,count);
 key(shortcutKey);assert(!modal.open,view+' toggles closed');assert.equal(actions.at(-1),'close');
 context.done=true;key(shortcutKey);assert(modal.open,view+' toggles open');assert.equal(modal.dataset.view,view);
 context.done=false;
}
document.activeElement={id:'profileName',closest:()=>({})};
let count=actions.length;key('6');assert.equal(actions.length,count,'text entry is protected');
document.activeElement={id:'close',closest:()=>null};secondary=true;
key('6');assert.equal(actions.length,count,'confirmation dialogs block menu shortcuts');secondary=false;
modal.dataset.view='custom';key('6');assert.equal(actions.length,count,'custom text editor remains protected');
modal.open=false;key('6');assert.equal(actions.length,count,'unfinished custom typing remains protected');
context.done=true;key('6');assert.equal(actions.at(-1),'#history');
count=actions.length;key('5',true);assert.equal(actions.length,count,'key repeat does not retrigger menu actions');
console.log('Shortcut checks passed: records/history/settings navigation, main-view closing, custom-test guards, text fields, confirmations, repeat handling.');

for(const view of ['records']){
 modal.open=true;modal.dataset.view=view;document.activeElement={id:'close',closest:()=>null};
 key('j');assert.equal(modal.dataset.view,'journeyCompletions');
 key('j');assert.equal(modal.dataset.view,'records','J returns from Journey records to the records popup');
 assert.equal(modal.open,true);
}
modal.dataset.view='history';document.activeElement={id:'historySearch',closest:()=>({})};
count=actions.length;key('j');assert.equal(actions.length,count,'J remains normal text in history search');
document.activeElement={id:'close',closest:()=>null};modal.dataset.view='settings';
key('j');assert.equal(actions.length,count,'J is scoped to records');
modal.open=false;key('j');assert.equal(actions.length,count,'J does not navigate during typing');
console.log('Journey shortcut checks passed: J from records, field protection, and scoped activation.');

modal.open=true;modal.dataset.view='history';document.activeElement={id:'close',closest:()=>null};
key('h');assert.equal(actions.at(-1),'focusLatest');
count=actions.length;document.activeElement={id:'historySearch',closest:()=>({})};
key('h');assert.equal(actions.length,count,'H remains normal text in history search');
document.activeElement={id:'close',closest:()=>null};modal.dataset.view='records';
key('h');assert.equal(actions.length,count,'H only works in history');
console.log('History shortcut checks passed: H focuses the latest result, protects fields, and stays scoped.');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
let focused,scrolled;
const button=index=>({dataset:{historyIndex:String(index)},focus(){focused=index;},scrollIntoView(){scrolled=index;}});
let rows=[button(0),button(2)];
const historyContext=vm.createContext({
 document:{querySelectorAll:()=>rows},history:[{date:'2026-01-01'},{date:'2026-12-01'},{date:'2026-06-01'}],
 historyResultDate:result=>new Date(result.date),
});
vm.runInContext(appSource.slice(appSource.indexOf('function focusLatestHistoryResult()'),appSource.indexOf('document.addEventListener("input", event => {\n  if (event.target.id !== "historySearch")')),historyContext);
vm.runInContext('focusLatestHistoryResult()',historyContext);
assert.equal(focused,2);assert.equal(scrolled,2,'latest visible imported date is focused and scrolled');
rows=[button(0)];vm.runInContext('focusLatestHistoryResult()',historyContext);assert.equal(focused,0,'respect filtered results');
rows=[];vm.runInContext('focusLatestHistoryResult()',historyContext);
console.log('History focus checks passed: latest visible date, filtered results, empty history.');

modal.open=true;modal.dataset.view='history';document.activeElement={id:'close',closest:()=>null};
count=actions.length;key('j');assert.equal(actions.length,count,'J does not open Journey records from history');
