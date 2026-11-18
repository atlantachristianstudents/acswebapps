# Deployment

## ACS Web Apps and static hosting

GitHub Pages serves `/apps/define/` at the custom domain and `/acswebapps/apps/define/` on the project-site fallback. The frontend uses relative URLs. Full static lookup requires the generated `data/releases/manifest.json` and all files in its named release directory at the app’s same-origin URL. Upload the version directory first and publish the manifest last. Serve compressed files as bytes without HTTP content encoding. Keep an earlier version directory available while existing tabs may still have its manifest.

The old `/apps/open-dict/` page redirects to `/apps/define/` and carries over entry query parameters and links. The [Pages workflow](../../../.github/workflows/deploy-pages.yml) stages the tracked site, downloads the pinned Define archive from GitHub Releases, verifies its SHA-256, and adds its `data/releases/` files. Set the Pages source to **GitHub Actions** to publish this artifact. A bare Pages checkout exposes the bundled starter. Neither the Python API nor the database runs on GitHub Pages.

For a new release, package `data/releases/manifest.json`, the version directory, and the source notices into a `.tar` with paths relative to `apps/define/`. Include any earlier version directories that active sessions still use. Upload it as `define-<version>.tar` to the `define-<version>` GitHub release, then update `DEFINE_RELEASE` and `DEFINE_SHA256` in the Pages workflow. After deployment, confirm the public manifest returns HTTP 200 and check for editions under **Offline → Check for data packs**.

## PostgreSQL

Create a dedicated UTF-8 database with a binary `C` collation so the ordered prefix and export ranges match lexical keys. The migration creates the `pg_trgm` extension, so initialize using the dictionary owner or have a database administrator enable it first. Use the pinned app requirements with Python 3.13. For development, the same schema supports SQLite with FTS5 and no third-party dependencies.

```sh
python -m pip install --require-hashes -r docker/requirements.txt
python -m lexical.build --db "$OPEN_DICT_DATABASE_URL" import-all .local/raw
python -m api.server --mount /apps/define/ --canonical https://dictionary.example/apps/define/
```

Set `OPEN_DICT_DATABASE_URL` in the deployment environment. Use a PostgreSQL service file, `.pgpass`, or a service-managed secret for credentials. Behind a TLS reverse proxy, forward the app’s complete mount path and keep the API worker on a loopback or private interface. Set the canonical URL to the real deployment address before submitting `sitemap.xml`. The rate limiter is per source IP and process. Behind shared proxies, apply public client limits at the proxy and budget the API limit for aggregate traffic.

## Docker

Copy `.env.example` to `.env` and set `OPEN_DICT_DB_PASSWORD`. Create `data/releases` and obtain the verified archives with `python3 -m lexical.build download .local/raw`. Compose mounts the archive directory read-only and completes all three full imports before starting the API. Rerun the same initialization after an interrupted import.

```sh
docker compose build init
docker compose up -d
docker compose ps
docker compose --profile import run --rm import report
docker compose --profile import run --rm import coverage
```

The container uses UID 10001. For release generation inside Docker, grant that UID write access to the mounted release directory. The database is on a dedicated named volume and has no host port mapping. Bind the frontend to a private LAN address only when required and use HTTPS for PWA features from remote devices.

For a portable backup, run the following from the app directory. Restore into a new empty dictionary database on a matching or newer PostgreSQL version with the required extension available.

```sh
docker compose exec -T db pg_dump -U open_dict -Fc open_dict > dictionary.dump
pg_restore --exit-on-error --no-owner --dbname "$OPEN_DICT_RESTORE_URL" dictionary.dump
```

Back up locally archived input files and released manifests separately. For an air-gapped host, build and save the app image on a connected machine, pull and save the target architecture’s PostgreSQL image, and transfer those images, this app folder, the datasets, and their checksums. On the isolated host, run `docker load` for the images, provision the secrets locally, and run `docker compose up -d --no-build --pull never`. Import the transferred snapshots or restore a prepared database.
