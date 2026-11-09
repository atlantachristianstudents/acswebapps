// Keep legacy backup fields compatible; all replay recordings are retained.
let replayRetentionLimit = 0;
let historyStorageMessage = '';
function applyReplayRetention(entries) {
  return entries;
}
function saveTypingHistory() {
  try {
    localStorage.setItem('logostype-history', JSON.stringify(history));
    historyStorageMessage = ''; return true;
  } catch {
    historyStorageMessage = 'History could not be saved. Browser storage may be full. Export a backup to keep a copy.';
    const notice = $('#historyStorageNotice');
    if (notice) notice.textContent = historyStorageMessage;
    return false;
  }
}
