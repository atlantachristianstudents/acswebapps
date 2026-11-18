/* Runtime/PWA integration tests against a dedicated local Chromium DevTools port. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const base = process.argv[2] || "http://127.0.0.1:8765/apps/define/";
const devtools = process.argv[3] || "http://127.0.0.1:8767";
const full = process.env.OPEN_DICT_FULL_BROWSER === "1";
const tab = await fetch(devtools + "/json/new?about:blank", { method:"PUT" }).then(response => response.json());
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once:true });
  socket.addEventListener("error", reject, { once:true });
});

let number = 0;
const pending = new Map();
const scriptErrors = [];
let interceptFailure;
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    if (message.error) reject(Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") scriptErrors.push(message.params.exceptionDetails);
  if (message.method === "Fetch.requestPaused") {
    send("Fetch.fulfillRequest", {
      requestId:message.params.requestId, responseCode:200,
      responseHeaders:[{name:"Content-Type",value:"application/gzip"}],
      body:Buffer.from("wrong file").toString("base64")
    }).catch(error => { interceptFailure = error; });
  }
});

function send(method, params = {}) {
  const id = ++number;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error("DevTools timed out for " + method));
    }, 10000);
    pending.set(id, {resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params}));
  });
}

async function evaluate(expression) {
  const reply = await send("Runtime.evaluate", {expression,returnByValue:true,awaitPromise:true});
  if (reply.exceptionDetails) throw Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
  return reply.result.value;
}

async function waitFor(expression, label, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression).catch(() => false)) return;
    await delay(timeout > 60000 ? 500 : 75);
  }
  throw Error("Timed out waiting for " + label + ". Page text: " +
    await evaluate("document.body?.innerText.slice(0, 900)").catch(() => "(unavailable)"));
}

async function click(label, selector = "button") {
  assert.equal(await evaluate(`(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find(button => button.textContent.trim() === ${JSON.stringify(label)});
    if (!target) return false;
    target.click();
    return true;
  })()`), true, label);
}

async function navigate(hash = "") {
  await send("Page.navigate", {url:base + hash});
}

async function pressKey(key, code) {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", {type, key, code:key, windowsVirtualKeyCode:code});
  }
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Page.navigate", {url:base + "?browser-test=" + Date.now() + "#home"});
  await waitFor("document.querySelector('#content h2')?.textContent === 'Word of the day'", "homepage");
  await waitFor("Boolean(navigator.serviceWorker?.controller)", "scoped worker control");
  await waitFor(`new Promise(resolve => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return resolve(false);
    const channel = new MessageChannel();
    const timer = setTimeout(() => {channel.port1.close(); resolve(false);}, 250);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data.version === document.querySelector('#acswebapps-updater').dataset.version);
    };
    worker.postMessage({type:'ACS_GET_VERSION'}, [channel.port2]);
  })`, "matching app shell and service worker");
  assert.equal(await evaluate("navigator.serviceWorker.controller.scriptURL"), base + "sw.js");
  if (!(await evaluate("Boolean(document.querySelector('.daily .lookup-word'))"))) {
    await send("Page.reload", {ignoreCache:false});
    await waitFor("Boolean(document.querySelector('.daily .lookup-word'))", "clickable words in the updated shell");
  }

  if (full) {
    await waitFor("document.querySelector('#coverage-status')?.innerText.includes('Full published dictionary')", "full static data");
    await navigate("#word=syzygy");
    await waitFor("document.querySelector('.word-title')?.textContent === 'syzygy'", "rare static lookup");
    await navigate("#browse=sy");
    await waitFor("document.querySelectorAll('.result-list li').length === 24", "full prefix page");
    const first = await evaluate("document.querySelector('.result-list a').textContent");
    await click("Next page", "a");
    await waitFor(`document.querySelector('.result-list a')?.textContent !== ${JSON.stringify(first)}`, "distinct second prefix page");
    await navigate("#home");
    await waitFor("Boolean(document.querySelector('.daily'))", "home return");
  }

  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true}))`);
  assert.equal(await evaluate("document.activeElement.id"), "search");
  await evaluate(`(() => {const input=document.querySelector('#search'); input.value='bank'; input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await waitFor("document.querySelector('#search').getAttribute('aria-expanded') === 'true'", "autocomplete");
  await evaluate(`document.querySelector('#search').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))`);
  assert.equal(await evaluate("document.querySelector('#search').getAttribute('aria-activedescendant')"), "suggestion-0");
  await evaluate(`document.querySelector('#search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  await waitFor("document.querySelector('.word-title')?.textContent === 'bank'", "keyboard lookup");
  if (await evaluate("document.querySelector('[data-mode]').getAttribute('aria-pressed') === 'true'")) {
    await click("Scholarly mode");
    await waitFor("document.querySelector('[data-mode]').getAttribute('aria-pressed') === 'false'", "simple mode");
  }
  const bankHash = await evaluate("location.hash");
  assert.equal(await evaluate(`(() => {
    const words = [...document.querySelectorAll('#content .definition .lookup-word')];
    const take = words.find(node => node.textContent === 'take');
    take?.focus();
    return Boolean(take && take === document.activeElement);
  })()`), true);
  await pressKey("Enter", 13);
  await waitFor(`document.querySelector('#quick-lookup').open &&
    document.querySelector('#quick-word').textContent === 'take' &&
    Boolean(document.querySelector('#quick-definitions .definition .lookup-word'))`, "keyboard quick definition");
  assert.equal(await evaluate("location.hash"), bankHash);
  assert.equal(await evaluate("document.querySelector('.word-title').textContent"), "bank");
  const nextWord = await evaluate(`(() => {
    const next = document.querySelector('#quick-definitions .definition .lookup-word');
    const word = next.textContent;
    next.click();
    return word;
  })()`);
  await waitFor(`document.querySelector('#quick-word').textContent === ${JSON.stringify(nextWord)} &&
    !document.querySelector('#quick-definitions').textContent.startsWith('Looking up')`, "nested quick definition");
  await pressKey("Escape", 27);
  await waitFor(`!document.querySelector('#quick-lookup').open &&
    document.activeElement.matches('#content .lookup-word') &&
    document.activeElement.textContent === 'take'`, "return focus to the selected word");
  assert.equal(await evaluate(`Boolean(document.querySelector('#content blockquote.example .lookup-word')) &&
    [...document.querySelectorAll('#content details')].some(node =>
      node.querySelector('summary')?.textContent === 'Etymology' && node.querySelector('.lookup-word'))`), true);
  const sense = await evaluate("document.querySelector('.sense-actions a').getAttribute('href')");
  await navigate(sense);
  await waitFor("Boolean(document.querySelector('.sense-list .selected'))", "sense permalink");
  await click("Scholarly mode");
  await waitFor(`document.querySelector('#content').innerText.includes('Open English WordNet') &&
    document.querySelector('[data-mode]').getAttribute('aria-pressed') === 'true' &&
    Boolean(document.querySelector('.sense-list .selected'))`, "scholarly mode preserves sense");
  await navigate("#compare=affect&with=effect");
  await waitFor("document.querySelectorAll('.compare-grid > section').length === 2", "word comparison");
  assert.equal(await evaluate(`[...document.querySelectorAll('.compare-grid > section')].every(node =>
    node.querySelector('.definition .lookup-word'))`), true);
  await send("Page.getNavigationHistory").then(async history => {
    const entry = history.entries[history.currentIndex - 1];
    await send("Page.navigateToHistoryEntry", {entryId:entry.id});
  });
  await waitFor("document.querySelector('.word-title')?.textContent === 'bank'", "back navigation");
  await navigate("#word=bnak");
  await waitFor(`document.querySelector('.result-list')?.innerText.includes('Suggested spelling')`, "typo suggestion");

  await send("Emulation.setDeviceMetricsOverride", {width:375,height:812,deviceScaleFactor:1,mobile:true});
  await navigate("#word=colour");
  await waitFor("document.querySelector('.word-title')?.textContent === 'colour'", "mobile entry");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
  await evaluate("document.querySelector('#content .definition .lookup-word').click()");
  await waitFor("document.querySelector('#quick-lookup').open", "mobile quick definition");
  assert.equal(await evaluate("document.querySelector('#quick-lookup').getBoundingClientRect().width < window.innerWidth"), true);
  await click("Close", "#quick-lookup button");
  await waitFor("!document.querySelector('#quick-lookup').open", "close mobile definition");
  await send("Emulation.clearDeviceMetricsOverride");
  await navigate("#offline");
  await waitFor("document.querySelector('.section-title')?.textContent === 'Offline dictionary'", "offline controls");
  const release = await evaluate("fetch('data/releases/manifest.json',{cache:'no-store'}).then(response=>response.json()).then(data=>data.release)");
  const label = JSON.stringify("Installed: Complete English · " + release);
  const active = `document.querySelector('#content').innerText.includes(${label})`;
  if (full && await evaluate(active)) {
    console.log("Reusing the verified Complete pack for this release.");
  } else {
    await click("Check for data packs");
    await waitFor(`[...document.querySelectorAll('.pack-list h3')].some(node => node.textContent === 'Complete English')`, "pack manifest");
    const beforeInstall = await evaluate("navigator.storage.estimate().then(data => data.usage)");
    const started = Date.now();
    assert.equal(await evaluate(`(() => {
      const card=[...document.querySelectorAll('.pack-list section')].find(node => node.querySelector('h3').textContent === 'Complete English');
      card?.querySelector('button')?.click();return Boolean(card);
    })()`), true);
    await waitFor(active, "verified pack installation", full ? 600000 : 15000);
    if (full) {
      const installed = await evaluate("navigator.storage.estimate().then(data => data.usage)");
      console.log(`Complete pack installed in ${((Date.now()-started)/1000).toFixed(1)} s. Browser storage increased by about ${installed-beforeInstall} bytes.`);
    }
  }
  await click("Check for data packs");
  await waitFor(`document.querySelector('.pack-list')?.innerText.includes('Essential English')`, "alternate edition");
  await send("Fetch.enable", {patterns:[{urlPattern:"*essential-*.ndjson.gz",requestStage:"Request"}]});
  await click("Download", ".pack-list button");
  await waitFor(`document.querySelector('#content').innerText.includes('failed integrity verification')`, "failed integrity check");
  assert.equal(interceptFailure, undefined);
  await send("Fetch.disable");
  await send("Network.emulateNetworkConditions", {offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await send("Network.clearBrowserCache");
  await navigate("#word=bank");
  await waitFor("location.hash === '#word=bank'", "URL update before offline reload");
  await send("Page.reload", {ignoreCache:false});
  await waitFor(`document.querySelector('.word-title')?.textContent === 'bank' &&
    document.querySelector('.entry-heading').innerText.includes('Complete English')`, "disconnected launch and lookup");
  assert.equal(await evaluate("fetch('data/releases/manifest.json',{cache:'no-store'}).then(()=>false,()=>true)"), true);
  await click("take", "#content .definition .lookup-word");
  await waitFor(`document.querySelector('#quick-word').textContent === 'take' &&
    Boolean(document.querySelector('#quick-definitions .definition'))`, "quick definition from the installed pack");
  await click("Open full entry", "#quick-entry");
  await waitFor(`!document.querySelector('#quick-lookup').open &&
    document.querySelector('.word-title')?.textContent === 'take' &&
    document.querySelector('.entry-heading').innerText.includes('Complete English')`, "open the offline full entry");
  await navigate("#word=bank");
  await waitFor("document.querySelector('.word-title')?.textContent === 'bank'", "return to the offline entry");
  assert.equal(await evaluate("[...document.querySelectorAll('summary')].some(node=>node.textContent==='Etymology')"), true);
  await evaluate("document.querySelector('audio').load()");
  await waitFor("document.querySelector('audio').duration > 0", "offline sourced pronunciation decodes");
  await navigate("#word=colour");
  await waitFor(`document.querySelector('.word-title')?.textContent === 'colour' &&
    [...document.querySelectorAll('aside a')].some(node => node.textContent === 'color' &&
      node.closest('li').textContent.includes('Spelling variant'))`, "offline alternate spelling");
  await click("color", "aside a");
  await waitFor("document.querySelector('.word-title')?.textContent === 'color'", "offline cross-reference");
  if (full) {
    await navigate("#word=pneumonoultramicroscopicsilicovolcanoconiosis");
    await waitFor(`document.querySelector('.word-title')?.textContent === 'pneumonoultramicroscopicsilicovolcanoconiosis' &&
      document.querySelector('.entry-heading').innerText.includes('Complete English')`, "rare disconnected lookup");
  }
  await navigate("#word=unlisted-test-headword");
  await waitFor("document.querySelector('.section-title')?.textContent.startsWith('No exact entry')", "offline missing word state");
  assert.deepEqual(scriptErrors, []);
  if (process.env.OPEN_DICT_SCREENSHOT) {
    await navigate("#home");
    await waitFor("Boolean(document.querySelector('.daily'))", "homepage screenshot");
    await send("Emulation.setDeviceMetricsOverride", {width:1200,height:900,deviceScaleFactor:1,mobile:false});
    const image = await send("Page.captureScreenshot", {format:"png"});
    await writeFile(process.env.OPEN_DICT_SCREENSHOT, Buffer.from(image.data,"base64"));
  }
  console.log("Browser passed homepage, keyboard autocomplete, quick definitions, sense links, scholarly mode, comparison, history, mobile layout, pack integrity and disconnected lookup.");
} finally {
  await send("Network.emulateNetworkConditions", {offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(() => {});
  socket.close();
  await fetch(devtools + "/json/close/" + tab.id).catch(() => {});
}
