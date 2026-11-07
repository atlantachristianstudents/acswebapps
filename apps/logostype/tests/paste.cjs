const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const handlers={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','navigation.js'),'utf8'),{
 document:{querySelector:()=>null,addEventListener:(type,callback)=>{(handlers[type]||=[]).push(callback);}},
});
function target(id,editable=true){const field={id};field.closest=()=>editable?field:null;return field;}
function blocked(type,field,inputType){
 let prevented=false;
 const event={target:field,inputType,preventDefault(){prevented=true;},stopPropagation(){}};
 for(const handler of handlers[type]||[])handler(event);
 return prevented;
}
for(const field of [target('typing'),target('words',false),target('readingContent',false)]){
 assert(blocked('paste',field));
 assert(blocked('beforeinput',field,'insertFromPaste'));
 assert(blocked('beforeinput',field,'insertFromPasteAsQuotation'));
 assert(!blocked('beforeinput',field,'insertText'),'normal keystrokes remain allowed');
}
for(const id of ['profileName','raceName','roomCode','historySearch','customText','raceCustomText','verseReference']){
 const field=target(id);
 assert(!blocked('paste',field),id);
 assert(!blocked('beforeinput',field,'insertFromPaste'),id);
}
assert(blocked('paste',{...target('inviteLink'),readOnly:true,closest(){return this;}}));
console.log('Paste checks passed: typing and non-editor areas blocked; editable text boxes and normal typing preserved.');
