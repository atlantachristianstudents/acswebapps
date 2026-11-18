# Deployment

## ACS Web Apps and static hosting

GitHub Pages serves the existing repository root. The app route is `/apps/open-dict/` at the custom domain and `/acswebapps/apps/open-dict/` at the project-site fallback. Serve `index.html` and app-local resources with the existing worker scope. A static pack publisher can provide immutable files under the app’s `data/releases/` path. GitHub Pages can serve source files and fixtures directly. Provision larger releases through a separate artifact publication workflow consistent with the host’s size limits.

## PostgreSQL

Create a dedicated UTF-8 database with a binary `C` collation so the ordered prefix and export ranges match lexical keys. The migration creates the `pg_trgm` extension, so initialize using the dictionary owner or have a database administrator enable it first. Use the pinned app requirements with Python 3.13. For development, the same schema supports SQLite with FTS5 and no third-party dependencies.

```sh
python -m pip install --require-hashes -r docker/requirements.txt
python -m lexical.build --db "$OPEN_DICT_DATABASE_URL" seed
python -m api.server --mount /apps/open-dict/ --canonical https://dictionary.example/apps/open-dict/
```

Set `OPEN_DICT_DATABASE_URL` in the deployment environment. Use a PostgreSQL service file, `.pgpass`, or a service-managed secret for credentials. Behind a TLS reverse proxy, forward the app’s complete mount path and keep the API worker on a loopback or private interface. Set the canonical URL to the real deployment address before submitting `sitemap.xml`. The rate limiter is per source IP and process. Behind shared proxies, apply public client limits at the proxy and budget the API limit for aggregate traffic.

## Docker

Copy `.env.example` to `.env` and set a strong `OPEN_DICT_DB_PASSWORD`. Create `data/releases` and `.local/raw` as needed. Mount the latter as the read-only input for imports.

```sh
docker compose build init
docker compose up -d
docker compose ps
docker compose --profile import run --rm import report
docker compose --profile import run --rm import import oewn /sources/wordnet.xml.gz --version 2025
```

The container uses UID 10001. For release generation inside Docker, grant that UID write access to the mounted release directory. The database is on a dedicated named volume and has no host port mapping. Bind the frontend to a private LAN address only when required and use HTTPS for PWA features from remote devices.

For a portable backup, run the following from the app directory. Restore into a new empty dictionary database on a matching or newer PostgreSQL version with the required extension available.

```sh
docker compose exec -T db pg_dump -U open_dict -Fc open_dict > dictionary.dump
pg_restore --exit-on-error --no-owner --dbname "$OPEN_DICT_RESTORE_URL" dictionary.dump
```

Back up locally archived input files and released manifests separately. For an air-gapped host, build and save the app image on a connected machine, pull and save the target architecture’s PostgreSQL image, and transfer those images, this app folder, the datasets, and their checksums. On the isolated host, run `docker load` for the images, provision the secrets locally, and run `docker compose up -d --no-build --pull never`. Import the transferred snapshots or restore a prepared database.
