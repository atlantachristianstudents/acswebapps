"""Select source evidence that can travel with public scholarly records."""
import json

from .model import objects, strings, text


def add_evidence(store, record, sources=None):
    source_info = sources if sources is not None else store.release_metadata()
    for group in record["groups"]:
        info = source_info[group["source"]]
        if info.get("fixture") or info.get("portable"):
            continue
        row = store.query("""
            SELECT raw FROM source_records WHERE source=? AND version=? AND record_id=?
        """, (group["source"], group["version"], group["id"])).fetchone()
        if not row:
            continue
        raw = row[0]
        if group["source"] == "oewn":
            group["evidence"] = {"label": "Source lexical entry (Global WordNet LMF)", "text": raw.strip()}
        elif group["source"] == "webster1913":
            group["evidence"] = {"label": "Source transcription excerpt", "text": raw.strip()}
        elif group["source"] == "wiktionary":
            entry = json.loads(raw)
            senses = []
            for sense in objects(entry.get("senses")):
                citations = list(dict.fromkeys(
                    text(example.get("ref")) for example in objects(sense.get("examples"))
                    if example.get("type") == "quotation" and text(example.get("ref"))
                ))
                evidence = {"sourceIds": strings(sense.get("senseid")), "glosses": strings(sense.get("glosses")),
                            "rawGlosses": strings(sense.get("raw_glosses")), "citations": citations}
                if any(evidence.values()):
                    senses.append({field: value for field, value in evidence.items() if value})
            payload = {"word": group["word"], "partOfSpeech": group["pos"], "senses": senses}
            group["evidence"] = {"label": "Selected Wiktextract source fields and citation references",
                                 "text": json.dumps(payload, ensure_ascii=False, indent=2)}
    return record
