"""Measure warm, in-process database queries against the requested dataset."""
import argparse
from statistics import median
from time import perf_counter

from lexical.store import connect

LOOKUPS = ["run", "set", "bank", "light", "cleave", "sanction", "literally", "affect", "effect", "lie",
           "lead", "spring", "charge", "fine", "bear", "sound", "present", "colour"]
SEARCHES = ["running", "colour", "bnak", "efemeral", "set", "spr", "hist", "bank", "lex"]


def report(name, times):
    values = sorted(sample * 1000 for sample in times)
    p95 = values[int(0.95 * (len(values) - 1))]
    print(f"{name:<12} n={len(values):>4} median={median(values):8.2f} ms p95={p95:8.2f} ms")


def measure(func, values, repeats=5):
    timings = []
    for value in values * repeats:
        started = perf_counter()
        func(value)
        timings.append(perf_counter() - started)
    return timings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database")
    args = parser.parse_args()
    with connect(args.database) as store:
        print(store.report())
        store.lookup("bank")
        report("lookup", measure(store.lookup, LOOKUPS))
        report("search", measure(lambda query: store.search(query, 12), SEARCHES))
        report("autocomplete", measure(lambda query: store.search(query, 8, suggest=True), SEARCHES))


if __name__ == "__main__":
    main()
