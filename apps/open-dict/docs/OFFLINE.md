# Offline editions

Open the app on HTTPS or localhost. The service worker caches the shell and the bundled starter. On iPhone or iPad use Safari’s Share menu and Add to Home Screen. Supported desktop and Android browsers expose an Install option. The same offline lookup is available in a browser tab after provisioning.

On **Offline**, check for data packs. A publisher can offer the **Essential English** edition with a selected headword list, core source senses, IPA, forms, and synonyms. **Complete English** contains all normalized records in the publisher’s active releases with available examples, etymologies, and relations. **Scholarly Research** adds licensed WordNet lexical records, Webster transcription excerpts, and selected Wiktextract gloss fields and citation references when the original releases are archived. The edition manifests give actual compressed sizes and headword counts. The installed IndexedDB size depends on the browser, indexes, and retained prior edition.

The installer validates the schema, size, SHA-256, decoded byte length, record shape, and headword count of every chunk. It stages data in a separate slot and atomically activates the release only once validation succeeds. A partial, cancelled, corrupted, or out-of-quota installation leaves the current edition active. A prior working edition is retained until another installation succeeds. Staging files abandoned by a closed browser are eligible for cleanup on the next installation after 24 hours. The app asks for persistent storage where supported. Browsers can still evict data. The app remembers the last installation’s edition and date in local preferences to help the reader download it again.

The app currently downloads an edition in versioned gzip chunks. Cancelled installs retry from the first chunk. Pack files must be served as raw gzip artifacts without adding `Content-Encoding: gzip` to the file response. The manifest is served over the trusted app origin. Checksums protect file integrity against corruption relative to that manifest.


A release also includes range descriptors and a form index for online static lookup. The static frontend fetches only the needed shards from the published Complete or Scholarly edition. Browsing with a cursor can continue through every prefix key. This session cache is separate from installed IndexedDB packs.

Use `python3 -m lexical.build coverage` to compare the installed database against the locally published release manifest. The command gives per-edition counts, decoded bytes, available fields, and source licenses. See [Ingestion](INGESTION.md).
