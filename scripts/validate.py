#!/usr/bin/env python3
"""Dependency-free static checks; optionally compare cache versions with a Git ref."""

import argparse
import ast
import json
import re
import subprocess
import sys

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []
TIMEOUT = 30


def fail(message):
    ERRORS.append(message)


def run(*args, **kwargs):
    """Run a subprocess with a timeout and normalized error handling."""
    kwargs.setdefault("timeout", TIMEOUT)

    try:
        return subprocess.run(
            args,
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            capture_output=True,
            **kwargs,
        )
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(
            args,
            124,
            stdout="",
            stderr=f"command timed out after {kwargs['timeout']} seconds",
        )
    except OSError as error:
        return subprocess.CompletedProcess(
            args,
            127,
            stdout="",
            stderr=str(error),
        )


def relative(path):
    return str(path.relative_to(ROOT))


def require_file(path):
    if not path.is_file():
        raise ValueError(f"missing file: {relative(path)}")
    return path


def local_target(folder, value):
    if not isinstance(value, str) or not value:
        raise ValueError(f"expected a non-empty relative path: {value!r}")

    url = urlsplit(value)

    if url.scheme or url.netloc or url.path.startswith("/"):
        raise ValueError(f"expected a relative local path: {value}")

    target = (folder / unquote(url.path)).resolve()

    # Prevent directory traversal and symlink escapes.
    target.relative_to(folder.resolve())

    if target.is_dir():
        target /= "index.html"

    if not target.is_file():
        raise ValueError(f"missing file: {value}")

    return target


class Scripts(HTMLParser):
    """Collect classic inline scripts and updater version declarations."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.code = None
        self.blocks = []
        self.updater_versions = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return

        attrs = dict(attrs)

        if attrs.get("id") == "acswebapps-updater":
            self.updater_versions.append(attrs.get("data-version"))

        kind = attrs.get("type", "").strip().lower()

        if (
            "src" not in attrs
            and kind in (
                "",
                "text/javascript",
                "application/javascript",
            )
        ):
            self.code = []

    def handle_data(self, data):
        if self.code is not None:
            self.code.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.code is not None:
            self.blocks.append("".join(self.code))
            self.code = None

    def finish(self):
        if self.code is not None:
            raise ValueError("unclosed inline script")


def check_js(label, source):
    result = run("node", "--check", input=source)

    if result.returncode:
        fail(f"{label}: {result.stderr.strip()}")


def worker_config(source):
    """Extract literal service-worker cache version and asset array."""

    version = re.search(
        r"""\b(?:const|let|var)\s+(?:VERSION|CACHE)\s*=\s*(['"])(.*?)\1\s*;""",
        source,
    )

    assets = re.search(
        r"\b(?:const|let|var)\s+(?:FILES|ASSETS|SHELL)\s*=\s*(\[[\s\S]*?\])\s*;",
        source,
    )

    if not version or not assets:
        raise ValueError(
            "expected a literal VERSION/CACHE and FILES/ASSETS/SHELL array"
        )

    values = ast.literal_eval(assets.group(1))

    if not isinstance(values, list) or not all(
        isinstance(value, str) and value
        for value in values
    ):
        raise ValueError("cache asset array must contain non-empty strings")

    if len(values) != len(set(values)):
        raise ValueError("duplicate entries in service-worker cache asset array")

    return version.group(2), values


def check_manifest(path):
    require_file(path)

    manifest = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(manifest, dict):
        raise ValueError("manifest must be a JSON object")

    for field in ("name", "short_name", "start_url", "display"):
        if not isinstance(manifest.get(field), str) or not manifest[field].strip():
            raise ValueError(f"missing or invalid {field}")

    local_target(path.parent, manifest["start_url"])

    icons = manifest.get("icons", [])

    if not isinstance(icons, list):
        raise ValueError("icons must be an array")

    for index, icon in enumerate(icons):
        if not isinstance(icon, dict):
            raise ValueError(f"icon {index}: expected an object")

        if not isinstance(icon.get("src"), str) or not icon["src"]:
            raise ValueError(f"icon {index}: missing or invalid src")

        local_target(path.parent, icon["src"])


def check_registry():
    registry = run(
        "node",
        "-e",
        (
            "const fs=require('fs'),vm=require('vm');"
            "const c={window:{}};"
            "vm.runInNewContext("
            "fs.readFileSync('assets/apps.js','utf8'),"
            "c,{timeout:1000}"
            ");"
            "process.stdout.write(JSON.stringify(c.window.APPS));"
        ),
    )

    if registry.returncode:
        raise ValueError(registry.stderr.strip())

    apps = json.loads(registry.stdout)

    if not isinstance(apps, list):
        raise ValueError("window.APPS must be an array")

    seen = set()

    for index, app in enumerate(apps):
        if not isinstance(app, dict):
            raise ValueError(f"app {index}: expected an object")

        app_id = app.get("id")

        if (
            not isinstance(app_id, str)
            or not re.fullmatch(r"[a-z0-9-]+", app_id)
            or app_id in seen
        ):
            raise ValueError(f"invalid or duplicate app id: {app_id!r}")

        seen.add(app_id)

        for field in ("name", "description", "icon"):
            if (
                not isinstance(app.get(field), str)
                or not app[field].strip()
            ):
                raise ValueError(f"{app_id}: missing or invalid {field}")

        if app.get("status") not in ("live", "beta", "soon"):
            raise ValueError(f"{app_id}: invalid status")

        tags = app.get("tags")

        if not isinstance(tags, list) or not all(
            isinstance(tag, str) for tag in tags
        ):
            raise ValueError(f"{app_id}: invalid tags")

        if app["status"] != "soon":
            local_target(
                ROOT,
                app.get("url") or f"apps/{app_id}/",
            )

        if app.get("iconUrl"):
            local_target(ROOT, app["iconUrl"])


def git_changed_files(base):
    diff = run("git", "diff", "--name-only", "-z", base, "--")

    if diff.returncode:
        raise ValueError(
            f"cannot compare base {base}: {diff.stderr.strip()}"
        )

    return set(diff.stdout.split("\0")) - {""}


def previous_worker(path, base):
    """Read the previous worker, returning None if it did not exist."""

    name = relative(path)

    old = run("git", "show", f"{base}:{name}")

    if old.returncode == 0:
        return worker_config(old.stdout)

    exists = run("git", "cat-file", "-e", f"{base}:{name}")

    if exists.returncode == 0:
        raise ValueError("could not read base service worker")

    return None


def cached_files(path, assets):
    """Resolve all files belonging to a worker's offline cache."""

    cached = {
        relative(path),
        relative(path.parent / "index.html"),
    }

    manifest_name = (
        "manifest.json"
        if path.parent == ROOT
        else "manifest.webmanifest"
    )

    cached.add(relative(path.parent / manifest_name))

    resolved = set()

    for asset in assets:
        target = local_target(path.parent, asset)
        name = relative(target)

        # Already included as a required cache file.
        if name in cached:
            continue

        if name in resolved:
            raise ValueError(
                f"duplicate resolved cache asset: {asset}"
            )

        resolved.add(name)
        cached.add(name)

    return cached

def check_worker(path, page_updaters, base=None, changed=None):
    require_file(path)

    version, assets = worker_config(
        path.read_text(encoding="utf-8")
    )

    updater = page_updaters.get(path.parent / "index.html")

    if updater != [version]:
        raise ValueError(
            "app updater data-version must match "
            "the service-worker cache version"
        )

    current_files = cached_files(path, assets)

    if not base:
        return

    previous = previous_worker(path, base)

    # A newly added worker has no previous cache version.
    if previous is None:
        return

    previous_version, previous_assets = previous

    old_files = cached_files(path, previous_assets)

    # Compare both old and new cache lists. This also catches removed assets.
    affected = current_files | old_files

    if not affected.intersection(changed):
        return

    before = re.fullmatch(r"(.*-v)(\d+)", previous_version)
    after = re.fullmatch(r"(.*-v)(\d+)", version)

    if (
        not before
        or not after
        or before.group(1) != after.group(1)
        or int(after.group(2)) <= int(before.group(2))
    ):
        raise ValueError(
            f"cached files changed; increase {previous_version} "
            f"(current: {version})"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)

    parser.add_argument(
        "--base",
        help="Git ref to compare for cache-version increases",
    )

    args = parser.parse_args()

    # Required repository files.
    if not (ROOT / ".nojekyll").is_file():
        fail(".nojekyll must exist")

    # JavaScript and HTML syntax checks.
    files = [
        ROOT / "index.html",
        ROOT / "404.html",
    ]

    files += list((ROOT / "assets").rglob("*.js"))
    files += list((ROOT / "apps").rglob("*.html"))
    files += list((ROOT / "apps").rglob("*.js"))
    files += [ROOT / "sw.js"]

    page_updaters = {}

    for path in sorted(set(files)):
        try:
            require_file(path)
            source = path.read_text(encoding="utf-8")

            if path.suffix == ".js":
                check_js(relative(path), source)
                continue

            scripts = Scripts()
            scripts.feed(source)
            scripts.finish()

            page_updaters[path] = scripts.updater_versions

            for index, block in enumerate(scripts.blocks, 1):
                check_js(
                    f"{relative(path)} inline script {index}",
                    block,
                )

        except (OSError, ValueError) as error:
            fail(f"{relative(path)}: {error}")

    # Manifest validation.
    manifests = (
        [ROOT / "manifest.json"]
        + list((ROOT / "apps").rglob("*.webmanifest"))
    )

    valid_manifests = []

    for path in manifests:
        try:
            check_manifest(path)
            valid_manifests.append(path)
        except (OSError, ValueError, KeyError, TypeError) as error:
            fail(f"{relative(path)}: {error}")

    # App registry validation.
    try:
        check_registry()
    except (OSError, ValueError, KeyError, TypeError, SyntaxError) as error:
        fail(f"assets/apps.js: {error}")

    # Optional Git comparison.
    changed = set()

    if args.base:
        try:
            changed = git_changed_files(args.base)
        except ValueError as error:
            fail(str(error))

    # Service-worker validation.
    workers = (
        [ROOT / "sw.js"]
        + sorted((ROOT / "apps").glob("*/sw.js"))
    )

    for path in workers:
        try:
            check_worker(
                path,
                page_updaters,
                args.base,
                changed,
            )
        except (OSError, ValueError, SyntaxError, TypeError) as error:
            fail(f"{relative(path)}: {error}")

    # Final report.
    if ERRORS:
        print(
            "\n\n".join(ERRORS),
            file=sys.stderr,
        )
        print(
            f"\nValidation failed: {len(ERRORS)} error(s).",
            file=sys.stderr,
        )
        return 1

    message = (
        f"Validation passed: JS, {len(valid_manifests)} manifests, "
        "registry, offline assets"
    )

    if args.base:
        message += ", cache versions."
    else:
        message += ". Use --base REF to check cache bumps."

    print(message)
    return 0


if __name__ == "__main__":
    sys.exit(main())
