let replayRetentionLimit = 0;
let historyStorageMessage = '';
let pendingHistoryCleanup = null;
try {
  const saved = Number(localStorage.getItem('logostype-replay-limit'));
  if (Number.isSafeInteger(saved) && saved >= 0 && saved <= 1000000) replayRetentionLimit = saved;
} catch {}
function applyReplayRetention(entries, limit) {
  if (!limit) return entries;
  const recorded = entries.map((result, index) => ({ result, index }))
    .filter(({ result }) => result.replay || result.raceReplay)
    .sort((a, b) => {
      const first = historyResultDate(a.result).getTime(), second = historyResultDate(b.result).getTime();
      return (Number.isFinite(first) && Number.isFinite(second) ? second - first : 0) || a.index - b.index;
    });
  const keep = new Set(recorded.slice(0, limit).map(entry => entry.index));
  return entries.map((result, index) => {
    if ((!result.replay && !result.raceReplay) || keep.has(index)) return result;
    const { replay, raceReplay, ...summary } = result;
    return summary;
  });
}
function saveTypingHistory() {
  const retained = applyReplayRetention(history, replayRetentionLimit);
  try {
    localStorage.setItem('logostype-history', JSON.stringify(retained));
    history = retained; historyStorageMessage = ''; return true;
  } catch {
    historyStorageMessage = 'History could not be saved. Export a backup and remove older replay recordings to free space.';
    const notice = $('#historyStorageNotice');
    if (notice) notice.textContent = historyStorageMessage;
    return false;
  }
}
function renderHistoryStorage() {
  const count = history.filter(result => result.replay || result.raceReplay).length;
  return '<button class="option" data-open="settings">← settings</button><h2>history and replay storage</h2>' +
    '<p>' + history.length + ' results · ' + count + ' recordings. Removing recordings keeps scores, records, and speed charts.</p>' +
    '<label for="replayRetentionRange">keep replay recordings</label><input id="replayRetentionRange" type="range" min="0" max="' + Math.max(1000, replayRetentionLimit, count) + '" step="1" value="' + replayRetentionLimit + '">' +
    '<label for="replayRetention">number of newest recordings (0 keeps all)</label><input class="race-field" id="replayRetention" type="number" min="0" max="1000000" step="1" value="' + replayRetentionLimit + '">' +
    '<output id="replayRetentionPreview" for="replayRetention replayRetentionRange">' + (replayRetentionLimit ? 'Keep the newest ' + replayRetentionLimit + ' recordings.' : 'Keep all recordings.') + '</output>' +
    '<button class="option" id="applyReplayRetention">apply retention</button>' +
    '<p id="historyStorageNotice" role="status">' + escapeHtml(historyStorageMessage) + '</p>' +
    '<button class="option" id="deleteAllHistory">delete all typing history</button>';
}
function confirmHistoryCleanup(title, message, action) {
  pendingHistoryCleanup = action;
  $('#historyCleanupTitle').textContent = title;
  $('#historyCleanupMessage').textContent = message;
  if (!$('#historyCleanupDialog').open) $('#historyCleanupDialog').showModal();
  $('#cancelHistoryCleanup').focus();
}
$('#cancelHistoryCleanup').onclick = () => { pendingHistoryCleanup = null; $('#historyCleanupDialog').close(); };
$('#historyCleanupDialog').addEventListener('cancel', () => { pendingHistoryCleanup = null; });
$('#confirmHistoryCleanup').onclick = () => {
  const action = pendingHistoryCleanup; pendingHistoryCleanup = null;
  $('#historyCleanupDialog').close(); if (action) action();
};
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.deleteHistoryIndex !== undefined) {
    const selected = history[Number(button.dataset.deleteHistoryIndex)];
    if (!selected) return;
    confirmHistoryCleanup('delete this result?', historyDescription(selected) + '. Its score, chart, and replay will be removed.', () => {
      const previous = history;
      let index = history.indexOf(selected);
      if (index < 0) index = history.findIndex(result => historyKey(result) === historyKey(selected));
      if (index < 0) return;
      history = history.filter((result, position) => position !== index);
      if (!saveTypingHistory()) history = previous;
      openModal('history');
    });
  }
  if (button.id === 'deleteAllHistory') {
    confirmHistoryCleanup('delete all typing history?', 'Delete all ' + history.length + ' typing results, records, charts, and replays? Journey progress and completion records are kept. Export a backup first to keep a copy.', () => {
      const previous = history; history = [];
      if (!saveTypingHistory()) history = previous;
      openModal('history');
    });
  }
  if (button.id === 'applyReplayRetention') {
    const limit = Number($('#replayRetention').value);
    if (!$('#replayRetention').value.trim() || !Number.isSafeInteger(limit) || limit < 0 || limit > 1000000) {
      $('#historyStorageNotice').textContent = 'Enter a whole number from 0 to 1,000,000. Zero keeps all recordings.';
      return;
    }
    const before = history.filter(result => result.replay || result.raceReplay).length;
    const removed = limit ? Math.max(0, before - limit) : 0;
    confirmHistoryCleanup('apply replay retention?', 'Remove ' + removed + ' older recordings and keep ' + (limit ? 'the newest ' + limit : 'all recordings') + ' from now on? Scores and charts are kept.', () => {
      const previousLimit = replayRetentionLimit;
      try {
        localStorage.setItem('logostype-replay-limit', String(limit));
        replayRetentionLimit = limit;
        if (!saveTypingHistory()) throw new Error('History storage unavailable');
      } catch {
        replayRetentionLimit = previousLimit;
        try { localStorage.setItem('logostype-replay-limit', String(previousLimit)); } catch {}
        historyStorageMessage = 'Could not update replay retention in this browser.';
      }
      openModal('historyStorage');
    });
  }
});

document.addEventListener('input', event => {
  if (!['replayRetention', 'replayRetentionRange'].includes(event.target.id)) return;
  const limit = Number(event.target.value);
  if (!event.target.value.trim() || !Number.isSafeInteger(limit) || limit < 0 || limit > 1000000) {
    $('#historyStorageNotice').textContent = 'Enter a whole number from 0 to 1,000,000. Zero keeps all recordings.';
    return;
  }
  $('#historyStorageNotice').textContent = '';
  $('#replayRetention').value = String(limit);
  const range = $('#replayRetentionRange');
  range.max = String(Math.max(Number(range.max) || 1000, limit));
  range.value = String(limit);
  $('#replayRetentionPreview').textContent = limit ? 'Keep the newest ' + limit + ' recordings.' : 'Keep all recordings.';
});
