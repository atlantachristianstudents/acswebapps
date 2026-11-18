"""Record high-precision review candidates without merging source senses."""
import argparse
from collections import defaultdict
from datetime import datetime, timezone

from .model import HISTORICAL, identifier, key
from .store import connect


def propose(store, word):
    record = store.lookup(word)
    if record is None:
        return 0
    buckets = defaultdict(lambda: defaultdict(list))
    for group in record["groups"]:
        for sense in group["senses"]:
            historical = tuple(sorted(HISTORICAL.intersection(sense.get("labels", []))))
            gloss = key(sense["definition"]).rstrip(".")
            if len(gloss.split()) >= 3 and group["pos"] != "unknown":
                buckets[(group["pos"], gloss, historical)][group["source"]].append((group["version"], sense["id"]))
    count = 0
    for by_source in buckets.values():
        wiktionary = by_source.get("wiktionary", [])
        wordnet = by_source.get("oewn", [])
        if len(wiktionary) != 1 or len(wordnet) != 1:
            continue
        left_version, left_sense = wiktionary[0]
        right_version, right_sense = wordnet[0]
        pair = ("wiktionary", left_version, left_sense, "oewn", right_version, right_sense)
        row = (identifier(*pair), *pair, "candidate",
               "Unique normalized gloss and part-of-speech match with compatible historical labels. Needs editorial review.",
               None, datetime.now(timezone.utc).isoformat())
        count += store.query("""INSERT INTO editorial_reviews VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT DO NOTHING""", row).rowcount
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True)
    parser.add_argument("words", nargs="+")
    args = parser.parse_args()
    with connect(args.db) as store:
        count = sum(propose(store, word) for word in dict.fromkeys(args.words))
    print(f"Recorded {count} new editorial review candidates.")


if __name__ == "__main__":
    main()
