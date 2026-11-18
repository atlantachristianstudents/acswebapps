# Data model

- **Release** identifies source, version, byte checksum, and licensing metadata. An active pointer per source selects the release used by the API.
- **Source record** stores the original Wiktextract JSONL record the WordNet XML entry and synset elements, or the original Webster entry excerpt. XML is serialized without insignificant outer formatting. A starter database records an explicitly marked normalized fixture instead of the full original extracts.
- **Lexeme** joins an independent source record to spelling, normalized key, part of speech, and entry-level etymology, pronunciations, forms, and relationships.
- **Sense** holds a unique within-source ID, a source ID where available, its lexeme, ordinal and any resolved parent, definition, labels, domains and examples. WordNet synset and interlingual IDs are separate from lexical sense IDs.
- **Form** maps an observed inflection or alternate spelling to a headword. Independent entries for that spelling are also searchable.
- **Editorial review** references two release-specific source senses and records a status, rationale, reviewer, and recorded date.

WordNet identifiers derive from source-issued lexical IDs. Wiktionary IDs use the page, spelling, etymology and POS, plus a Wiktionary sense ID where present. For records missing source sense IDs, a hash of the gloss path disambiguates senses. Edits to these glosses or shifts in source etymology numbering can change links. A published alias registry for those changes is open work. The import report records duplicate identity cases.

Source relations remain at their supplied scope. WordNet synonym and semantic edges retain their target sense or synset identifiers. Wiktionary relation qualifiers are preserved when available. If an extracted gloss path lacks a resolvable parent, the full path remains available in Scholarly Mode.


Webster headwords use the uppercase index line and matching printed headword line. The importer accepts explicit numbered definitions and `Defn:` blocks, preserves nearby source wording, and skips entries without a recognized sense boundary. These historical records carry the edition label and remain separate from Wiktionary and WordNet records. The source record supports checking uncertain segmentation against the transcription.
