const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const elements=new Map();
let saved='',storageFails=false,chosen;
const context=vm.createContext({
 pendingNameAction:null,raceNameSession:'',
 $:selector=>{
  if(!elements.has(selector))elements.set(selector,{value:'',open:false,handlers:{},showModal(){this.open=true;},close(){this.open=false;},focus(){},addEventListener(type,fn){this.handlers[type]=fn;}});
  return elements.get(selector);
 },
 getProfileName:()=>saved,cleanName:value=>value.trim().slice(0,24),updateProfileLabel(){},
 localStorage:{setItem(key,value){if(storageFails)throw Error('storage unavailable');saved=value;}},
 choose:name=>{chosen=name;},Math,
});
const source=fs.readFileSync(path.join(__dirname,'..','race.js'),'utf8');
vm.runInContext(source.slice(source.indexOf('  function randomRacerName(){'),source.indexOf('  function joinCode(')),context);
const run=code=>vm.runInContext(code,context);
saved='Existing name';run('withRacerName(choose)');
assert.equal(chosen,saved);assert(!context.$('#raceNameDialog').open);
saved='';chosen=undefined;run('withRacerName(choose)');
assert(context.$('#raceNameDialog').open);assert.equal(chosen,undefined);
context.$('#raceName').value='  New player  ';context.$('#confirmRaceName').onclick();
assert.equal(chosen,'New player');assert.equal(saved,'New player');
saved='';run('withRacerName(choose)');context.$('#confirmRaceName').onclick();
assert(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/.test(chosen));assert.equal(saved,chosen);
saved='';run('withRacerName(choose)');
context.$('#raceNameDialog').handlers.cancel({preventDefault(){}});
assert(chosen.length<=24);assert(!context.$('#raceNameDialog').open);
saved='';storageFails=true;run('withRacerName(choose)');
context.$('#raceName').value='Session player';context.$('#confirmRaceName').onclick();
assert.equal(chosen,'Session player');
chosen=undefined;run('withRacerName(choose)');
assert.equal(chosen,'Session player');assert(!context.$('#raceNameDialog').open);
console.log('Race name checks passed: saved names, prompt, trimmed names, random fallback, Escape, settings reset, and storage-unavailable session fallback.');

// Invite startup uses the same validated join and profile-name flow as manual entry.
const startup=source.slice(source.indexOf('  const invitedRoom='),source.lastIndexOf('})();'));
const join=source.slice(source.indexOf('  function joinCode('),source.indexOf('  function updateJoinAction('));
for(const [query,expected] of [['?race=A1B2C3D4','a1b2c3d4'],['?race=invalid',null],['?race=',null],['',null]]){
  let opened=0,connection=null,error='';
  const inviteContext=vm.createContext({
    URL,location:{href:'https://example.com/logostype/'+query},
    $:context.$,open(){opened++;},showError(message){error=message;},
    withRacerName(action){action('Saved racer');},
    connect(...args){connection=args;},
  });
  context.$('#joinRoom').disabled=false;
  vm.runInContext(join+startup,inviteContext);
  assert.equal(opened,query?1:0);
  if(expected)assert.deepEqual(connection,[false,expected,'Saved racer','join']);
  else assert.equal(connection,null);
  if(query&&!expected)assert.equal(error,'Enter the 8-character room code.');
}
console.log('Race invite checks passed: automatic join, normalized code, invalid/empty invite errors, and ordinary startup.');
