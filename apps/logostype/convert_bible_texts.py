#!/usr/bin/env python3
"""Convert verse-per-line RCV/KJV/NIV text files to the Bible evaluation TSV format.

Accepts user-supplied text; does not download or redistribute any translations.
Requires only the Python standard library.
"""
from __future__ import annotations
import argparse
from collections import Counter
import csv
from pathlib import Path
import re

BOOKS = [
    ('GEN','Gen.','Genesis'), ('EXO','Exo.','Exodus'), ('LEV','Lev.','Leviticus'),
    ('NUM','Num.','Numbers'), ('DEU','Deut.','Deu.','Deuteronomy'),
    ('JOS','Josh.','Joshua'), ('JDG','Judg.','Judges'), ('RUT','Ruth'),
    ('1SA','1 Sam.','1 Samuel'), ('2SA','2 Sam.','2 Samuel'),
    ('1KI','1 Kings'), ('2KI','2 Kings'),
    ('1CH','1 Chron.','1 Chronicles'), ('2CH','2 Chron.','2 Chronicles'),
    ('EZR','Ezra'), ('NEH','Neh.','Nehemiah'), ('EST','Esth.','Esther'),
    ('JOB','Job'), ('PSA','Psa.','Psalms'), ('PRO','Prov.','Proverbs'),
    ('ECC','Eccl.','Ecclesiastes'), ('SNG','S.S.','Song of Solomon'),
    ('ISA','Isa.','Isaiah'), ('JER','Jer.','Jeremiah'), ('LAM','Lam.','Lamentations'),
    ('EZK','Ezek.','Ezekiel'), ('DAN','Dan.','Daniel'),
    ('HOS','Hosea','Hos.'), ('JOL','Joel'), ('AMO','Amos'),
    ('OBA','Oba.','Obadiah'), ('JON','Jonah'), ('MIC','Micah'),
    ('NAM','Nahum','Nah.'), ('HAB','Hab.','Habakkuk'), ('ZEP','Zeph.','Zephaniah'),
    ('HAG','Hag.','Haggai'), ('ZEC','Zech.','Zechariah'), ('MAL','Mal.','Malachi'),
    ('MAT','Matt.','Matthew'), ('MRK','Mark'), ('LUK','Luke'), ('JHN','John'),
    ('ACT','Acts'), ('ROM','Rom.','Romans'),
    ('1CO','1 Cor.','1 Corinthians'), ('2CO','2 Cor.','2 Corinthians'),
    ('GAL','Gal.','Galatians'), ('EPH','Eph.','Ephesians'),
    ('PHP','Phil.','Philippians'), ('COL','Col.','Colossians'),
    ('1TH','1 Thes.','1 Thessalonians'), ('2TH','2 Thes.','2 Thessalonians'),
    ('1TI','1 Tim.','1 Timothy'), ('2TI','2 Tim.','2 Timothy'),
    ('TIT','Titus'), ('PHM','Philem.','Philemon'), ('HEB','Heb.','Hebrews'),
    ('JAS','James'), ('1PE','1 Pet.','1 Peter'), ('2PE','2 Pet.','2 Peter'),
    ('1JN','1 John'), ('2JN','2 John'), ('3JN','3 John'), ('JUD','Jude'),
    ('REV','Rev.','Revelation'),
]
ALIASES = {alias: row[0] for row in BOOKS for alias in row[1:]}
ORDER = {row[0]: i for i, row in enumerate(BOOKS)}
LINE = re.compile(r'^(.*?)\s+(\d+):(\d+)(?:\s+(.*))?$')


def verse_sort(verse):
    book, chapter, number = verse.split('.')
    return (ORDER[book], int(chapter), int(number))


def parse_bible(path):
    verses = {}
    empty = []
    encountered = set()
    with Path(path).open('r', encoding='utf-8-sig', newline='') as f:
        for number, raw in enumerate(f, 1):
            line = raw.strip()
            if not line:
                continue
            m = LINE.fullmatch(line)
            if not m:
                raise ValueError(f'{path}:{number}: verse line not recognized: {line[:100]!r}')
            book, chapter, verse, text = m.groups()
            if book not in ALIASES:
                raise ValueError(f'{path}:{number}: unknown book name: {book!r}')
            bid = ALIASES[book]
            encountered.add(bid)
            reference = f'{bid}.{int(chapter)}.{int(verse)}'
            if not text or not text.strip():
                empty.append((number, reference))
                continue
            if reference in verses:
                raise ValueError(f'{path}:{number}: repeated verse with text: {reference}')
            verses[reference] = text.strip()
    if len(encountered) != 66:
        raise ValueError(f'{path}: expected 66 books; got {len(encountered)}: {sorted(encountered)}')
    return verses, empty


def write_tsv(path, verses, selected=None):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    ids = sorted(selected if selected is not None else verses.keys(), key=verse_sort)
    with path.open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, delimiter='\t', lineterminator='\n')
        w.writerow(['verse','text'])
        for id in ids:
            w.writerow([id, verses[id]])
    return len(ids)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--rcv', type=Path, default=Path('rcv.txt'))
    ap.add_argument('--kjv', type=Path, default=Path('KJV.txt'))
    ap.add_argument('--niv', type=Path, default=Path('NIV.txt'))
    ap.add_argument('--outdir', type=Path, default=Path('translations'))
    args=ap.parse_args()
    sources={'RCV': args.rcv,'KJV':args.kjv,'NIV':args.niv}
    data={}
    empty_report={}
    for name,path in sources.items():
        d, empty = parse_bible(path)
        data[name]=d
        empty_report[name]=empty
        n=write_tsv(args.outdir/f'{name}.tsv',d)
        print(f'{name}: {n:,} verses -> {args.outdir/name}.tsv')
    matched=set.intersection(*(set(d) for d in data.values()))
    for name,d in data.items():
        n=write_tsv(args.outdir/'common'/f'{name}.tsv',d,matched)
        print(f'{name}: {n:,} matched verses -> {args.outdir}/common/{name}.tsv')
    lines=[
        '# Conversion audit', '',
        'All references use canonical 3-character book IDs, e.g. `GEN.1.1`, `JHN.1.1`.',
        'Text is kept in its original language and punctuation; verse prefixes were removed.', '',
        '| Translation | Complete verses | Common verses | Verses absent from this edition vs union |',
        '|---|---:|---:|---:|',
    ]
    union=set.union(*(set(d) for d in data.values()))
    for name,d in data.items():
        lines.append(f'| {name} | {len(d):,} | {len(matched):,} | {len(union-set(d))} |')
    lines+=['','Common verses are provided as `common/*.tsv` to evaluate the same verse IDs across all translations.','',
            '## Source-specific exceptions','']
    for name,d in data.items():
        absent=sorted(union-set(d),key=verse_sort)
        extras=sorted(set(d)-matched,key=verse_sort)
        lines.append(f'### {name}')
        lines.append(f'- Unique input verse IDs missing from other versions (i.e. excluded by the common set): {len(extras)}')
        if extras:
            lines.append('- Excluded from matched set: '+', '.join('`'+x+'`' for x in extras))
        if absent:
            lines.append('- Not present in this supplied file: '+', '.join('`'+x+'`' for x in absent))
        if empty_report[name]:
            lines.append('- Ignored source lines with no verse text: '+', '.join(f'line {i} (`{v}`)' for i,v in empty_report[name]))
        lines.append('')
    lines += ['## Notes', '',
              '- Missing IDs reflect differences between the **supplied files**, not necessarily textual errors.',
              '- Some Bible editions merge, omit, or renumber verses based on textual traditions.',
              '- This conversion does not independently verify each text against an authorized print edition.',
              '- Results are for authorized research with the supplied translation texts.']
    (args.outdir/'conversion_audit.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'Common verse set: {len(matched):,} verses')

if __name__=='__main__':
    main()
