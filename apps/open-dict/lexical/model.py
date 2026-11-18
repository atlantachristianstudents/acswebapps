"""Source-neutral serialization conventions for the API, fixtures and packs."""
import json
import hashlib
import unicodedata

SCHEMA = 1
MAX_TERM = 1024
SOURCES = frozenset({"wiktionary", "oewn", "webster1913"})
PUNCTUATION = str.maketrans({"’": "'", "‘": "'", "‐": "-", "‑": "-", "–": "-"})
RELATIONS = ("synonyms", "antonyms", "hypernyms", "hyponyms", "related", "derived",
             "coordinate_terms", "meronyms", "holonyms", "instances", "form_of", "alt_of")
HISTORICAL = {"archaic", "obsolete", "dated", "historical"}


def key(text):
    return " ".join(unicodedata.normalize("NFKC", text).translate(PUNCTUATION).lower().split())


def encode(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def identifier(*parts):
    return hashlib.sha256(encode(parts).encode()).hexdigest()[:28]


def objects(value):
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def strings(value):
    return [item for item in value if isinstance(item, str) and item] if isinstance(value, list) else []


def text(value):
    return value.strip() if isinstance(value, str) else ""
