// Exchange small personal-best summaries, never complete histories or recordings.
(() => {
  const key='logostype-friends-records';
  function validate(entries){
    if(!Array.isArray(entries)||entries.length>30)throw new Error('Invalid friends records.');
    const keys=new Set();
    return entries.map(entry=>{
      if(!entry||!Number.isInteger(entry.category)||entry.category<0||entry.category>=10||!Number.isInteger(entry.setting)||entry.setting<0||entry.setting>2||!Number.isFinite(entry.wpm)||entry.wpm<=0||entry.wpm>1000||typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>24||!Number.isFinite(entry.accuracy)||entry.accuracy<0||entry.accuracy>100||typeof entry.date!=='string'||entry.date.length>100)throw new Error('Invalid friends records.');
      const id=entry.category+':'+entry.setting;if(keys.has(id))throw new Error('Duplicate friends record.');keys.add(id);
      return {category:entry.category,setting:entry.setting,wpm:entry.wpm,name:entry.name.trim(),accuracy:entry.accuracy,date:entry.date};
    });
  }
  function merge(existing,incoming){
    const best=new Map(validate(existing).map(entry=>[entry.category+':'+entry.setting,entry]));
    for(const entry of validate(incoming)){
      const id=entry.category+':'+entry.setting;
      if(!best.has(id)||entry.wpm>best.get(id).wpm)best.set(id,entry);
    }
    return [...best.values()].sort((a,b)=>a.category-b.category||a.setting-b.setting);
  }
  let records=[];
  try{records=validate(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}
  let summaryCache=null;
  function summary(name=getProfileName()){
    name=String(name||'typist').trim().slice(0,24)||'typist';
    if(summaryCache&&summaryCache.history===history&&summaryCache.length===history.length&&summaryCache.first===history[0]&&summaryCache.name===name)return summaryCache.value;
    const entries=[];
    personalRecordCategories().forEach((category,index)=>{
      for(let setting=0;setting<3;setting++){
        let best=null;
        for(const result of history){
          if(!category.matches(result)||!Number.isFinite(result.wpm)||result.wpm<=0||result.wpm>1000)continue;
          if(setting===1&&(result.capitalization!==false||result.punctuation!==false))continue;
          if(setting===2&&(result.capitalization!==true||result.punctuation!==true))continue;
          if(!best||result.wpm>best.wpm)best=result;
        }
        if(best)entries.push({category:index,setting,wpm:best.wpm,name,accuracy:Number.isFinite(best.accuracy)?Math.max(0,Math.min(100,best.accuracy)):100,date:String(best.date||'').slice(0,100)});
      }
    });
    const value={name,records:entries};summaryCache={history,length:history.length,first:history[0],name,value};return value;
  }
  function cleanSummary(value){
    if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>24||!Array.isArray(value.records)||value.records.length>30)return null;
    try{return {name:value.name,records:validate(value.records.map(entry=>({...entry,name:value.name}))) };}catch{return null;}
  }
  function replace(entries){records=validate(entries);refresh();}
  function accept(value){
    const incoming=cleanSummary(value);if(!incoming)return false;
    const next=merge(records,incoming.records);
    if(JSON.stringify(next)!==JSON.stringify(records)){
      records=next;try{localStorage.setItem(key,JSON.stringify(records));}catch{}
      refresh();
    }
    return true;
  }
  function table(){
    const settings=['overall','caps off','caps on'];
    return '<table class="records-table personal-records"><thead><tr><th scope="col">test</th>'+settings.map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+personalRecordCategories().map((category,index)=>'<tr><th scope="row">'+category.label+'</th>'+settings.map((_,setting)=>{
      const record=records.find(entry=>entry.category===index&&entry.setting===setting);
      return '<td>'+(record?'<strong>'+record.wpm+' wpm</strong><br><small>'+escapeHtml(record.name)+'</small>':'—')+'</td>';
    }).join('')+'</tr>').join('')+'</tbody></table>';
  }
  function refresh(){const node=document.getElementById?.('friendsRecordsTable');if(node)node.innerHTML=table();}
  function render(){return '<h3>friends records</h3><p>Highest personal records shared by players online with you in the lobby or a race room. Saved on this device; shared scores are self-reported.</p><div id="friendsRecordsTable">'+table()+'</div>';}
  window.friendRecords={validate,merge,summary,cleanSummary,accept,replace,render,export:()=>records.map(entry=>({...entry}))};
})();
