"""Download Songbase's complete library; optionally refresh the embedded webapp copy."""

import argparse
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.error
import urllib.request


API_URL = "https://songbase.life/api/v2/app_data"
APP_DIR = Path(__file__).resolve().parent


def validate_library(data):
    if not isinstance(data, dict) or not isinstance(data.get("songs"), list) or not data["songs"]:
        raise ValueError("Songbase returned no songs")
    if not isinstance(data.get("books"), list) or not data["books"]:
        raise ValueError("Songbase returned no songbooks")
    if data.get("songCount") != len(data["songs"]):
        raise ValueError("Songbase returned an incomplete library")
    ids = set()
    for song in data["songs"]:
        if not isinstance(song, dict):
            raise ValueError("Invalid song record")
        song_id = song.get("id")
        if type(song_id) is not int or song_id < 1 or song_id in ids:
            raise ValueError("Invalid or duplicate song ID")
        ids.add(song_id)
        if not all(isinstance(song.get(field), str) for field in ("title", "lyrics", "lang")):
            raise ValueError("Invalid song text")
        if not isinstance(song.get("language_links", []), list):
            raise ValueError("Invalid language links")
    for book in data["books"]:
        if not isinstance(book, dict) or not all(isinstance(book.get(field), str) for field in ("name", "slug")):
            raise ValueError("Invalid songbook")
        if not isinstance(book.get("songs"), dict):
            raise ValueError("Invalid songbook mapping")
    return data


def content_key(data):
    """Ignore API fetch timestamps and ordering when deciding whether to commit."""
    return json.dumps({
        "songs": sorted(data["songs"], key=lambda song: song["id"]),
        "books": sorted(data["books"], key=lambda book: book["slug"]),
    }, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def atomic_write(path, text):
    descriptor, temporary = tempfile.mkstemp(prefix=".songbase-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def update_snapshot(data, directory=APP_DIR, embed=False):
    validate_library(data)
    archive = directory / "songbase_all.json"
    previous = json.loads(archive.read_text(encoding="utf-8")) if archive.exists() else None
    changed = previous is None or content_key(previous) != content_key(data)
    # Preserve the old timestamp when the songs/books have not changed.
    snapshot = data if changed else previous
    payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    writes = {}
    if changed:
        writes[archive] = payload + "\n"
    if embed:
        page = directory / "index.html"
        html = page.read_text(encoding="utf-8")
        escaped = payload.replace("<", "\\u003c")
        updated, count = re.subn(
            r'(<script id="songbase-data" type="application/json">).*?(</script>)',
            lambda match: match[1] + escaped + match[2], html, count=1, flags=re.DOTALL,
        )
        if count != 1:
            raise ValueError("Could not find the embedded Songbase library")
        if updated != html:
            writes[page] = updated
    if writes:
        worker = directory / "sw.js"
        updated, count = re.subn(r"big-text-v(\d+)", lambda match: "big-text-v" + str(int(match[1]) + 1),
                                 worker.read_text(encoding="utf-8"), count=1)
        if count != 1:
            raise ValueError("Could not find the service-worker cache version")
        writes[worker] = updated
        for path, text in writes.items():
            atomic_write(path, text)
    return bool(writes)


def download_library():
    request = urllib.request.Request(API_URL, headers={"User-Agent": "ACS Web Apps-Big-Text-Songbase-Sync/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return validate_library(json.load(response))
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--embed", action="store_true", help="Also update the offline library embedded in index.html")
    args = parser.parse_args()
    data = download_library()
    changed = update_snapshot(data, embed=args.embed)
    languages = {song["lang"] for song in data["songs"]}
    print(("Updated" if changed else "Unchanged") + f": {len(data['songs']):,} songs in {len(languages)} language categories")


if __name__ == "__main__":
    main()
