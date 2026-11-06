let scriptureText = "";

async function fetchScriptureText() {
  const response = await fetch(
    "https://cors.tools/https://cdn.r2upload.io/da84b4ce-b466-4a7b-a031-4dec1f22a566/hidden/adless/RcV",
  );

  if (!response.ok) {
    throw new Error("Could not download scripture text");
  }

  scriptureText = await response.text();
}

async function loadScripture(forceRefresh = false) {
  const CACHE_KEY = "logostype-scripture-v1";
  const FETCH_DATE_KEY = "logostype-scripture-last-fetch";
  const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

  let text = null;
  let lastFetch = 0;

  // 1. Read last fetch timestamp
  try {
    lastFetch = Number(localStorage.getItem(FETCH_DATE_KEY)) || 0;
  } catch (error) {
    console.warn("Could not read fetch timestamp:", error);
  }

  // 2. Check cache age
  const cacheExpired = !lastFetch || Date.now() - lastFetch > FIFTEEN_DAYS;

  // 3. Try IndexedDB if cache is still fresh
  if (!forceRefresh && !cacheExpired && window.indexedDB) {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("logostype-database", 1);

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("scripture")) {
            request.result.createObjectStore("scripture");
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      text = await new Promise((resolve, reject) => {
        const transaction = db.transaction("scripture", "readonly");
        const request = transaction.objectStore("scripture").get(CACHE_KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => db.close();
      });
    } catch (error) {
      console.warn("IndexedDB unavailable:", error);
    }
  }

  // 4. Try localStorage if needed
  if (!text && !forceRefresh && !cacheExpired) {
    try {
      text = localStorage.getItem(CACHE_KEY);
    } catch (error) {
      console.warn("localStorage unavailable:", error);
    }
  }

  // 5. Download if missing, expired, or manually refreshed
  const downloaded = !text || forceRefresh || cacheExpired;

  if (downloaded) {
    console.log("Downloading fresh Scripture...");
    await fetchScriptureText();
    text = scriptureText;
  } else {
    console.log("Using cached Scripture.");
  }

  // 6. Validate text
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Scripture text is empty or invalid");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.replace(/\p{P}/gu, "").trim());

  if (scriptureReferences.length !== lines.length) {
    throw new Error(`Scripture verse count mismatch: expected ${scriptureReferences.length}, received ${lines.length}`);
  }

  // 7. Save valid text in IndexedDB
  if (downloaded) {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("logostype-database", 1);

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("scripture")) {
            request.result.createObjectStore("scripture");
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise((resolve, reject) => {
        const transaction = db.transaction("scripture", "readwrite");

        transaction.objectStore("scripture").put(text, CACHE_KEY);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });

      db.close();
    } catch (error) {
      console.warn("IndexedDB save failed:", error);
    }

    // 8. Save localStorage backup and fetch timestamp
    try {
      localStorage.setItem(CACHE_KEY, text);
      localStorage.setItem(FETCH_DATE_KEY, String(Date.now()));
    } catch (error) {
      console.warn("localStorage save failed:", error);
    }

    console.log("Scripture cache updated.");
  }

  return lines;
}
