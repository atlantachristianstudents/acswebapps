"""Embed data/mappings.json in the standalone app, or check it with --check."""
import argparse
import json
from pathlib import Path
import re

from songbasescraper import atomic_write

DIRECTORY = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check without writing files')
    args = parser.parse_args()
    data = json.loads((DIRECTORY / 'data/mappings.json').read_text(encoding='utf-8'))
    labels = data['XREF_LABELS']
    if not labels or not all(isinstance(label, str) for label in labels):
        raise ValueError('Invalid mapping labels')
    if len(data['XREF']) != 1349 or len(data['ENJOYER_REFS']) != 1349:
        raise ValueError('Expected mappings for English hymns 1–1348 plus an empty zero slot')
    if any(not isinstance(row, str) or (row and len(row.split(',')) != len(labels)) for row in data['XREF']):
        raise ValueError('Invalid cross-reference row')
    page = DIRECTORY / 'index.html'
    original = page.read_text(encoding='utf-8')
    updated = original
    for name in ('XREF_LABELS', 'XREF', 'ENJOYER_REFS'):
        pattern = r'(var ' + name + r' = )(\[.*?\n        \]);'
        match = re.search(pattern, updated, re.DOTALL)
        if not match:
            raise ValueError('Missing embedded table: ' + name)
        existing = json.loads(re.sub(r',\s*]', ']', match[2]))
        if existing == data[name]:
            continue
        if args.check:
            raise ValueError('Embedded table differs: ' + name)
        payload = json.dumps(data[name], ensure_ascii=False, indent=2).replace('<', '\\u003c')
        payload = payload.replace('\n', '\n        ')
        updated = updated[:match.start(2)] + payload + updated[match.end(2):]
    if updated != original:
        worker = DIRECTORY / 'sw.js'
        version, count = re.subn(r'big-text-v(\d+)', lambda m: 'big-text-v' + str(int(m[1]) + 1),
                                 worker.read_text(encoding='utf-8'), count=1)
        if count != 1:
            raise ValueError('Missing service-worker cache version')
        atomic_write(page, updated)
        atomic_write(worker, version)
    print('Mappings match' if updated == original else 'Mappings embedded; cache version bumped')


if __name__ == '__main__':
    main()
