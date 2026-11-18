/* Search adapters and verified IndexedDB pack installation. */
(() => {
  "use strict";

  const SCHEMA = 1;
  const RELEASES = "data/releases/manifest.json";
  const MAX = "\uffff";
  const LAST_CODE_POINT = "\u{10ffff}";
  const STAGE_PREFIX = "staging:";
  const STALE_STAGE_MS = 24 * 60 * 60 * 1000;
  const key = value => value.normalize("NFKC").replace(/[‘’]/g, "'")
    .replace(/[‐‑–]/g, "-").trim().replace(/\s+/g, " ").toLowerCase();

  function distance(left, right) {
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    let beforePrevious;
    for (let row = 1; row <= left.length; row++) {
      const next = [row];
      for (let col = 1; col <= right.length; col++) {
        let value = Math.min(next[col - 1] + 1, previous[col] + 1,
          previous[col - 1] + Number(left[row - 1] !== right[col - 1]));
        if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
          value = Math.min(value, beforePrevious[col - 2] + 1);
        }
        next.push(value);
      }
      [beforePrevious, previous] = [previous, next];
    }
    return previous[right.length];
  }

  function matchesGroup(group, filters) {
    if (filters.pos && group.pos !== filters.pos) return false;
    if (filters.source && group.source !== filters.source) return false;
    if (!filters.label && !filters.domain && !filters.definition) return true;
    return group.senses.some(sense =>
      (!filters.label || (sense.labels || []).some(label => key(label).includes(key(filters.label)))) &&
      (!filters.domain || (sense.domains || []).some(domain => key(domain).includes(key(filters.domain)))) &&
      (!filters.definition || key(sense.definition).includes(key(filters.definition))));
  }

  function matches(record, filters) {
    return (!filters.beginning || record.key.startsWith(key(filters.beginning))) &&
      (!filters.ending || record.key.endsWith(key(filters.ending))) &&
      record.groups.some(group => matchesGroup(group, filters));
  }

  function preferredWord(record) {
    return record.groups.find(group => group.word === record.key)?.word || record.word;
  }

  function presentationOrder(record) {
    const word = preferredWord(record);
    const groups = record.groups.slice().sort((left, right) => Number(left.word !== word) - Number(right.word !== word));
    return { ...record, word, groups };
  }

  function searchRows(candidates, term, limit, filters, fuzzy) {
    const results = [];
    for (const record of candidates) {
      if (!matches(record, filters)) continue;
      let rank = 5;
      let cost = 0;
      if (!term) rank = 4;
      else if (record.key === term) rank = 0;
      else if (record.aliases.some(([alias, kind]) => alias === term && kind === "form")) rank = 1;
      else if (record.aliases.some(([alias, kind]) => alias === term && kind === "variant")) rank = 2;
      else if (record.key.startsWith(term)) rank = 3;
      else if (fuzzy && term.length >= 2 && term.length <= 48 && Math.abs(term.length - record.key.length) < 3) {
        cost = distance(term, record.key);
        if (cost <= (term.length < 6 ? 1 : 2)) rank = 4;
      }
      if (rank < 5) results.push({ key: record.key, word: preferredWord(record), rank, cost });
    }
    const kinds = ["exact", "form", "variant", "prefix", term ? "suggestion" : "filter"];
    results.sort((a, b) => a.rank - b.rank || a.cost - b.cost || a.key.localeCompare(b.key, "en"));
    return results.slice(0, limit).map(({ key, word, rank }) => ({ key, word, kind: kinds[rank] }));
  }

  function browseRecords(records, prefix, after, limit) {
    const matches = [...records].filter(row => row.key.startsWith(prefix) && compareKeys(row.key, after) > 0);
    matches.sort((a, b) => compareKeys(a.key, b.key));
    return browsePage(matches, limit);
  }

  function browsePage(rows, limit) {
    return {results:rows.slice(0, limit).map(record => ({
      word:record.groups ? preferredWord(record) : record.word, key:record.key, kind:"prefix"
    })), next:rows.length > limit ? rows[limit - 1].key : null};
  }

  function fuzzyPrefixes(term) {
    if (term.length < 2 || term.length > 48) return [];
    const prefixes = new Set([term.slice(0, 3), term[0] + term.slice(2, 4)]);
    for (let index = 0; index < Math.min(3, term.length - 1); index++) {
      prefixes.add((term.slice(0, index) + term[index + 1] + term[index] + term.slice(index + 2)).slice(0, 3));
    }
    return prefixes;
  }

  function compareKeys(a, b) {
    if (a === b) return 0;
    // SQLite binary UTF-8 and PostgreSQL C order Unicode code points.
    for (let offset = 0; offset < Math.min(a.length, b.length);) {
      const left = a.codePointAt(offset), right = b.codePointAt(offset);
      if (left !== right) return left - right;
      offset += left > 0xffff ? 2 : 1;
    }
    return a.length - b.length;
  }

  function starterAdapter(data) {
    const indexed = new Map(data.entries.map(record => [record.key, record]));
    return {
      name: "Starter collection",
      coverage:"starter",
      headwords:data.entries.length,
      sourceInfo: data.sources,
      browse:async (prefix, after, limit) => browseRecords(indexed.values(), key(prefix), key(after), limit),
      lookup: async word => indexed.get(key(word)) || null,
      search: async (word, { limit = 24, filters = {}, suggest = false } = {}) =>
        searchRows(indexed.values(), key(word), limit, filters, !suggest)
    };
  }

  async function request(url, options) {
    const response = await fetch(url, { cache: "no-store", ...options });
    if (!response.ok) throw Error(response.status === 404 ? "Unavailable" : "The server returned " + response.status);
    return response.json();
  }

  async function apiAdapter(base) {
    const health = await request(base + "health", { signal: AbortSignal.timeout(1500) });
    if (health.schema !== SCHEMA || !health.hasData) throw Error("Unavailable");
    return {
      name: health.edition || "Online dictionary",
      coverage:health.coverage || "partial",
      browse(prefix, after, limit) {
        return request(base + "browse?" + new URLSearchParams({prefix, after, limit}));
      },
      sourceInfo: await request(base + "sources"),
      async lookup(word, { scholarly = false } = {}) {
        const view = scholarly ? "?view=scholarly" : "";
        const response = await fetch(base + "lookup/" + encodeURIComponent(word) + view, { cache: "no-store" });
        if (response.status === 404) return null;
        if (!response.ok) throw Error("Online lookup failed");
        return response.json();
      },
      search(word, { limit = 24, filters = {}, suggest = false } = {}) {
        const params = new URLSearchParams({ q: word, limit, ...filters });
        return request(base + (suggest ? "suggest?" : "search?") + params);
      }
    };
  }

  let database;
  function openDatabase() {
    if (!database) {
      database = new Promise((resolve, reject) => {
        const open = indexedDB.open("open-dict-database", SCHEMA);
        open.onupgradeneeded = () => {
          const db = open.result;
          db.createObjectStore("entries", { keyPath: ["slot", "key"] });
          db.createObjectStore("aliases", { keyPath: ["slot", "term", "key"] });
          db.createObjectStore("typos", { keyPath: ["slot", "hint", "key"] });
          db.createObjectStore("meta");
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
        open.onblocked = () => reject(Error("Close other dictionary tabs and try again."));
      }).catch(error => {
        database = undefined;
        throw error;
      });
    }
    return database;
  }

  function result(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function complete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || Error("Storage transaction failed"));
    });
  }

  function typoHint(word) {
    return word.length >= 3 ? word[0] + word.slice(-1) : "";
  }

  async function offlineAdapter() {
    const db = await openDatabase();
    const active = await result(db.transaction("meta").objectStore("meta").get("active"));
    if (!active) return null;
    const { slot } = active;
    const bounds = (start, end) => IDBKeyRange.bound([slot, start], [slot, end]);
    async function lookup(word) {
      return await result(db.transaction("entries").objectStore("entries").get([slot, key(word)])) || null;
    }
    return {
      ...active, name: active.edition, sourceInfo: active.sources, lookup,
      coverage:active.coverage || (active.edition === "Essential English" ? "partial" : "unclassified"),
      async browse(prefix, after, limit) {
        prefix = key(prefix);
        after = key(after);
        const entries = db.transaction("entries").objectStore("entries");
        const lower = after && after >= prefix ? after : prefix;
        if (prefix && lower > prefix + MAX) return { results:[], next:null };
        const range = IDBKeyRange.bound([slot, lower], prefix ? [slot, prefix + MAX] : [slot, []], lower === after);
        const rows = await result(entries.getAll(range, limit + 1));
        return browsePage(rows, limit);
      }, boundedFilters:active.headwords > 450,
      async search(word, { limit = 24, filters = {}, suggest = false } = {}) {
        const term = key(word);
        const transaction = db.transaction(["entries", "aliases", "typos"]);
        const entries = transaction.objectStore("entries");
        const aliases = transaction.objectStore("aliases");
        const typos = transaction.objectStore("typos");
        const prefix = term || key(filters.beginning || "");
        const exactRequest = term ? result(entries.get([slot, term])) : null;
        const aliasRequest = term ? result(aliases.getAll(
          IDBKeyRange.bound([slot, term], [slot, term, []]), 100)) : [];
        const prefixRequest = result(entries.getAll(bounds(prefix, prefix + MAX), suggest ? 60 : 450));
        const nearbyRequest = !suggest && term.length >= 2
          ? result(entries.getAll(bounds(term.slice(0, 2), term.slice(0, 2) + MAX), 300)) : [];
        const hintedRequest = !suggest && typoHint(term) ? result(typos.getAll(
          IDBKeyRange.bound([slot, typoHint(term)], [slot, typoHint(term), []]), 600)) : [];
        const [exact, redirects, prefixed, nearby, hinted] =
          await Promise.all([exactRequest, aliasRequest, prefixRequest, nearbyRequest, hintedRequest]);
        const related = await Promise.all([...new Set([...redirects, ...hinted].map(row => row.key))].map(lookup));
        const candidates = new Map([exact, ...prefixed, ...nearby, ...related]
          .filter(Boolean).map(record => [record.key, record]));
        return searchRows(candidates.values(), term, limit, filters, !suggest);
      }
    };
  }

  function validFile(file, release, prefixes) {
    return file && new RegExp("^" + prefixes + "-[0-9]+\\.ndjson\\.gz$").test(file.path?.slice(release.length + 1)) &&
      file.path.startsWith(release + "/") && /^[a-f0-9]{64}$/.test(file.sha256) &&
      Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 16 * 1024 * 1024 &&
      Number.isSafeInteger(file.decodedBytes) && file.decodedBytes > 0 && file.decodedBytes <= 32 * 1024 * 1024 &&
      Number.isSafeInteger(file.entries) && file.entries > 0;
  }

  function rangesValid(files) {
    return files.every((file, index) => typeof file.firstKey === "string" && file.firstKey &&
      typeof file.lastKey === "string" && compareKeys(file.firstKey, file.lastKey) <= 0 &&
      (!index || compareKeys(files[index - 1].lastKey, file.firstKey) <= 0));
  }

  function validManifest(data) {
    if (!data || data.schema !== SCHEMA || !/^[\w][\w.-]{0,63}$/.test(data.release) ||
        !data.sources || !data.editions || typeof data.editions !== "object") {
      throw Error("This release uses an incompatible dictionary format.");
    }
    for (const edition of Object.values(data.editions)) {
      if (!Array.isArray(edition?.files) || !edition.files.length || edition.files.length > 12000 ||
          !Number.isSafeInteger(edition.headwords) || edition.headwords < 1 ||
          edition.files.some(file => !validFile(file, data.release, "(?:essential|complete|scholarly)")) ||
          new Set(edition.files.map(file => file.path)).size !== edition.files.length ||
          edition.files.reduce((sum, file) => sum + file.entries, 0) !== edition.headwords ||
          edition.files.reduce((sum, file) => sum + file.bytes, 0) !== edition.bytes) {
        throw Error("The dictionary release manifest is invalid.");
      }
    }
    return data;
  }

  async function publishedAdapter() {
    if (!globalThis.crypto?.subtle || !globalThis.DecompressionStream) return null;
    const data = validManifest(await request(RELEASES, {signal:AbortSignal.timeout(3000)}));
    const complete = data.editions["Complete English"];
    const scholarly = data.editions["Scholarly Research"];
    const forms = data.online?.aliases;
    if (!complete || !Array.isArray(forms) || !rangesValid(complete.files) ||
        !forms.every(file => validFile(file, data.release, "forms")) || !rangesValid(forms)) return null;
    const recent = new Map();
    function load(file) {
      let job = recent.get(file.path);
      if (!job) {
        job = fetch("data/releases/" + file.path, {cache:"no-store", signal:AbortSignal.timeout(20000)})
          .then(response => unpack(response, file))
          .then(records => {
            if (records.length !== file.entries) throw Error("An online dictionary file is incomplete.");
            return records;
          });
        job.catch(() => recent.delete(file.path));
      }
      recent.delete(file.path);
      recent.set(file.path, job);
      if (recent.size > 8) recent.delete(recent.keys().next().value);
      return job;
    }

    function covering(files, start, end = start) {
      return files.filter(file => compareKeys(file.lastKey, start) >= 0 && compareKeys(file.firstKey, end) <= 0);
    }

    async function lookup(word, options = {}) {
      const term = key(word);
      const files = options.scholarly && scholarly && rangesValid(scholarly.files) ? scholarly.files : complete.files;
      for (const file of covering(files, term)) {
        const match = (await load(file)).find(row => row.key === term);
        if (match) {
          if (!validateRecord(match, data.sources)) throw Error("An online record uses an invalid format.");
          return match;
        }
      }
      return null;
    }

    async function prefixRecords(prefix, after, limit, filters = {}) {
      const found = [];
      const start = compareKeys(after, prefix) > 0 ? after : prefix;
      for (const file of covering(complete.files, start, prefix + LAST_CODE_POINT)) {
        for (const row of await load(file)) {
          if (row.key.startsWith(prefix) && compareKeys(row.key, after) > 0 && matches(row, filters)) {
            found.push(row);
            if (found.length >= limit) return found;
          }
        }
      }
      return found;
    }

    return {
      name: data.coverage === "full" ? "Full published dictionary" : "Published subset",
      coverage:data.coverage || "partial", headwords:complete.headwords, sourceInfo:data.sources, lookup,
      async browse(prefix, after, limit) {
        return browsePage(await prefixRecords(key(prefix), key(after), limit + 1), limit);
      },
      async search(word, { limit = 24, filters = {}, suggest = false } = {}) {
        const term = key(word);
        const candidates = new Map();
        if (term) {
          for (const file of covering(forms, term)) {
            for (const alias of await load(file)) {
              if (alias.term !== term || candidates.has(alias.key)) continue;
              const row = await lookup(alias.key);
              if (row) candidates.set(row.key, row);
            }
          }
        }
        const prefix = term || key(filters.beginning || "");
        for (const row of await prefixRecords(prefix, "", limit + candidates.size, filters)) candidates.set(row.key, row);
        if (term && !suggest && !candidates.size) {
          for (const prefix of fuzzyPrefixes(term)) {
            for (const row of await prefixRecords(prefix, "", 250, filters)) candidates.set(row.key, row);
          }
        }
        return searchRows(candidates.values(), term, limit, filters, !suggest);
      }
    };
  }

  async function manifest() {
    return validManifest(await request(RELEASES));
  }

  async function unpack(response, file) {
    if (!response.ok || !response.body) throw Error("A pack file could not be downloaded.");
    const reader = response.body.getReader();
    const bytes = new Uint8Array(file.bytes);
    let offset = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (offset + value.length > bytes.length) throw Error("A pack file exceeded its declared size.");
        bytes.set(value, offset);
        offset += value.length;
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    if (offset !== file.bytes || digest !== file.sha256) throw Error("A pack file failed integrity verification.");

    const decoded = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
    const text = new TextDecoder("utf-8", { fatal: true });
    let length = 0;
    let jsonl = "";
    try {
      while (true) {
        const { value, done } = await decoded.read();
        if (done) break;
        length += value.length;
        if (length > file.decodedBytes) throw Error("A pack file exceeded its decoded size.");
        jsonl += text.decode(value, { stream: true });
      }
    } finally {
      await decoded.cancel().catch(() => {});
    }
    if (length !== file.decodedBytes) throw Error("A pack file is incomplete.");
    return (jsonl + text.decode()).trimEnd().split("\n").map(line => JSON.parse(line));
  }

  function validateRecord(record, sources) {
    return record && typeof record.word === "string" && record.word &&
      typeof record.key === "string" && record.key && key(record.word) === record.key &&
      Array.isArray(record.groups) && record.groups.length &&
      record.groups.every(group => typeof group.word === "string" && key(group.word) === record.key &&
        /^[a-f0-9]{28}$/.test(group.id) && typeof group.pos === "string" &&
        Object.hasOwn(sources, group.source) && Array.isArray(group.senses) && group.senses.length &&
        group.senses.every(sense => /^[a-f0-9]{28}$/.test(sense.id) && typeof sense.definition === "string")) &&
      Array.isArray(record.aliases) && record.aliases.every(alias => Array.isArray(alias) &&
        typeof alias[0] === "string" && ["form", "variant"].includes(alias[1]));
  }

  function deleteStagedEntries(transaction, slot) {
    const range = IDBKeyRange.bound([slot], [slot, []]);
    for (const name of ["entries", "aliases", "typos"]) transaction.objectStore(name).delete(range);
  }

  async function removeSlot(db, slot) {
    const transaction = db.transaction(["entries", "aliases", "typos", "meta"], "readwrite");
    const finished = complete(transaction);
    deleteStagedEntries(transaction, slot);
    transaction.objectStore("meta").delete(STAGE_PREFIX + slot);
    await finished;
  }

  async function beginStage(db, slot) {
    const transaction = db.transaction(["entries", "aliases", "typos", "meta"], "readwrite");
    const finished = complete(transaction);
    const meta = transaction.objectStore("meta");
    const start = result(meta.get("active"));
    const now = Date.now();
    meta.put(now, STAGE_PREFIX + slot);
    const old = meta.openCursor(IDBKeyRange.bound(STAGE_PREFIX, STAGE_PREFIX + MAX));
    old.onsuccess = () => {
      const item = old.result;
      if (!item) return;
      if (item.value < now - STALE_STAGE_MS) {
        deleteStagedEntries(transaction, item.key.slice(STAGE_PREFIX.length));
        item.delete();
      }
      item.continue();
    };
    const [active] = await Promise.all([start, finished]);
    return active;
  }

  async function installPack(data, edition, progress, signal) {
    validManifest(data);
    if (!globalThis.crypto?.subtle || !globalThis.DecompressionStream) {
      throw Error("Verified downloads require a recent browser and a secure connection.");
    }
    const pack = data.editions[edition];
    if (!Object.hasOwn(data.editions, edition)) throw Error("This edition is unavailable.");
    const db = await openDatabase();
    const slot = crypto.randomUUID();
    const start = await beginStage(db, slot);
    let count = 0;
    try {
      const estimate = await navigator.storage?.estimate?.().catch(() => null);
      const decodedBytes = pack.files.reduce((sum, file) => sum + file.decodedBytes, 0);
      if (estimate?.quota && estimate.quota - (estimate.usage || 0) < decodedBytes) {
        throw Error("There is insufficient browser storage for this pack.");
      }
      await navigator.storage?.persist?.().catch(() => {});
      for (const file of pack.files) {
        const records = await unpack(await fetch("data/releases/" + file.path, { cache: "no-store", signal }), file);
        if (records.length !== file.entries || records.some(record => !validateRecord(record, data.sources))) {
          throw Error("A pack file contained invalid dictionary records.");
        }
        const transaction = db.transaction(["entries", "aliases", "typos", "meta"], "readwrite");
        const finished = complete(transaction);
        transaction.objectStore("meta").put(Date.now(), STAGE_PREFIX + slot);
        for (const record of records) {
          transaction.objectStore("entries").add({ ...record, slot });
          for (const [term] of record.aliases) {
            transaction.objectStore("aliases").put({ slot, term, key: record.key });
          }
          const hint = typoHint(record.key);
          if (hint) transaction.objectStore("typos").put({ slot, hint, key: record.key });
        }
        await finished;
        count += records.length;
        progress(count, pack.headwords);
      }
      if (signal?.aborted) throw Error("Download cancelled.");
      const transaction = db.transaction("meta", "readwrite");
      const finished = complete(transaction);
      const meta = transaction.objectStore("meta");
      let previous;
      let superseded = false;
      meta.get("active").onsuccess = event => {
        const active = event.target.result;
        if (active?.slot !== start?.slot) {
          superseded = true;
          transaction.abort();
          return;
        }
        meta.put({ slot, edition, release: data.release, sources: data.sources, headwords: pack.headwords,
          coverage:edition === "Essential English" ? "partial" : data.coverage || "unclassified" }, "active");
        meta.delete(STAGE_PREFIX + slot);
        meta.get("previous").onsuccess = older => { previous = older.target.result; };
        if (active) meta.put(active, "previous");
      };
      try {
        await finished;
      } catch (error) {
        if (superseded) throw Error("Another tab installed a pack. Reload to use that edition.");
        throw error;
      }
      if (previous) await removeSlot(db, previous.slot).catch(() => {});
    } catch (error) {
      await removeSlot(db, slot).catch(() => {});
      throw error;
    }
  }

  window.OpenDictionary = { key, starterAdapter, apiAdapter, publishedAdapter, offlineAdapter, manifest, installPack, presentationOrder };
})();
