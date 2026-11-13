import re,json,zipfile,xml.etree.ElementTree as E,collections
from pathlib import Path
base=Path('/Users/zionpark/Downloads'); out=base/'chronological-bible'
s=(base/'verse-lookup-embedded.html').read_text(); d=json.loads(re.search(r'<script type="application/json" id="embedded">(.*?)</script>',s,re.S)[1]); text=next(v['text'] for v in d['versions'] if v['name']=='RcV.txt')
short=['Gen.','Exo.','Lev.','Num.','Deut.','Josh.','Judg.','Ruth','1 Sam.','2 Sam.','1 Kings','2 Kings','1 Chron.','2 Chron.','Ezra','Neh.','Esth.','Job','Psa.','Prov.','Eccl.','S.S.','Isa.','Jer.','Lam.','Ezek.','Dan.','Hosea','Joel','Amos','Oba.','Jonah','Micah','Nahum','Hab.','Zeph.','Hag.','Zech.','Mal.','Matt.','Mark','Luke','John','Acts','Rom.','1 Cor.','2 Cor.','Gal.','Eph.','Phil.','Col.','1 Thes.','2 Thes.','1 Tim.','2 Tim.','Titus','Philem.','Heb.','James','1 Pet.','2 Pet.','1 John','2 John','3 John','Jude','Rev.']
long='Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|')
lookup={}; names=dict(zip(short,long))
for l in text.splitlines():
 m=re.match(r'(.+?) (\d+):(\d+)\s+(.*)',l)
 if m: lookup[f'{names[m[1]]} {int(m[2])}:{int(m[3])}']=m[4]
order=json.loads((base/'reese-chronological-verse-order.json').read_text());missing=[r['reference'] for r in order if r['reference'] not in lookup];assert not missing,missing
rows=[];eras=[]
with zipfile.ZipFile(next(base.glob('*.epub'))) as z:
 for r in order:
  source=r['source_file']
  if not eras or last_source!=source:
   root=E.fromstring(z.read(source)); h=next((x for x in root.iter() if x.attrib.get('class')=='chaptitle'),None)
   if h is not None: eras.append({'title':re.sub(r'^[IVX]+\. ', '', ''.join(h.itertext())).rstrip('1'),'start':len(rows),'source':source})
   last_source=source
  rows.append([r['reference'],lookup[r['reference']],len(eras)-1])
at=next(i for i,r in enumerate(rows) if r[0]=='Revelation 12:17')+1
rows.insert(at,['Revelation 12:18',lookup['Revelation 12:18'],rows[at-1][2]])
for e in eras:e.pop('source')
# Local chronological adjustment: Satan Cast Out of Heaven, before Genesis 1:2.
refs = [f'Ezekiel 28:{n}' for n in range(11, 20)] + [f'Isaiah 14:{n}' for n in range(12, 18)]
moved = [next(r for r in rows if r[0] == ref) for ref in refs]
rows = [r for r in rows if r[0] not in refs]
at = next(i for i, r in enumerate(rows) if r[0] == 'Genesis 1:2')
for r in moved: r[2] = 0
rows[at:at] = moved
for i, era in enumerate(eras):
 era['start'] = next(j for j, r in enumerate(rows) if r[2] == i)
extra=set(lookup)-{r['reference'] for r in order}
print('Matched',len(rows),'verses;',len(eras),'eras; extra RcV:',extra)
(out/'dist/data.js').write_text('window.BIBLE='+json.dumps({'verses':rows,'eras':eras,'books':long},ensure_ascii=False,separators=(',',':'))+';')
(out/'validation.json').write_text(json.dumps({'matched':len(rows),'missing':missing,'extra':list(extra)},indent=2))
