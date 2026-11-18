"""Probe exact retrieval and prefix paging over the app's public HTTP interface."""
import argparse
import json
import random
from urllib.parse import quote, urlencode
from urllib.request import urlopen

from lexical.store import connect

RARE = ("sesquipedalian defenestration syzygy anfractuous susurration absquatulate chthonic quincunx "
        "ultracrepidarian floccinaucinihilipilification pneumonoultramicroscopicsilicovolcanoconiosis").split()
POLYSEMOUS = "run set bank light spring charge cleave sanction lead lie fine bear".split()


def audit(database, base, sample_size):
    base = base.rstrip("/") + "/api/v1/"

    def fetch(path):
        with urlopen(base + path, timeout=30) as response:
            return json.load(response)

    if fetch("health").get("coverage") != "full":
        raise ValueError("Expected a full published API")
    randomizer = random.Random(20261118)
    with connect(database, read_only=True) as store:
        cursor = store.connection.cursor(name="open_dict_audit_sample") if store.postgres else store.connection.cursor()
        sample = []
        try:
            cursor.execute("""
                SELECT DISTINCT headword FROM lexemes JOIN active_releases USING(source,version) ORDER BY headword
            """)
            for n, (word,) in enumerate(cursor, 1):
                if len(sample) < sample_size:
                    sample.append(word)
                else:
                    index = randomizer.randrange(n)
                    if index < sample_size:
                        sample[index] = word
        finally:
            cursor.close()

        results = {}
        for word in dict.fromkeys([*RARE, *POLYSEMOUS, *sample]):
            local = store.lookup(word)
            if local is None:
                raise ValueError(f"{word!r} is missing from the audited database")
            remote = fetch("lookup/" + quote(word, safe=""))
            ranked = fetch("search?" + urlencode({"q": word, "limit":1}))
            expected = {sense["id"] for group in local["groups"] for sense in group["senses"]}
            actual = {sense["id"] for group in remote["groups"] for sense in group["senses"]}
            if not ranked or ranked[0]["key"] != word or ranked[0]["kind"] != "exact" or expected != actual:
                raise ValueError(f"Lookup/search disagreement for {word!r}")
            if word in RARE or word in POLYSEMOUS:
                results[word] = len(actual)
        first = fetch("browse?prefix=sy&limit=20")
        second = fetch("browse?" + urlencode({"prefix":"sy", "limit":20, "after":first["next"]}))
        expected_first = store.browse("sy", "", 20)
        if first != expected_first or second != store.browse("sy", first["next"], 20):
            raise ValueError("Prefix paging differs from the database")
    return {"exact_probes":len(set(RARE + POLYSEMOUS + sample)), "random_sample":len(sample),
            "requested_sense_counts":results, "prefix_pages_verified":2}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database")
    parser.add_argument("base")
    parser.add_argument("--sample", type=int, default=80)
    args = parser.parse_args()
    print(json.dumps(audit(args.database, args.base, args.sample), ensure_ascii=False, indent=2))
