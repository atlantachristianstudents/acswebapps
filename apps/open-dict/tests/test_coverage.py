from pathlib import Path
from tempfile import TemporaryDirectory
import gzip
import json
import unittest
from unittest.mock import patch

from lexical.build import import_source, release, sha256
from lexical.coverage import report_coverage
from lexical.model import key
from lexical.store import ROOT, connect


class CoverageTests(unittest.TestCase):
    def test_replay_checkpoint_and_release_coverage(self):
        data = ROOT / "tests/fixtures/wiktionary-coverage.jsonl"
        records = [json.loads(line) for line in data.read_text(encoding="utf-8").splitlines()]
        glossed = [record for record in records if any(s.get("glosses") or s.get("raw_glosses")
                   for s in record["senses"])]
        recovered = [record["word"] for record in records if any(s.get("raw_glosses") and not s.get("glosses")
                     for s in record["senses"])]
        self.assertTrue(recovered)
        with TemporaryDirectory() as folder:
            root = Path(folder)
            archive = root / "source.jsonl.gz"
            fixture_bytes = data.read_bytes()
            first_record = fixture_bytes.splitlines(keepends=True)[0]
            with gzip.open(archive, "wb") as stream:
                stream.write(fixture_bytes + first_record)
            database = root / "test.sqlite"
            with self.assertRaisesRegex(RuntimeError, "interrupted"):
                with connect(database) as store:
                    store.initialize()
                    with patch("lexical.build.check_import", side_effect=RuntimeError("interrupted after checkpoint")):
                        import_source(store, "wiktionary", archive, "fixture", sha256(archive), None)
            with connect(database) as store:
                self.assertEqual(store.report()["headwords"], 0)
                saved = store.query("SELECT records FROM import_checkpoints").fetchone()[0]
                self.assertEqual(saved, len(records) + 1)
                counts = import_source(store, "wiktionary", archive, "fixture", sha256(archive), None)
            with connect(database) as store:
                self.assertEqual(counts["headwords"], len({key(record["word"]) for record in glossed}))
                self.assertTrue(all(store.lookup(word) for word in recovered))
                self.assertIsNone(store.query("SELECT records FROM import_checkpoints").fetchone())
                self.assertEqual(import_source(store, "wiktionary", archive, "fixture", sha256(archive), None), counts)
                self.assertEqual(store.search("syzygy", 1)[0]["kind"], "exact")
                self.assertEqual(store.browse("sy", "", 1)["results"][0]["key"], "syzygy")
                pack_dir = root / "releases"
                manifest = release(store, pack_dir, "test", {"bank"}, scholarly=True)
                audit = report_coverage(store, pack_dir)
            self.assertEqual(audit["retrievable_headwords"], counts["headwords"])
            source = audit["sources"]["wiktionary"]
            self.assertEqual(source["rejection_reasons"]["duplicate_entry_records"], 1)
            self.assertEqual(source["import"]["source_senses_read"],
                             sum(len(record["senses"]) for record in [*records, records[0]]))
            self.assertEqual(audit["sources"]["wiktionary"]["definition_index_rows"], counts["senses"])
            for name in ("Complete English", "Scholarly Research"):
                edition = manifest["editions"][name]
                self.assertEqual(edition["headwords"], counts["headwords"])
                self.assertEqual(edition["senses"], counts["senses"])
                self.assertEqual(edition["lexemes"], counts["lexemes"])
                self.assertTrue(all(chunk["firstKey"] and chunk["lastKey"] for chunk in edition["files"]))
            self.assertEqual(manifest["editions"]["Essential English"]["headwords"], 1)
            self.assertTrue(manifest["online"]["aliases"])
            self.assertEqual(manifest["coverage"], "partial")


if __name__ == "__main__":
    unittest.main()
