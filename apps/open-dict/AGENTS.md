# Open Dictionary

Follow the parent ACS Web Apps instructions. Serve the app from this folder with relative URLs and a single primary `index.html`. The frontend uses classic JavaScript and browser APIs. The API and lexical pipeline are independent Python entry points. PostgreSQL support has a pinned Python dependency inside the app’s Docker directory.

- Preserve the release source, original text, source identifiers, and license when changing lexical storage. Keep source senses separate unless an editorial decision is recorded with evidence.
- Limit committed lexical data to the attributed starter fixture and its selection lists. Store raw downloads and databases under `.local/`. Keep release artifacts under ignored `data/releases/` and publish them through a separate, deliberate deployment.
- Render imported values using text nodes or server HTML escaping. Keep new media subject to individual reuse terms. Use parameterized SQL and dedicate a database to Open Dictionary.
- Keep app-shell cache names scoped, use IndexedDB for downloaded packs, and bump the service worker version and updater data-version together after changing the shell.
- Run `python3 -m unittest discover -s tests -v` here, plus `python3 scripts/validate.py --base origin/main` from the repository root. For platform-specific changes, run the corresponding browser or PostgreSQL checks in [Testing](docs/TESTING.md).
- Verify the normal entry point and source provenance in the UI before marking a feature complete. Update [ROADMAP.md](ROADMAP.md) with verified work and use the open items there to resume development.
