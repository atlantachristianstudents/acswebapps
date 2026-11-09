const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const stored = new Map([['logostype-replay-limit', '1']]);
let fail = false;
const notice = {};
const context = vm.createContext({
  history: Array.from({length: 3}, (_, index) => ({id: String(index), replay: {saved: true}, raceReplay: {saved: true}})),
  localStorage: {getItem: key => stored.get(key), setItem(key, value) {if (fail) throw Error('full'); stored.set(key, value);}},
  $: () => notice,
});
const source = fs.readFileSync(path.join(root, 'history-store.js'), 'utf8');
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
assert.equal(run('replayRetentionLimit'), 0, 'legacy limits are disabled');
assert.equal(run('applyReplayRetention(history, 1)'), context.history, 'legacy backup limits cannot trim recordings');
assert.equal(run('saveTypingHistory()'), true);
assert.equal(JSON.parse(stored.get('logostype-history')).filter(result => result.replay && result.raceReplay).length, 3);
fail = true;
assert.equal(run('saveTypingHistory()'), false);
assert.equal(context.history.length, 3, 'failed saves preserve all results');
assert(notice.textContent.includes('Export a backup'));
for (const file of ['app.js', 'history-store.js', 'index.html']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/data-delete-history-index|deleteHistoryIndex|deleteAllHistory|applyReplayRetention["']|historyCleanupDialog/.test(text), file + ' exposes no partial deletion controls');
}
const data = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
assert(data.includes('const retainedLimit=0;'), 'imports ignore old retention preferences');
assert(data.includes("$('#clearData')") || data.includes("button.id==='clearData'") || data.includes("id==='clearData'"), 'clear all remains available');
console.log('History storage checks passed: no partial deletion controls, legacy retention disabled, all recordings saved, storage failures preserve data, clear all retained.');
