# Chronology: source, method, and review notes

## What determines the sequence

`order.js` is the complete sequence consumed by the reader. Each entry is a
reference plus an era number; the verse text comes separately from the shared
RcV download. The base sequence was imported from
`reese-chronological-verse-order.json`, and era names were taken from the local
Reese EPUB. The source JSON and EPUB used for that import are not checked into
this repository, so the exact edition, source-file identifier for each verse,
and Reese's per-placement explanations cannot currently be independently
reconstructed here.

The checked-in `chronology-audit.csv` makes the resulting order inspectable at
verse level: it lists every position, reference, era, and the basis for its
placement. For most entries, the basis is the Reese sequence. This is source
provenance, not a claim that a separate historical argument was recorded for
each verse. The underlying imported JSON contained references and source-file
identifiers, but the build step discarded those identifiers and did not retain
verse-level rationales.

## Local adjustments and review flags

| References | Current treatment | Reason / review status |
| --- | --- | --- |
| Genesis 1:1, Isaiah 45:18, Genesis 2:4 | Start the creation section, following the opening eternity material. | Local editorial arrangement; document the intended relationship between these verses before changing it. |
| Ezekiel 28:11–19; Isaiah 14:12–17 | Moved to the creation-era section and grouped as Satan's rebellion. | The source texts address the king of Tyre and king of Babylon in their immediate contexts. Reading them as an account of Satan's pre-creation fall is an interpretive tradition, not a date stated explicitly in those passages. Review as a theological overlay rather than a securely dated event. |
| Revelation 21:1–22:5 | Moved to a final “Eternity Future” section, after Revelation 22:6–21. | This classifies the New Jerusalem vision as future while leaving the book's closing epilogue with John's writings. Revelation 22:6–21 is commonly outlined as the epilogue; its position in the book is not itself an event date. Consider displaying it as an epilogue outside the event timeline. |
| Revelation 12:18 | Added after Revelation 12:17. | The Reese source list had 31,102 references; RcV has one additional verse, Revelation 12:18. It was inserted adjacent to 12:17 to preserve the source sequence. |
| Genesis 2:18–20 | Current order is 2:19, 2:20, 2:18, then 2:21. | Review flag: Genesis 2:18 introduces the need for a helper before 2:19–20 describes the animals being formed and brought to Adam. This may reflect Reese's chosen narrative reconstruction; the source explanation is not retained, so treat it as an open question rather than silently reorder it. |
| Job and other undated poetic / prophetic material | Retain Reese's relative placement. | Some books and passages lack a single agreed historical date. A placement should carry an uncertainty note where evidence does not establish a precise point in the timeline. |

## How to review a proposed change

For each proposed move, record the exact references, current sequence positions,
proposed positions, supporting textual or historical evidence, and confidence
(high, medium, or low). Distinguish an explicit date or event sequence in the
text from an inference based on authorship, setting, parallel accounts, or
theological interpretation. Do not treat the sequence's completeness check as
proof of chronology: it verifies reference coverage, not historical accuracy.

To regenerate the verse-level index after changing `order.js`, run:

```sh
python3 make-chronology-audit.py
```

The CSV is an index of the whole order and its available provenance. It does
not substitute for restoring the original source files or obtaining a
verse-level rationale from the source edition.
