"""Same-origin Define website and read-only API."""
import argparse
from collections import OrderedDict
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
from threading import BoundedSemaphore, Lock
from time import monotonic
from urllib.parse import parse_qs, quote, unquote, urlencode, urlsplit
from xml.sax.saxutils import escape as xml_escape

from lexical.evidence import add_evidence
from lexical.model import MAX_TERM, SCHEMA, encode, key
from lexical.store import ROOT, connect, coverage_scope

FILTERS = {"pos", "source", "beginning", "ending", "definition", "label", "domain"}
WORD_ID = re.compile(r"[a-f0-9]{28}")
PUBLIC_ASSETS = {"index.html", "index.js", "dictionary.js", "sw.js", "manifest.webmanifest",
                 "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
                 "data/fixtures/starter.js", "sounds/catalog.js", "sounds/apple.mp3",
                 "sounds/bank.mp3", "sounds/serendipity.mp3"}
RELEASE_FILE = re.compile(r"data/releases/(?:manifest\.json|[\w][\w.-]{0,63}/(?:essential|complete|scholarly|forms)-\d+\.ndjson\.gz)")
MAX_CONCURRENT = 16


class RateLimiter:
    def __init__(self):
        self.lock = Lock()
        self.clients = OrderedDict()

    def allow(self, address):
        now = monotonic()
        with self.lock:
            start, count = self.clients.pop(address, (now, 0))
            if now - start >= 60:
                start, count = now, 0
            self.clients[address] = (start, count + 1)
            if len(self.clients) > 4096:
                self.clients.popitem(last=False)
            return count < 240


class DictionaryServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, database, mount="/", canonical=None):
        self.database = database
        self.mount = mount
        self.canonical = canonical
        self.throttle = RateLimiter()
        self.slots = BoundedSemaphore(MAX_CONCURRENT)
        with connect(database, read_only=True) as store:
            limit = store.query("SELECT max(version) FROM schema_migrations").fetchone()[0]
            if limit != SCHEMA:
                raise ValueError("Apply the dictionary schema migration before starting the API")
        super().__init__(address, Handler)

    def get_request(self):
        request, address = super().get_request()
        request.settimeout(12)
        return request, address

    def process_request(self, request, address):
        if not self.slots.acquire(blocking=False):
            request.sendall(b"HTTP/1.0 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n")
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.slots.release()


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenDictionary/1"

    def log_request(self, code="-", size="-"):
        # Log the route class and status only. Query strings and lookup terms can be private.
        route = "api" if "/api/v1/" in self.path else "web"
        self.log_message("%s %s %s %s", self.command, route, code, size)

    def do_GET(self):
        self.dispatch()

    def do_HEAD(self):
        self.dispatch()

    def dispatch(self):
        try:
            if len(self.path) > 8192:
                return self.json(414, {"error": "Request URL is too long"})
            url = urlsplit(self.path)
            if self.server.mount != "/" and url.path == self.server.mount.rstrip("/"):
                self.send_response(308)
                self.send_header("Location", self.server.mount + ("?" + url.query if url.query else ""))
                self.end_headers()
                return
            if not url.path.startswith(self.server.mount):
                return self.json(404, {"error": "Route not found"})
            route = unquote(url.path[len(self.server.mount):], errors="strict")
            params = parse_qs(url.query, max_num_fields=20, errors="strict")
            if route.startswith("api/v1/"):
                if not self.server.throttle.allow(self.client_address[0]):
                    return self.json(429, {"error": "Too many requests. Try again in a minute."}, retry=True)
                return self.api(route[len("api/v1/"):], params)
            if route == "sitemap.xml" and self.server.canonical:
                return self.sitemap(params)
            if route in ("", "index.html") and "word" in params:
                return self.entry(params)
            if route in PUBLIC_ASSETS or RELEASE_FILE.fullmatch(route):
                return self.asset(route)
            if not route:
                return self.asset("index.html")
            return self.json(404, {"error": "Route not found"})
        except ValueError as error:
            return self.json(400, {"error": str(error)})
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as error:
            self.log_error("Request failed (%s)", type(error).__name__)
            return self.json(503, {"error": "Dictionary temporarily unavailable"})

    def send_body(self, code, payload, content_type, cache="no-store", retry=False):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.security_headers(cache)
        if retry:
            self.send_header("Retry-After", "60")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def security_headers(self, cache):
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
                         "img-src 'self' https://atlantachristianstudents.goatcounter.com; "
                         "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")

    def json(self, code, value, retry=False):
        self.send_body(code, encode(value).encode(), "application/json; charset=utf-8", retry=retry)

    def asset(self, route):
        path = ROOT / route
        if not path.is_file():
            return self.json(404, {"error": "File not found"})
        content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        cache = "public, max-age=31536000, immutable" if route.endswith(".ndjson.gz") else "no-cache"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.security_headers(cache)
        self.end_headers()
        if self.command != "HEAD":
            with path.open("rb") as stream:
                shutil.copyfileobj(stream, self.wfile)

    @staticmethod
    def param(params, name, default="", maximum=200):
        values = params.get(name, [default])
        if len(values) != 1 or len(values[0]) > maximum or any(ord(char) < 32 for char in values[0]):
            raise ValueError("Invalid parameter " + name)
        return values[0].strip()

    def api(self, route, params):
        with connect(self.server.database, read_only=True) as store:
            if route == "health":
                scope = coverage_scope(store.release_metadata())
                edition = {"full": "Full online dictionary", "starter": "Starter API",
                           "partial": "Partial API", "empty": "Empty API"}[scope]
                return self.json(200, {"status": "ok", "schema": SCHEMA, "hasData": scope != "empty",
                                       "coverage": scope, "edition": edition})
            if route == "sources":
                return self.json(200, store.release_metadata())
            if route == "releases":
                path = ROOT / "data/releases/manifest.json"
                return self.json(200, json.loads(path.read_text(encoding="utf-8")) if path.is_file()
                                 else {"schema": SCHEMA, "editions": {}})
            if route == "browse":
                if set(params) - {"prefix", "after", "limit"}:
                    raise ValueError("Unknown browse parameter")
                limit = int(self.param(params, "limit", "24", 2))
                if not 1 <= limit <= 50:
                    raise ValueError("Limit must be between 1 and 50")
                return self.json(200, store.browse(self.param(params, "prefix", maximum=MAX_TERM),
                                                   self.param(params, "after", maximum=MAX_TERM), limit))
            if route in {"search", "suggest"}:
                unknown = set(params) - FILTERS - {"q", "limit"}
                if unknown:
                    raise ValueError("Unknown search parameter")
                word = self.param(params, "q", maximum=MAX_TERM)
                limit = int(self.param(params, "limit", "24", 2))
                if not 1 <= limit <= 50:
                    raise ValueError("Limit must be between 1 and 50")
                filters = {name: self.param(params, name, maximum=80) for name in FILTERS if name in params}
                if route == "suggest" and not word:
                    return self.json(200, [])
                return self.json(200, store.search(word, limit, filters, suggest=route == "suggest"))
            if route.startswith("lookup/"):
                word = self.param({"word": [route[len("lookup/"):]]}, "word", maximum=MAX_TERM)
                if not key(word):
                    raise ValueError("A headword is required")
                record = store.lookup(word)
                if record and self.param(params, "view", maximum=12) == "scholarly":
                    add_evidence(store, record)
                return self.json(200, record) if record else self.json(404, {"error": "Headword not found"})
            if route.startswith("senses/"):
                parts = route.split("/")
                if len(parts) not in (2, 3) or not WORD_ID.fullmatch(parts[1]) or (len(parts) == 3 and parts[2] != "relations"):
                    raise ValueError("Invalid sense route")
                sense = store.sense(parts[1])
                if sense is None:
                    return self.json(404, {"error": "Sense not found"})
                return self.json(200, sense.get("relations", {}) if len(parts) == 3 else sense)
        return self.json(404, {"error": "Route not found"})

    def entry(self, params):
        word = self.param(params, "word", maximum=MAX_TERM)
        with connect(self.server.database, read_only=True) as store:
            record = store.lookup(word)
            source_names = {name: metadata["name"] for name, metadata in store.release_metadata().items()} if record else {}
        source = (ROOT / "index.html").read_text(encoding="utf-8")
        if not record:
            source = source.replace("<!-- ENTRY_HTML -->", "<h1>Headword unavailable</h1>")
            source = source.replace("</head>", '<meta name="robots" content="noindex"></head>', 1)
            return self.send_body(404, source.encode(), "text/html; charset=utf-8", "no-cache")
        title = escape(record["word"], quote=True)
        canonical = self.server.canonical
        if canonical:
            canonical = escape(canonical + "?" + urlencode({"word": record["word"]}), quote=True)
        markup = [f'<h1 class="word-title">{title}</h1>']
        for group in record["groups"]:
            source_name = escape(source_names.get(group["source"], group["source"]))
            context = '<p class="meta">Historical dictionary · 1913</p>' if group.get("historical") else ""
            definitions = "".join(f'<li id="sense-{sense["id"]}"><p class="definition">{escape(sense["definition"])}</p></li>'
                                  for sense in group["senses"])
            markup.append(f'<section class="lexeme"><h2>{escape(group["pos"])}</h2><p>{source_name}</p>'
                          f'{context}<ol class="sense-list">{definitions}</ol></section>')
        excerpt = escape(record["groups"][0]["senses"][0]["definition"][:160], quote=True)
        meta = [f'<meta property="og:title" content="{title} · Define">',
                f'<meta property="og:description" content="{excerpt}">']
        if canonical:
            meta += [f'<link rel="canonical" href="{canonical}">', f'<meta property="og:url" content="{canonical}">']
        else:
            meta.append('<meta name="robots" content="noindex">')
        source = source.replace("<!-- ENTRY_HTML -->", "".join(markup))
        source = re.sub(r'  <meta property="og:description" [^>]*>\n', '', source, count=1)
        source = source.replace("<title>Define</title>", f"<title>{title} · Define</title>", 1)
        source = source.replace('<meta property="og:title" content="Define">', "".join(meta), 1)
        return self.send_body(200, source.encode(), "text/html; charset=utf-8", "no-cache")

    def sitemap(self, params):
        size = 5000
        page = int(self.param(params, "page", "0", 5))
        if not 0 <= page <= 2000:
            raise ValueError("Invalid sitemap page")
        with connect(self.server.database, read_only=True) as store:
            if page == 0:
                count = store.query("SELECT count(DISTINCT headword) FROM lexemes JOIN active_releases USING(source,version)").fetchone()[0]
                tag = "sitemapindex"
                rows = (("sitemap", self.server.canonical + "sitemap.xml?page=" + str(index + 1))
                        for index in range((count + size - 1) // size))
            else:
                tag = "urlset"
                words = store.query("""SELECT COALESCE(min(CASE WHEN spelling=headword THEN spelling END),min(spelling))
                    FROM lexemes JOIN active_releases USING(source,version)
                    GROUP BY headword ORDER BY headword LIMIT ? OFFSET ?""", (size, (page - 1) * size)).fetchall()
                rows = (("url", self.server.canonical + "?word=" + quote(word, safe="")) for (word,) in words)
        body = "".join(f"<{kind}><loc>{xml_escape(url)}</loc></{kind}>" for kind, url in rows)
        xml = f'<?xml version="1.0" encoding="UTF-8"?><{tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</{tag}>'
        self.send_body(200, xml.encode(), "application/xml; charset=utf-8", "public, max-age=3600")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=os.environ.get("OPEN_DICT_DATABASE_URL", ".local/full.sqlite"))
    parser.add_argument("--allow-partial", action="store_true", help="Serve a fixture or incomplete database for development")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--mount", default="/")
    parser.add_argument("--canonical", help="Absolute HTTPS URL ending with the mount path, for entry SEO")
    args = parser.parse_args()
    if not re.fullmatch(r"/(?:[\w-]+/)*", args.mount):
        parser.error("Mount must start and end with a slash")
    if args.canonical:
        url = urlsplit(args.canonical)
        if url.scheme != "https" or not url.hostname or url.username or url.path != args.mount or url.query or url.fragment:
            parser.error("Canonical URL must be HTTPS, with a path equal to --mount")
    if not args.db.startswith(("postgresql://", "postgres://")) and not Path(args.db).is_file():
        parser.error("Import the full dictionary with lexical.build import-all before starting the API")
    with connect(args.db, read_only=True) as store:
        scope = coverage_scope(store.release_metadata())
    if scope != "full" and not args.allow_partial:
        parser.error(f"Dictionary data are {scope}. Run lexical.build import-all or use --allow-partial for development")
    with DictionaryServer((args.host, args.port), args.db, args.mount, args.canonical) as server:
        print(f"Define at http://{args.host}:{args.port}{args.mount}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
