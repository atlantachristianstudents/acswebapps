#!/usr/bin/env python3
"""Dependency-free static checks; optionally compare cache versions with a Git ref."""
import argparse
import ast
import json
from pathlib import Path
import re
import subprocess
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []


def fail(message):
    ERRORS.append(message)


def run(*args, **kwargs):
    return subprocess.run(args, cwd=ROOT, text=True, capture_output=True, **kwargs)


def relative(path):
    return str(path.relative_to(ROOT))


def local_target(folder, value):
    url = urlsplit(value)
    if url.scheme or url.netloc or url.path.startswith('/'):
        raise ValueError(f'expected a relative local path: {value}')
    target = (folder / unquote(url.path)).resolve()
    target.relative_to(folder.resolve())
    if target.is_dir():
        target /= 'index.html'
    if not target.is_file():
        raise ValueError(f'missing file: {value}')
    return target


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.code = None
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag != 'script':
            return
        attrs = dict(attrs)
        kind = attrs.get('type', '').strip().lower()
        if 'src' not in attrs and kind in ('', 'text/javascript', 'application/javascript'):
            self.code = []

    def handle_data(self, data):
        if self.code is not None:
            self.code.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.code is not None:
            self.blocks.append(''.join(self.code))
            self.code = None


def check_js(label, source):
    result = run('node', '--check', input=source)
    if result.returncode:
        fail(f'{label}: {result.stderr.strip()}')


def worker_config(source):
    version = re.search(r'\b(?:const|let|var)\s+(?:VERSION|CACHE)\s*=\s*([\'"])(.*?)\1\s*;', source)
    assets = re.search(r'\b(?:const|let|var)\s+(?:FILES|ASSETS|SHELL)\s*=\s*(\[[\s\S]*?\])\s*;', source)
    if not version or not assets:
        raise ValueError('expected a literal VERSION/CACHE and FILES/ASSETS/SHELL array')
    values = ast.literal_eval(assets.group(1))
    if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
        raise ValueError('cache asset array must contain only strings')
    return version.group(2), values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', help='Git ref to compare for cache-version increases')
    args = parser.parse_args()
    if not (ROOT / '.nojekyll').is_file():
        fail('.nojekyll must exist')

    # Include classic inline scripts; skip JSON/data script blocks.
    files = [ROOT / 'index.html', ROOT / '404.html']
    files += list((ROOT / 'assets').rglob('*.js'))
    files += list((ROOT / 'apps').rglob('*.html'))
    files += list((ROOT / 'apps').rglob('*.js'))
    files += [ROOT / 'sw.js']
    for path in sorted(set(files)):
        if path.suffix == '.js':
            check_js(relative(path), path.read_text())
        else:
            scripts = Scripts()
            scripts.feed(path.read_text())
            for index, source in enumerate(scripts.blocks, 1):
                check_js(f'{relative(path)} inline script {index}', source)

    manifests = [ROOT / 'manifest.json'] + list((ROOT / 'apps').rglob('*.webmanifest'))
    for path in manifests:
        try:
            manifest = json.loads(path.read_text())
            for field in ('name', 'short_name', 'start_url', 'display'):
                if not isinstance(manifest.get(field), str) or not manifest[field]:
                    raise ValueError(f'missing or invalid {field}')
            local_target(path.parent, manifest['start_url'])
            for icon in manifest.get('icons', []):
                local_target(path.parent, icon['src'])
        except (ValueError, KeyError, TypeError) as error:
            fail(f'{relative(path)}: {error}')

    registry = run('node', '-e', "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.runInNewContext(fs.readFileSync('assets/apps.js','utf8'),c,{timeout:1000});process.stdout.write(JSON.stringify(c.window.APPS));")
    try:
        if registry.returncode:
            raise ValueError(registry.stderr.strip())
        apps = json.loads(registry.stdout)
        if not isinstance(apps, list):
            raise ValueError('window.APPS must be an array')
        seen = set()
        for app in apps:
            app_id = app['id']
            if not isinstance(app_id, str) or not re.fullmatch(r'[a-z0-9-]+', app_id) or app_id in seen:
                raise ValueError(f'invalid or duplicate app id: {app_id}')
            seen.add(app_id)
            for field in ('name', 'description', 'icon'):
                if not isinstance(app.get(field), str) or not app[field]:
                    raise ValueError(f'{app_id}: missing {field}')
            if app.get('status') not in ('live', 'beta', 'soon'):
                raise ValueError(f'{app_id}: invalid status')
            if not isinstance(app.get('tags'), list) or not all(isinstance(tag, str) for tag in app['tags']):
                raise ValueError(f'{app_id}: invalid tags')
            if app['status'] != 'soon':
                local_target(ROOT, app.get('url') or f'apps/{app_id}/')
            if app.get('iconUrl'):
                local_target(ROOT, app['iconUrl'])
    except (ValueError, KeyError, TypeError) as error:
        fail(f'assets/apps.js: {error}')

    changed = set()
    if args.base:
        diff = run('git', 'diff', '--name-only', '-z', args.base, '--')
        if diff.returncode:
            fail(f'Cannot compare base {args.base}: {diff.stderr.strip()}')
        else:
            changed = set(diff.stdout.split('\0')) - {''}

    for path in [ROOT / 'sw.js'] + sorted((ROOT / 'apps').glob('*/sw.js')):
        try:
            version, assets = worker_config(path.read_text())
            cached = {relative(path), relative(path.parent / 'index.html')}
            manifest_name = 'manifest.json' if path.parent == ROOT else 'manifest.webmanifest'
            cached.add(relative(path.parent / manifest_name))
            for asset in assets:
                cached.add(relative(local_target(path.parent, asset)))
            if args.base and cached & changed:
                old = run('git', 'show', f'{args.base}:{relative(path)}')
                if old.returncode:
                    exists = run('git', 'cat-file', '-e', f'{args.base}:{relative(path)}')
                    if exists.returncode == 0:
                        raise ValueError('could not read base service worker')
                    continue  # A newly added worker has no previous version.
                previous, _ = worker_config(old.stdout)
                before = re.fullmatch(r'(.*-v)(\d+)', previous)
                after = re.fullmatch(r'(.*-v)(\d+)', version)
                if not before or not after or int(after[2]) <= int(before[2]):
                    raise ValueError(f'cached files changed; increase {previous} (current: {version})')
        except (ValueError, SyntaxError) as error:
            fail(f'{relative(path)}: {error}')

    if ERRORS:
        print('\n\n'.join(ERRORS), file=sys.stderr)
        return 1
    print(f'Validation passed: JS, {len(manifests)} manifests, registry, offline assets' + (', cache versions.' if args.base else '. Use --base REF to check cache bumps.'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
