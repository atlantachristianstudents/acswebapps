const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const history=[80,20,60,40,100,10,70,50].map((wpm,index)=>({wpm,date:'2026-01-0'+(index+1),mode:'time',limit:15,capitalization:false,punctuation:false}));
const context=vm.createContext({history,historyProgressionBand:'top',historyProgressionPercent:25,
 historyProgressionFormat:'time:15',historyProgressionSettings:'off',
 historyWithinDateRange:()=>true,historyResultDate:result=>new Date(result.date),
 progressionFormat:result=>result.mode+':'+result.limit,progressionFormatLabel:String,
 historyDescription:result=>String(result.wpm),escapeHtml:String,
});
vm.runInContext(source.slice(source.indexOf('function progressionPercentileEntries('),source.indexOf('\nfunction historyDescription(')),context);
vm.runInContext(source.slice(source.indexOf('function renderHistoryProgressionChart()'),source.indexOf('\nfunction openHistoryResult(')),context);
const run=code=>vm.runInContext(code,context);
run('var entries=history.map((result,index)=>({result,index}))');
const selected=()=>run('progressionPercentileEntries(entries).map(entry=>entry.index).join(",")');
assert.equal(selected(),'0,4');
context.historyProgressionBand='bottom';assert.equal(selected(),'1,5');
context.historyProgressionBand='middle';assert.equal(selected(),'2,7');
context.historyProgressionBand='top';context.historyProgressionPercent=1;assert.equal(selected(),'4');
context.historyProgressionPercent=100;assert.equal(selected(),'0,1,2,3,4,5,6,7');
context.historyProgressionBand='all';context.historyProgressionPercent=1;assert.equal(selected(),'0,1,2,3,4,5,6,7');
context.historyProgressionBand='top';context.historyProgressionPercent=25;
history.push({wpm:999,date:'2026-01-09',mode:'words',limit:25,capitalization:false,punctuation:false});
history.push({wpm:500,date:'2026-01-10',mode:'time',limit:15,capitalization:true,punctuation:true});
let html=run('renderHistoryProgressionChart()');
assert(html.includes('2 of 8 matching results'));
assert(html.includes('data-progression-index="0"'));assert(html.includes('data-progression-index="4"'));
assert(!html.includes('data-progression-index="8"'));assert(!html.includes('data-progression-index="9"'));
context.historyWithinDateRange=result=>result.date>='2026-01-05';context.historyProgressionPercent=50;
html=run('renderHistoryProgressionChart()');
assert(html.includes('2 of 4 matching results'));
assert(html.includes('data-progression-index="4"'));assert(html.includes('data-progression-index="6"'));
context.historyWithinDateRange=()=>false;assert(run('renderHistoryProgressionChart()').includes('No saved results'));
run('entries=[0,1,2,3].map(index=>({index,result:{wpm:50}}))');
context.historyProgressionBand='bottom';assert.equal(selected(),'0,1');
context.historyProgressionBand='top';assert.equal(selected(),'2,3');
console.log('Progression percentile checks passed: top/bottom/middle/all, rounding, 100%, stable ties, chronological order, format/caps/date intersection, empty history.');
