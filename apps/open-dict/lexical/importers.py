"""Streaming Wiktextract and Global WordNet LMF readers."""
import gzip
import json
import xml.etree.ElementTree as ET
from urllib.parse import quote

from .model import RELATIONS, identifier, objects, strings, text

POS = {"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}


def open_source(path, mode="rt"):
    options = {"encoding": "utf-8"} if "t" in mode else {}
    if str(path).endswith(".gz"):
        return gzip.open(path, mode, **options)
    return open(path, mode, **options)


def links(record, fields=RELATIONS):
    result = {}
    for field in fields:
        terms = [{"word": text(item.get("word")), **({"qualifier": item["sense"]}
                  if text(item.get("sense")) else {})} for item in objects(record.get(field))
                 if text(item.get("word"))]
        if terms:
            result[field] = terms
    return result


def wiktionary(path, selected, report):
    seen = set()
    with open_source(path) as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except ValueError as error:
                raise ValueError(f"Invalid Wiktextract JSON on line {line_number}") from error
            if not isinstance(entry, dict):
                raise ValueError(f"Expected a record on line {line_number}")
            word = text(entry.get("word"))
            if entry.get("lang_code") != "en" or (selected is not None and word.lower() not in selected):
                continue
            pos = text(entry.get("pos")) or "unknown"
            if not word or len(word) > 240:
                report["invalid_headwords"] += 1
                continue
            origin = text(str(entry.get("etymology_number", "")))
            page = text(entry.get("original_title")) or word
            entry_id = identifier("wiktionary", page, word, origin, pos)
            if entry_id in seen:
                # Preserve independently extracted homographs even when the dump lacks an origin number.
                entry_id = identifier(entry_id, [item.get("glosses") for item in objects(entry.get("senses"))])
                if entry_id in seen:
                    report["duplicate_entry_keys"] += 1
                    continue
                report["unresolved_homographs"] += 1
            seen.add(entry_id)
            senses = []
            parents = {}
            occurrences = set()
            for source_sense in objects(entry.get("senses")):
                glosses = strings(source_sense.get("glosses"))
                if not glosses:
                    report["missing_definitions"] += 1
                    continue
                source_ids = strings(source_sense.get("senseid"))
                identity = source_ids[:1] or glosses
                sense_id = identifier(entry_id, identity)
                if sense_id in occurrences:
                    sense_id = identifier(entry_id, identity, glosses, strings(source_sense.get("tags")),
                                          len(senses))
                    report["duplicate_sense_keys"] += 1
                occurrences.add(sense_id)
                examples = [
                    {"text": item["text"], **({"ref": item["ref"]} if text(item.get("ref")) else {})}
                    for item in objects(source_sense.get("examples"))
                    if item.get("type") == "example" and text(item.get("text"))
                ]
                sense = {
                    "id": sense_id, "sourceIds": source_ids, "definition": glosses[-1],
                    "parent": parents.get(tuple(glosses[:-1])), "glossPath": glosses[:-1],
                    "labels": strings(source_sense.get("tags")) + strings(source_sense.get("raw_tags")),
                    "domains": strings(source_sense.get("topics")), "examples": examples,
                    "relations": links(source_sense)
                }
                parents.setdefault(tuple(glosses), sense_id)
                senses.append(sense)
            if not senses:
                report["entries_without_senses"] += 1
                continue
            forms = [{"word": item["form"], "labels": strings(item.get("tags")) + strings(item.get("raw_tags"))}
                     for item in objects(entry.get("forms"))
                     if text(item.get("form")) not in {"", "-", "—", word}
                     and not ({"table-tags", "inflection-template"} & set(strings(item.get("tags"))))]
            pronunciations = []
            for item in objects(entry.get("sounds")):
                ipa, audio = text(item.get("ipa")), text(item.get("audio"))
                if ipa or audio:
                    pronunciations.append({"ipa": ipa, "audioFile": audio, "labels": strings(item.get("tags")),
                                           "note": text(item.get("note")), "audioUrl": text(item.get("ogg_url"))})
            yield ({
                "id": entry_id, "word": word, "pos": pos, "source": "wiktionary", "origin": origin,
                "sourceUrl": "https://en.wiktionary.org/wiki/" + quote(page.replace(" ", "_"), safe="") + "#English",
                "etymology": text(entry.get("etymology_text")), "pronunciations": pronunciations,
                "forms": forms, "relations": links(entry), "senses": senses
            }, line.rstrip("\n"))


def xml_items(path):
    with open_source(path, "rb") as stream:
        header = stream.peek(2048)[:2048] if hasattr(stream, "peek") else b""
        if b"<!ENTITY" in header:
            raise ValueError("XML entity declarations are unsupported")
        lexicon = None
        for event, element in ET.iterparse(stream, events=("start", "end")):
            tag = element.tag
            if event == "start" and tag == "Lexicon":
                if element.get("id") != "oewn" or element.get("language") != "en":
                    raise ValueError("Expected the English OEWN Lexicon")
                lexicon = element
            elif event == "end" and tag in {"LexicalEntry", "Synset"}:
                if lexicon is None:
                    raise ValueError("Records outside the OEWN Lexicon")
                yield tag, element
                lexicon.remove(element)


def wordnet(path, selected, temp, report):
    """Spool the source once to a disk-backed index so relation resolution stays bounded."""
    temp.executescript("""
        CREATE TABLE wn_entries(id TEXT PRIMARY KEY, word TEXT NOT NULL, pos TEXT, raw TEXT);
        CREATE TABLE wn_senses(id TEXT PRIMARY KEY, entry TEXT NOT NULL, synset TEXT NOT NULL);
        CREATE TABLE wn_synsets(id TEXT PRIMARY KEY, raw TEXT NOT NULL);
        CREATE INDEX wn_senses_synset ON wn_senses(synset);
    """)
    with temp:
        for tag, element in xml_items(path):
            record_id = element.attrib["id"]
            raw = ET.tostring(element, encoding="unicode")
            if tag == "Synset":
                temp.execute("INSERT INTO wn_synsets VALUES (?, ?)", (record_id, raw))
                continue
            lemma = element.find("Lemma")
            if lemma is None or not text(lemma.get("writtenForm")):
                report["invalid_headwords"] += 1
                continue
            temp.execute("INSERT INTO wn_entries VALUES (?, ?, ?, ?)",
                         (record_id, lemma.get("writtenForm"), lemma.get("partOfSpeech"), raw))
            temp.executemany("INSERT INTO wn_senses VALUES (?, ?, ?)", [
                (sense.attrib["id"], record_id, sense.attrib["synset"]) for sense in element.findall("Sense")
            ])
    def members(synset):
        return temp.execute(
            "SELECT e.word,s.id FROM wn_senses s JOIN wn_entries e ON e.id=s.entry WHERE s.synset=? ORDER BY s.id",
            (synset,)
        )
    for entry_id, word, pos, raw in temp.execute("SELECT id,word,pos,raw FROM wn_entries ORDER BY id"):
        if selected is not None and word.lower() not in selected:
            continue
        entry = ET.fromstring(raw)
        senses = []
        for element in entry.findall("Sense"):
            source_id, synset_id = element.attrib["id"], element.attrib["synset"]
            synset_row = temp.execute("SELECT raw FROM wn_synsets WHERE id=?", (synset_id,)).fetchone()
            synset = ET.fromstring(synset_row[0]) if synset_row else None
            if synset is None or not text(synset.findtext("Definition")):
                report["missing_definitions"] += 1
                continue
            synonyms = [{"word": term, "sense": identifier("oewn", target)}
                        for term, target in members(synset_id) if target != source_id and term != word]
            relations = {"synonyms": synonyms} if synonyms else {}
            for relation in element.findall("SenseRelation"):
                target = relation.attrib["target"]
                match = temp.execute("SELECT e.word FROM wn_senses s JOIN wn_entries e ON e.id=s.entry WHERE s.id=?",
                                     (target,)).fetchone()
                if match:
                    relations.setdefault(relation.attrib["relType"], []).append(
                        {"word": match[0], "sense": identifier("oewn", target)})
            for relation in synset.findall("SynsetRelation"):
                target_synset = relation.attrib["target"]
                relations.setdefault(relation.attrib["relType"], []).extend(
                    {"word": term, "sense": identifier("oewn", target), "synset": target_synset}
                    for term, target in members(target_synset))
            senses.append({
                "id": identifier("oewn", source_id), "sourceIds": [source_id],
                "synset": synset_id, "ili": synset.get("ili"), "definition": synset.findtext("Definition"),
                "examples": [{"text": example.text} for example in synset.findall("Example") if example.text],
                "domains": [synset.get("lexfile")] if synset.get("lexfile") else [],
                "relations": relations
            })
        if senses:
            yield ({
                "id": identifier("oewn", entry_id), "word": word, "pos": POS.get(pos, "unknown"),
                "source": "oewn", "sourceId": entry_id, "sourceUrl": "https://en-word.net/view/lemma/" + quote(word, safe=""),
                "forms": [{"word": item.attrib["writtenForm"], "labels": []}
                          for item in entry.findall("Form") if item.get("writtenForm")],
                "senses": senses
            }, raw)
    if selected is None:
        for synset_id, raw in temp.execute("SELECT id,raw FROM wn_synsets"):
            yield None, (synset_id, raw)
