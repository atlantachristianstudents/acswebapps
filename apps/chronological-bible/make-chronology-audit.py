"""Generate a complete provenance index for the checked-in verse order."""

import csv
import json
import re


with open("order.js", encoding="utf-8") as source:
    contents = source.read()
data = json.loads(contents[len("window.ORDER=") : -2])
eras = data["eras"]


def in_range(reference, book, chapter, first, last):
    match = re.fullmatch(r"(.+) (\d+):(\d+)", reference)
    return bool(
        match
        and match[1] == book
        and int(match[2]) == chapter
        and first <= int(match[3]) <= last
    )


def provenance(reference):
    if reference == "Revelation 12:18":
        return (
            "RcV addition",
            "Inserted after 12:17; present in RcV but absent from Reese reference list.",
        )
    if reference in {"Genesis 1:1", "Isaiah 45:18", "Genesis 2:4"}:
        return (
            "Local editorial placement",
            "Assigned to the creation / Satan-rebellion opening section.",
        )
    if in_range(reference, "Ezekiel", 28, 11, 19) or in_range(
        reference, "Isaiah", 14, 12, 17
    ):
        return (
            "Local editorial move",
            "Grouped in the creation-era section as Satan's rebellion; debated interpretation.",
        )
    if in_range(reference, "Revelation", 21, 1, 27) or in_range(
        reference, "Revelation", 22, 1, 5
    ):
        return (
            "Local editorial move",
            "New Jerusalem vision placed after Revelation 22:6-21 as Eternity Future.",
        )
    if reference in {"Genesis 2:18", "Genesis 2:19", "Genesis 2:20"}:
        return (
            "Reese supplied sequence; review flagged",
            "Current order is 2:19, 2:20, 2:18; verse-level rationale was not retained.",
        )
    return (
        "Reese supplied sequence",
        "Per-verse rationale not retained in checked-in source data.",
    )


with open("chronology-audit.csv", "w", newline="", encoding="utf-8") as output:
    writer = csv.writer(output)
    writer.writerow(
        ["position", "reference", "era", "placement_basis", "review_note"]
    )
    for position, (reference, era_index) in enumerate(data["verses"], start=1):
        basis, note = provenance(reference)
        writer.writerow([position, reference, eras[era_index]["title"], basis, note])
