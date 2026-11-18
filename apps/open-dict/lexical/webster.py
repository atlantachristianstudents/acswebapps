"""Conservative parser for the tagged headwords and sense starts in ebook 29765."""
import re

from .importers import open_source
from .model import identifier, key

START = "*** START OF THE PROJECT GUTENBERG EBOOK WEBSTER'S UNABRIDGED DICTIONARY ***"
END = "*** END OF THE PROJECT GUTENBERG EBOOK WEBSTER'S UNABRIDGED DICTIONARY ***"
URL = "https://www.gutenberg.org/ebooks/29765"
HEAD = re.compile(r"[\w][\w .,'’&;/()\-–]{0,119}", flags=re.UNICODE)
STRESS = str.maketrans("", "", "*\x22`")
PARTS = {"n.": "noun", "a.": "adj", "adj.": "adj", "adv.": "adv", "v. t.": "verb",
         "v. i.": "verb", "v.": "verb", "prep.": "prep", "pron.": "pron", "conj.": "conj",
         "interj.": "intj", "p. p.": "verb", "p. pr.": "verb"}
POS = re.compile(r"(?<!\S)(" + "|".join(re.escape(part) for part in PARTS) +
                 r")(?=\s|[,;]|$)")
SENSE = re.compile(r"^(?:(\d{1,2})\.\s+|Defn:\s*)(.*)$")
LABEL = re.compile(r"^\((?P<label>[^()]+)\)$")


def is_entry(heading, next_line):
    heading = heading.strip()
    if not heading.isupper() or not HEAD.fullmatch(heading) or not next_line or next_line[0].isspace():
        return False
    first_word = key(heading.split(";", 1)[0])
    body = key(next_line.translate(STRESS))
    if not body.startswith(first_word):
        return False
    boundary = body[len(first_word):len(first_word) + 1]
    return not boundary or not boundary.isalnum()


def entries(path):
    with open_source(path) as stream:
        if not any(line.strip() == START for line in stream):
            raise ValueError("The expected Webster 29765 header was not found")
        previous, at_boundary = "", True
        block = []
        for line in stream:
            if line.strip() == END:
                break
            starts_entry = at_boundary and is_entry(previous, line)
            if starts_entry and block:
                yield block
                block = []
            if block or starts_entry:
                block.append(previous.rstrip("\n"))
            at_boundary = not previous.strip()
            previous = line
        else:
            raise ValueError("The Webster 29765 body is incomplete")
        if block:
            block.append(previous.rstrip("\n"))
            yield block


def glosses(body):
    current, numbering = [], None
    for line in body:
        match = SENSE.match(line)
        if match:
            marker, definition = match.groups()
            if marker is None and current and LABEL.fullmatch(current[0]) and not any(current[1:]):
                current.append(definition)
                continue
            if current and any(current) and not current[0].startswith("Etym:"):
                yield numbering, " ".join(item.strip() for item in current if item.strip())
            current, numbering = [definition], marker
        elif current:
            current.append(line)
    if current and any(current) and not current[0].startswith("Etym:"):
        yield numbering, " ".join(item.strip() for item in current if item.strip())


def webster(path, selected, report):
    entries_seen = {}
    for raw in entries(path):
        names = [key(name) for name in raw[0].split(";")]
        names = list(dict.fromkeys(name for name in names if name))
        words = [name for name in names if selected is None or name in selected]
        if not words:
            continue
        split = next((i for i, line in enumerate(raw[1:], 1) if not line.strip() or SENSE.match(line)), len(raw))
        header = " ".join(raw[1:split])
        syntax, _, origin = header.partition("Etym:")
        match = POS.search(syntax)
        pos = PARTS[match[1]] if match else "unknown"
        definitions = [(ordinal, definition) for ordinal, definition in glosses(raw[split:])
                       if definition and not LABEL.fullmatch(definition)]
        if not definitions:
            report["entries_without_marked_definitions"] += 1
            continue
        line = "\n".join(raw)
        for word in words:
            identity = (word, pos, key(syntax.translate(STRESS)))
            duplicate = entries_seen.get(identity, 0)
            entries_seen[identity] = duplicate + 1
            entry_id = identifier("webster1913", *identity, duplicate)
            if duplicate:
                report["unresolved_homographs"] += 1
            seen_senses = {}
            senses = []
            for ordinal, definition in definitions:
                sense_key = (ordinal, key(definition))
                copy = seen_senses.get(sense_key, 0)
                seen_senses[sense_key] = copy + 1
                tags = ["historical-source"]
                if "[Obs.]" in definition:
                    tags.append("obsolete")
                if "[Archaic]" in definition:
                    tags.append("archaic")
                senses.append({"id": identifier(entry_id, ordinal, definition, copy),
                               "definition": definition, "labels": tags})
            yield ({
                "id": entry_id, "word": word, "pos": pos, "source": "webster1913", "sourceUrl": URL,
                "historical": True, "etymology": origin.strip(), "sourceHeader": header,
                "forms": [{"word": name, "labels": ["alternative spelling"]} for name in names if name != word],
                "senses": senses
            }, line)
