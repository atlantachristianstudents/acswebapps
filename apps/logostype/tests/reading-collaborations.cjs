const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../reading.js'),'utf8');
const context=vm.createContext({
  window:{collaborativeJourneys:{export:()=>[
    {id:'123456789012',title:'Shared A',entries:[{verse:2},{verse:0},{verse:2}]},
    {id:'000123456789',title:'Shared B',entries:[{verse:1}]}
  ]}},
  journeyBooks:[{name:'A',start:0,end:3}],bookJourneys:{},scriptureLines:['one','two','three'],bookProgress:0,journeyCompletions:[],journeyVerseCompleted:()=>false
});
vm.runInContext(source.slice(source.indexOf('function readingJourney('),source.indexOf('function openJourneyReader(')),context);
const read=name=>JSON.parse(vm.runInContext('JSON.stringify(readingJourney('+JSON.stringify(name)+'))',context));
assert.deepEqual(read('collaboration:123456789012').indices,[0,2],'shared verses are sorted and deduplicated');
assert.deepEqual(read('collaboration:000123456789').indices,[1],'collaborations stay independent');
assert.equal(read('').progress,0,'shared verses never unlock personal entire Scriptures');
assert.equal(read('A').progress,0,'shared verses never unlock personal book reading');
assert.equal(read('collaboration:missing').progress,0,'deleted collaborations have no readable verses');
context.bookProgress=3;context.journeyVerseCompleted=()=>true;
assert.deepEqual(read('collaboration:123456789012').indices,[0,2],'personal progress never unlocks shared verses');
console.log('Collaborative reading checks passed: separate sources, deduplication, order, missing journeys, and personal/shared isolation.');
