(() => {
let readingChapters=[],readingChapter=0,readingJourneyName=null;
function readingJourney(name){
  const book=journeyBooks.find(book=>book.name===name);
  if(!book)return {name:'Entire Scriptures',start:0,end:scriptureLines.length,progress:bookProgress};
  return {...book,progress:Math.max(bookJourneys[name]?.progress||0,Math.max(0,Math.min(book.end-book.start,bookProgress-book.start)))};
}
function openJourneyReader(){
  readingJourneyName=null;
  const content=$('#readingContent');
  content.innerHTML='<h1 id="readingPickerTitle">Read the scriptures you typed</h1><p>Choose a book or entire Scriptures to read completed verses. Complete at least one verse to unlock a choice.</p><p class="testament-legend"><span class="old-testament">Old Testament</span><span class="new-testament">New Testament</span></p><div class="journey-grid" role="group" aria-labelledby="readingPickerTitle">'+['',...journeyBooks.map(book=>book.name)].map((name,index)=>{
    const journey=readingJourney(name),available=journey.progress>0;
    return '<button type="button" data-reading-journey="'+escapeHtml(name)+'" class="'+(name?(index<=39?'old-testament':'new-testament'):'entire-journey')+'" '+(available?'':'disabled')+'>'+escapeHtml(name||'entire Scriptures')+'<small>'+(available?journey.progress.toLocaleString()+' verses completed':'No completed verses')+'</small></button>';
  }).join('')+'</div>';
  content.querySelector('.journey-grid').onclick=event=>{const button=event.target.closest('[data-reading-journey]');if(button&&!button.disabled)openReadingJourney(button.dataset.readingJourney)};
  $('#readingContent').focus({preventScroll:true});
  window.scrollTo(0,0);
}
function openReadingJourney(name){
  const journey=readingJourney(name);if(!journey.progress)return;
  readingJourneyName=name;
  const end=Math.min(journey.start+journey.progress,journey.end);
  readingChapters=[];
  for(let index=journey.start;index<end;index++){
    const name=scriptureReferences[index].split(':')[0];
    let chapter=readingChapters.at(-1);
    if(!chapter||chapter.name!==name){chapter={name,start:index,end:index};readingChapters.push(chapter)}
    chapter.end=index+1;
  }
  const content=$('#readingContent');
  content.innerHTML='<button class="option" type="button" data-reading-choices>← reading choices</button><h1>Read the scriptures you typed</h1><p id="readingSummary"></p>';
  $('#readingSummary').textContent=`${journey.name} · ${Math.max(0,end-journey.start).toLocaleString()} completed verses`;
  if(!readingChapters.length)content.insertAdjacentHTML('beforeend','<p>Complete your first verse in this journey to start reading here.</p>');
  else{
    content.insertAdjacentHTML('beforeend','<div class="reading-controls"><button type="button" data-reader-step="-1" aria-label="Previous chapter" aria-keyshortcuts="p">← previous</button><label>chapter <select id="readingChapterChoice" aria-label="Choose a completed chapter"></select></label><button type="button" data-reader-step="1" aria-label="Next chapter" aria-keyshortcuts="n">next →</button></div><p class="reading-shortcuts">N / P: next / previous chapter · Shift+N / Shift+P: next / previous book</p><div id="readingVerses" class="reading-verses" tabindex="0" role="region" aria-label="Completed verses"></div>');
    const select=$('#readingChapterChoice');
    readingChapters.forEach((chapter,index)=>{const option=document.createElement('option');option.value=index;option.textContent=chapter.name;select.append(option)});
    select.onchange=()=>showReadingChapter(Number(select.value));
    showReadingChapter(0);
  }
  content.insertAdjacentHTML('beforeend','<button type="button" class="option" data-reading-back>← back to typing</button>');
  $('#readingContent').focus({preventScroll:true});
  window.scrollTo(0,0);
}
function showReadingChapter(index){
  readingChapter=Math.max(0,Math.min(readingChapters.length-1,index));
  const chapter=readingChapters[readingChapter];if(!chapter)return;
  $('#readingChapterChoice').value=readingChapter;
  $('[data-reader-step="-1"]').disabled=readingChapter===0;
  $('[data-reader-step="1"]').disabled=readingChapter===readingChapters.length-1;
  const verses=$('#readingVerses');
  verses.innerHTML=scriptureLines.slice(chapter.start,chapter.end).map((text,offset)=>'<p><sup>'+escapeHtml(scriptureReferences[chapter.start+offset].split(':')[1])+'</sup>'+escapeHtml(text)+'</p>').join('');
  verses.setAttribute('aria-label',chapter.name+' completed verses');verses.scrollTop=0;
}


document.addEventListener('click',event=>{const button=event.target.closest('[data-reader-step]');if(button)showReadingChapter(readingChapter+Number(button.dataset.readerStep))});
window.readingView = { open: openJourneyReader };
document.addEventListener('click', event => {
  if (event.target.closest('[data-reading-choices]')) openJourneyReader();
  if (event.target.closest('[data-reading-back]')) enterBook();
});

function moveReadingBook(step){
  const chapter=readingChapters[readingChapter];if(!chapter)return;
  const currentBook=journeyBooks.find(book=>chapter.start>=book.start&&chapter.start<book.end);
  const available=journeyBooks.filter(book=>readingJourneyName===''?book.start<bookProgress:readingJourney(book.name).progress>0);
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
