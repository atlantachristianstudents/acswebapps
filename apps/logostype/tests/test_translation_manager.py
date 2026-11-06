import json
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from translation_manager import parse_lines, parse_delimited, parse_json, cmd_common, cmd_import, normalize_verse

class TranslationManagerTests(unittest.TestCase):
    def test_asv_lines(self):
        t='American Standard Version (1901)\nGenesis 1:1 In the beginning God created the heavens and the earth.\n1 Kings 1:1 Now king David was old.\nSong of Solomon 1:1 The song of songs.\nRevelation 22:21 The grace of the Lord Jesus be with the saints. Amen.\n'
        d=parse_lines(t)
        self.assertEqual(len(d),4)
        self.assertIn('GEN.1.1',d)
        self.assertIn('1KI.1.1',d)
        self.assertIn('SNG.1.1',d)
        self.assertIn('REV.22.21',d)
    def test_import_types(self):
        self.assertEqual(normalize_verse('1 John 1:1'),'1JN.1.1')
        self.assertEqual(parse_delimited('verse\ttext\nGenesis 1:1\tIn the beginning\n','\t'),{'GEN.1.1':'In the beginning'})
        self.assertEqual(parse_json('[{"verse":"GEN.1.1","text":"Words"}]'),{'GEN.1.1':'Words'})
    def test_import_and_common(self):
        with tempfile.TemporaryDirectory() as work:
            base=Path(work)
            (base/'translations'/'common').mkdir(parents=True)
            for name in ('RCV','KJV','NIV'):
                (base/'translations'/'common'/f'{name}.tsv').write_text('verse\ttext\nGEN.1.1\tOne.\nJHN.3.16\tTwo.\n')
            english=base/'ASV.txt'
            english.write_text('Genesis 1:1 One.\nJohn 3:16 Two.\nRevelation 22:21 Three.\n')
            out=base/'translations'/'full'/'ASV.tsv'
            cmd_import(SimpleNamespace(name='ASV',input=str(english),format='auto',min_verses=1,out=str(out),edition='1901'))
            self.assertTrue(out.is_file())
            self.assertEqual(json.loads(out.with_suffix('.metadata.json').read_text())['edition'],'1901')
            final=cmd_common(SimpleNamespace(versions=['RCV','KJV','NIV','ASV'],base=str(base),outdir=None))
            self.assertTrue((final/'COVERAGE.md').is_file())
            self.assertEqual(len((final/'ASV.tsv').read_text().splitlines()),3)

if __name__=='__main__': unittest.main()
