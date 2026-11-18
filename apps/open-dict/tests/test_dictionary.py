from collections import Counter
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.error import HTTPError
from urllib.request import urlopen
import gzip
import json
import os
import re
import unittest
from xml.etree import ElementTree

from api.server import DictionaryServer
from lexical.alignment import propose
from lexical.build import import_source, portable, release, seed, sha256
from lexical.importers import wiktionary
from lexical.model import SCHEMA, key
from lexical.store import ROOT, connect, distance, sources

DIFFICULT = ("run", "set", "bank", "light", "cleave", "sanction", "literally", "affect", "effect",
             "lie", "lead", "spring", "charge", "fine", "bear", "sound", "present")


class DictionaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = TemporaryDirectory()
        cls.addClassCleanup(cls.directory.cleanup)
        cls.work = Path(cls.directory.name)
        cls.database = os.environ.get("OPEN_DICT_TEST_POSTGRES") or cls.work / "fixture.sqlite"
        with connect(cls.database) as store:
            store.initialize()
            seed(store)

    def test_normalization(self):
        self.assertEqual(key("  ＢＡＮＫ "), "bank")
        self.assertEqual(key("  rock ’n’ roll  "), "rock 'n' roll")
        self.assertEqual(key("twenty‑one"), "twenty-one")
        self.assertEqual(distance("bnak", "bank"), 1)

    def test_difficult_entries_have_source_bound_senses(self):
        with connect(self.database) as store:
            for word in DIFFICULT:
                with self.subTest(word=word):
                    record = store.lookup(word.upper())
                    senses = [sense for group in record["groups"] for sense in group["senses"]]
                    self.assertGreater(len(senses), 1)
                    self.assertEqual(len(senses), len({sense["id"] for sense in senses}))
                    self.assertTrue(all(sense["definition"] for sense in senses))
                    self.assertIsNotNone(store.sense(senses[-1]["id"]))

    def test_homographs_and_source_evidence(self):
        with connect(self.database) as store:
            bank = store.lookup("bank")
            wiktionary_entries = [group for group in bank["groups"] if group["source"] == "wiktionary"]
            self.assertGreaterEqual(len({group["origin"] for group in wiktionary_entries}), 2)
            self.assertTrue(any("financial" in sense["definition"] for group in wiktionary_entries
                                for sense in group["senses"]))
            wordnet_entries = [group for group in bank["groups"] if group["source"] == "oewn"]
            self.assertTrue(any("body of water" in sense["definition"] for group in wordnet_entries
                                for sense in group["senses"]))
            self.assertTrue(any(sense.get("synset") for group in wordnet_entries for sense in group["senses"]))
            cleave = store.lookup("cleave")
            self.assertGreaterEqual(len({group["origin"] for group in cleave["groups"]
                                        if group["source"] == "wiktionary"}), 2)
            self.assertTrue(any(group.get("etymology") for group in cleave["groups"]))
            self.assertTrue(any(item["ipa"] for group in cleave["groups"]
                                for item in group.get("pronunciations", [])))

    def test_search_ranking_and_filters(self):
        with connect(self.database) as store:
            self.assertEqual(store.search("BANK", 4)[0]["kind"], "exact")
            running = store.search("running", 8)
            self.assertEqual(running[0]["key"], "running")
            self.assertIn({"word": "run", "key": "run", "kind": "form"}, running)
            self.assertIn({"word": "color", "key": "color", "kind": "variant"}, store.search("colour", 8))
            self.assertEqual(store.search("bnak", 4)[0]["key"], "bank")
            self.assertEqual(store.search("ban", 4, suggest=True)[0]["kind"], "prefix")
            self.assertEqual(store.search("bank", 4, {"pos": "interjection"}), [])
            self.assertIn("bank", {row["key"] for row in store.search("", 10, {"definition": "financial institution"})})
            self.assertTrue(store.search("", 4, {"label": "archaic", "pos": "noun"}))
            self.assertTrue(store.search("", 4, {"domain": "music", "source": "wiktionary"}))

    def test_fixture_reseed_is_idempotent(self):
        with connect(self.database) as store:
            first = store.report()
            self.assertEqual(seed(store), first)
            self.assertGreater(first["senses"], first["lexemes"])
            self.assertGreater(first["lexemes"], first["headwords"])
            self.assertEqual(first["headwords"], len(list(store.entries())))

    def test_source_licenses(self):
        registry = sources()
        self.assertEqual(registry["wiktionary"]["license"], "CC BY-SA 4.0")
        self.assertIn("Princeton University", registry["oewn"]["noticeText"][-1])
        for source in registry.values():
            self.assertRegex(source["sha256"], r"^[a-f0-9]{64}$")
            self.assertTrue(source["attribution"])

    def test_invalid_import_leaves_previous_release_active(self):
        malformed = self.work / "malformed.jsonl.gz"
        with gzip.open(malformed, "wt", encoding="utf-8") as file:
            file.write('{"lang_code": "en", "word": }\n')
        with self.assertRaisesRegex(ValueError, "line 1"):
            list(wiktionary(malformed, None, Counter()))
        with connect(self.database) as store:
            before_sources = store.release_metadata()
        with self.assertRaisesRegex(ValueError, "line 1"):
            with connect(self.database) as store:
                import_source(store, "wiktionary", malformed, "invalid-test", None, None)
        with connect(self.database) as store:
            self.assertEqual(store.release_metadata(), before_sources)
            self.assertIsNone(store.query("SELECT 1 FROM releases WHERE version=?", ("invalid-test",)).fetchone())

    def test_pack_metadata_matches_bytes(self):
        directory = self.work / "release"
        with connect(self.database) as store:
            report = store.report()
            manifest = release(store, directory, "test-v1", {"bank", "run"})
        self.assertEqual(manifest["schema"], SCHEMA)
        self.assertEqual(manifest["editions"]["Complete English"]["headwords"], report["headwords"])
        self.assertEqual(manifest["editions"]["Essential English"]["headwords"], 2)
        for edition in manifest["editions"].values():
            self.assertEqual(edition["bytes"], sum(chunk["bytes"] for chunk in edition["files"]))
            for chunk in edition["files"]:
                artifact = directory / chunk["path"]
                self.assertEqual(chunk["bytes"], artifact.stat().st_size)
                self.assertEqual(chunk["sha256"], sha256(artifact))
                data = gzip.decompress(artifact.read_bytes())
                self.assertEqual(chunk["decodedBytes"], len(data))
                self.assertEqual(chunk["entries"], len(data.splitlines()))
                self.assertTrue(json.loads(data.splitlines()[0])["groups"])

    def test_portable_database_keeps_source_evidence(self):
        directory = self.work / "portable"
        with connect(self.database) as store:
            original = store.lookup("bank")
            manifest = portable(store, directory, "portable-v1")
        archive = directory / manifest["path"]
        self.assertEqual(sha256(archive), manifest["sha256"])
        content = gzip.decompress(archive.read_bytes())
        self.assertEqual(len(content), manifest["installedBytes"])
        database = directory / "dictionary.sqlite"
        database.write_bytes(content)
        with connect(database) as store:
            self.assertEqual(original, store.lookup("bank"))
            self.assertTrue(store.release_metadata()["oewn"]["portable"])

    def test_webster_import_and_scholarly_record(self):
        database = self.work / "webster.sqlite"
        path = ROOT / "tests/fixtures/webster-cleave.txt"
        with connect(database) as store:
            store.initialize()
            counts = import_source(store, "webster1913", path, "test selection", sha256(path), {"cleave"})
            self.assertEqual(counts["headwords"], 1)
            self.assertGreater(counts["senses"], 1)
            entry = store.lookup("cleave")["groups"][0]
            self.assertTrue(entry["historical"])
            self.assertEqual(entry["pos"], "verb")
            self.assertIn("adhere closely", entry["senses"][0]["definition"])
            manifest = release(store, self.work / "history-pack", "history-test", None, scholarly=True)
        edition = manifest["editions"]["Scholarly Research"]
        raw = gzip.decompress((self.work / "history-pack" / edition["files"][0]["path"]).read_bytes())
        record = json.loads(raw.splitlines()[0])
        self.assertTrue(record["groups"][0]["evidence"]["text"].startswith("CLEAVE\n"))

    def test_candidate_preserves_both_source_senses(self):
        with connect(self.database) as store:
            before = store.lookup("sense")
            initial = store.query("SELECT count(*) FROM editorial_reviews").fetchone()[0]
            proposed = propose(store, "sense")
            self.assertIn(proposed, (0, 1))
            self.assertEqual(propose(store, "sense"), 0)
            self.assertEqual(store.query("SELECT count(*) FROM editorial_reviews").fetchone()[0], initial + proposed)
            status, left, right = store.query("""SELECT status,left_sense,right_sense FROM editorial_reviews
                WHERE left_source='wiktionary' AND right_source='oewn'""").fetchone()
            self.assertEqual(status, "candidate")
            self.assertNotEqual(left, right)
            self.assertEqual(store.sense(left)["definition"].lower().rstrip("."),
                             store.sense(right)["definition"].lower().rstrip("."))
            self.assertEqual(store.lookup("sense"), before)

    def test_api_and_prerender_at_route_prefix(self):
        with DictionaryServer(("127.0.0.1", 0), self.database, "/dictionary/",
                              "https://example.org/dictionary/") as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = f"http://127.0.0.1:{server.server_address[1]}/dictionary/"

                def read(path):
                    with urlopen(base + path, timeout=10) as response:
                        return response.read().decode()

                self.assertTrue(json.loads(read("api/v1/health"))["hasData"])
                self.assertTrue(json.loads(read("api/v1/suggest?q=ban")))
                result = json.loads(read("api/v1/lookup/bank"))
                sense = result["groups"][0]["senses"][0]
                self.assertEqual(json.loads(read("api/v1/senses/" + sense["id"]))["definition"], sense["definition"])
                self.assertEqual(json.loads(read("api/v1/senses/" + sense["id"] + "/relations")), sense.get("relations", {}))
                self.assertIn("wiktionary", json.loads(read("api/v1/sources")))
                self.assertEqual(json.loads(read("api/v1/releases"))["schema"], SCHEMA)
                self.assertIn('<link rel="canonical" href="https://example.org/dictionary/?word=bank">', read("?word=Bank"))
                self.assertIn("financial", read("?word=Bank"))
                self.assertTrue(ElementTree.fromstring(read("sitemap.xml?page=1")).tag.endswith("urlset"))
                for route, status in (("api/v1/lookup/nonexistent-lexical-entry", 404),
                                      ("api/v1/search?limit=999", 400), ("api/v1/senses/abc", 400),
                                      ("api/v1/search?q=bank&q=run", 400), (".env", 404), ("?word=%3Cscript%3E", 404)):
                    with self.subTest(route=route), self.assertRaises(HTTPError) as error:
                        read(route)
                    self.assertEqual(error.exception.code, status)
                    error.exception.close()
                self.assertTrue(re.fullmatch(r"[a-f0-9]{28}", sense["id"]))
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    unittest.main()
