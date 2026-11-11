(() => {
let readingChapters=[],readingChapter=0,readingJourneyName=null;
function readingJourney(name){
  if(name?.startsWith('collaboration:')){
    const collaboration=window.collaborativeJourneys?.export().find(item=>'collaboration:'+item.id===name);
    const indices=collaboration?[...new Set(collaboration.entries.map(entry=>entry.verse))].sort((a,b)=>a-b):[];
    return {name:collaboration?.title||'Collaboration',indices,progress:indices.length,start:0,end:scriptureLines.length,collaborative:true};
  }
  const book=journeyBooks.find(book=>book.name===name);
  const own=book?{...book,...(bookJourneys[name]||{progress:0,completions:[]})}:{name:'Entire Scriptures',start:0,end:scriptureLines.length,progress:bookProgress,completions:journeyCompletions};
  const all={name:'Entire Scriptures',start:0,end:scriptureLines.length,progress:bookProgress,completions:journeyCompletions};
  const indices=[];
  for(let index=own.start;index<own.end;index++) if(own.completions.length||journeyVerseCompleted(own,index)||(book&&(all.completions.length||journeyVerseCompleted(all,index)))) indices.push(index);
  return {...own,indices,progress:indices.length};
}
function openJourneyReader(){
  readingJourneyName=null;
  const content=$('#readingContent');
  content.innerHTML='<h1 id="readingPickerTitle">Read the scriptures you typed</h1><p>Choose a book or entire Scriptures to read completed verses. Complete at least one verse to unlock a choice. Journeys completed at least once stay fully available after restarting.</p><p class="testament-legend"><span class="old-testament">Old Testament</span><span class="new-testament">New Testament</span><button class="reading-collaborations" type="button" data-reading-collaborations aria-haspopup="dialog" aria-controls="readingCollaborationsDialog">collaborations</button></p><div class="journey-grid" role="group" aria-labelledby="readingPickerTitle">'+['',...journeyBooks.map(book=>book.name)].map((name,index)=>{
    const journey=readingJourney(name),available=journey.progress>0;
    return '<button type="button" data-reading-journey="'+escapeHtml(name)+'" class="'+(name?(index<=39?'old-testament':'new-testament'):'entire-journey')+'" '+(available?'':'disabled')+'>'+escapeHtml(name||'entire Scriptures')+'<small>'+(available?journey.progress.toLocaleString()+' verses completed':'No completed verses')+'</small></button>';
  }).join('')+'</div>';
  content.querySelector('.journey-grid').onclick=event=>{const button=event.target.closest('[data-reading-journey]');if(button&&!button.disabled)openReadingJourney(button.dataset.readingJourney)};
  $('#readingContent').focus({preventScroll:true});
  window.scrollTo(0,0);
}
const collaborationPicker=document.createElement('dialog');
collaborationPicker.id='readingCollaborationsDialog';
collaborationPicker.setAttribute('aria-labelledby','readingCollaborationsTitle');
collaborationPicker.innerHTML='<button type="button" class="close" aria-label="Close collaborations">×</button><h2 id="readingCollaborationsTitle">Read collaborations</h2><p>Shared completed verses are separate from your personal journeys.</p><div id="readingCollaborationChoices"></div>';
document.body.append(collaborationPicker);
collaborationPicker.querySelector('.close').onclick=()=>collaborationPicker.close();
collaborationPicker.addEventListener('close',()=>document.querySelector('[data-reading-collaborations]')?.focus());
function openReadingCollaborations(){
  const list=collaborationPicker.querySelector('#readingCollaborationChoices');list.replaceChildren();
  const collaborations=window.collaborativeJourneys?.export()||[];
  if(!collaborations.length){const note=document.createElement('p');note.textContent='No saved collaborations. Create or join one in menu 3 to start reading shared completed verses here.';list.append(note);}
  for(const collaboration of collaborations){
    const name='collaboration:'+collaboration.id,journey=readingJourney(name);
    const button=document.createElement('button');button.type='button';button.className='collaboration-choice';
    button.textContent=collaboration.title+' · '+journey.progress+' completed verses';button.disabled=!journey.progress;
    button.onclick=()=>{collaborationPicker.close();openReadingJourney(name);};
    const row=document.createElement('div');row.className='collaboration-saved-row';
    const removeButton=document.createElement('button');removeButton.type='button';removeButton.className='danger-button';removeButton.textContent='×';removeButton.setAttribute('aria-label','Delete local copy of '+collaboration.title);
    removeButton.onclick=()=>window.collaborativeJourneys?.requestRemove(collaboration.id,openReadingCollaborations);
    row.append(button,removeButton);list.append(row);
  }
  if(!collaborationPicker.open)collaborationPicker.showModal();
}
function openReadingJourney(name){
  const journey=readingJourney(name);if(!journey.progress)return;
  readingJourneyName=name;
  const end=journey.end;
  readingChapters=[];
  for(const index of journey.indices){
    const name=scriptureReferences[index].split(':')[0];
    let chapter=readingChapters.at(-1);
    if(!chapter||chapter.name!==name){chapter={name,start:index,end:index,indices:[]};readingChapters.push(chapter)}
    chapter.end=index+1;chapter.indices.push(index);
  }
  const content=$('#readingContent');
  content.innerHTML='<button class="option" type="button" data-reading-choices>← reading choices</button><h1>Read the scriptures you typed</h1><p id="readingSummary"></p>';
  $('#readingSummary').textContent=`${journey.collaborative?'Collaboration · ':''}${journey.name} · ${journey.progress.toLocaleString()} completed verses`;
  if(!readingChapters.length)content.insertAdjacentHTML('beforeend','<p>Complete your first verse in this journey to start reading here.</p>');
  else{
    content.insertAdjacentHTML('beforeend','<div class="reading-controls"><button type="button" data-reader-step="-1" aria-label="Previous chapter" aria-keyshortcuts="p">← previous</button><button type="button" id="readingChapterChoice" aria-label="Choose a completed chapter" aria-haspopup="dialog" aria-controls="readingChapterDialog">chapter ▦</button><button type="button" data-reader-step="1" aria-label="Next chapter" aria-keyshortcuts="n">next →</button></div><p class="reading-shortcuts">N / P: next / previous chapter · Shift+N / Shift+P: next / previous book</p><div id="readingVerses" class="reading-verses" tabindex="0" role="region" aria-label="Completed verses"></div>');
    $('#readingChapterChoice').onclick=openReadingChapterPicker;
    showReadingChapter(0);
  }
  content.insertAdjacentHTML('beforeend','<button type="button" class="option" data-reading-back>← back to typing</button>');
  $('#readingContent').focus({preventScroll:true});
  window.scrollTo(0,0);
}
const chapterPicker=document.createElement('dialog');
chapterPicker.id='readingChapterDialog';
chapterPicker.setAttribute('aria-labelledby','readingChapterTitle');
chapterPicker.innerHTML='<button type="button" class="close" aria-label="Close chapter picker">×</button><h2 id="readingChapterTitle">Choose a completed chapter</h2><table><thead><tr><th scope="col">Book</th><th scope="col">Chapters</th></tr></thead><tbody></tbody></table>';
document.body.append(chapterPicker);
chapterPicker.querySelector('.close').onclick=()=>chapterPicker.close();
chapterPicker.addEventListener('close',()=>$('#readingChapterChoice')?.focus());
function openReadingChapterPicker(){
  const body=chapterPicker.querySelector('tbody');body.replaceChildren();
  let bookName=null,cell;
  readingChapters.forEach((chapter,index)=>{
    const book=journeyBooks.find(book=>chapter.start>=book.start&&chapter.start<book.end);
    if(bookName!==book.name){
      bookName=book.name;const row=document.createElement('tr'),heading=document.createElement('th');
      heading.scope='row';heading.textContent=bookName;cell=document.createElement('td');row.append(heading,cell);body.append(row);
    }
    const button=document.createElement('button');button.type='button';button.textContent=chapter.name.slice(bookName.length).trim();
    button.setAttribute('aria-label',chapter.name+' · '+chapter.indices.length+' completed verses');
    button.setAttribute('aria-pressed',String(index===readingChapter));
    button.onclick=()=>{chapterPicker.close();showReadingChapter(index);};cell.append(button);
  });
  chapterPicker.showModal();chapterPicker.querySelector('[aria-pressed="true"]')?.focus();
}
function showReadingChapter(index){
  readingChapter=Math.max(0,Math.min(readingChapters.length-1,index));
  const chapter=readingChapters[readingChapter];if(!chapter)return;
  $('#readingChapterChoice').textContent=chapter.name+' ▦';
  $('[data-reader-step="-1"]').disabled=readingChapter===0;
  $('[data-reader-step="1"]').disabled=readingChapter===readingChapters.length-1;
  const verses=$('#readingVerses');
  verses.innerHTML=chapter.indices.map(index=>'<p><sup>'+escapeHtml(scriptureReferences[index].split(':')[1])+'</sup>'+escapeHtml(scriptureLines[index])+'</p>').join('');
  verses.setAttribute('aria-label',chapter.name+' completed verses');verses.scrollTop=0;
}


document.addEventListener('click',event=>{const button=event.target.closest('[data-reader-step]');if(button)showReadingChapter(readingChapter+Number(button.dataset.readerStep))});
window.readingView = { open() {
  const scroll = window.scrollY, chapter = readingChapter;
  if (readingJourneyName !== null && readingJourney(readingJourneyName).progress) {
    openReadingJourney(readingJourneyName);
    showReadingChapter(chapter);
    window.scrollTo(0, scroll);
  } else if (!$('#readingContent').children.length || readingJourneyName !== null) openJourneyReader();
  else {
    openJourneyReader();
    window.scrollTo(0, scroll);
  }
} };
document.addEventListener('click', event => {
  if (event.target.closest('[data-reading-collaborations]')) openReadingCollaborations();
  if (event.target.closest('[data-reading-choices]')) openJourneyReader();
  if (event.target.closest('[data-reading-back]')) enterBook();
});

function moveReadingBook(step){
  const chapter=readingChapters[readingChapter];if(!chapter)return;
  const currentBook=journeyBooks.find(book=>chapter.start>=book.start&&chapter.start<book.end);
  if(readingJourneyName?.startsWith('collaboration:')){
    const available=journeyBooks.filter(book=>readingChapters.some(chapter=>chapter.start>=book.start&&chapter.start<book.end));
    const next=available[available.findIndex(book=>book.name===currentBook.name)+step];
    if(next)showReadingChapter(readingChapters.findIndex(chapter=>chapter.start>=next.start&&chapter.start<next.end));
    return;
  }
  const available=journeyBooks.filter(book=>readingJourneyName===''?book.start<readingJourney('').progress:readingJourney(book.name).progress>0);
  const next=available[available.findIndex(book=>book.name===currentBook.name)+step];
  if(!next)return;
  if(readingJourneyName===''){
    const index=readingChapters.findIndex(chapter=>chapter.start>=next.start&&chapter.start<next.end);
    if(index>=0)showReadingChapter(index);
  }else openReadingJourney(next.name);
}
document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('reading-mode')||document.querySelector('dialog[open]')||readingJourneyName===null||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const key=event.key.toLowerCase();if(key!=='n'&&key!=='p')return;
  event.preventDefault();const step=key==='n'?1:-1;
  if(event.shiftKey)moveReadingBook(step);else showReadingChapter(readingChapter+step);
});

})();
