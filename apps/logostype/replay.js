// Store edits rather than full input snapshots, keeping long attempts compact.
function recordReplayEdit(before, after) {
  if (!start || before === after) return;
  let at = 0, suffix = 0;
  while (at < before.length && at < after.length && before[at] === after[at]) at++;
  while (suffix < before.length - at && suffix < after.length - at &&
      before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  attemptReplayEvents.push({ time: Math.max(0, Date.now() - start), at,
    remove: before.length - at - suffix, text: after.slice(at, after.length - suffix) });
}
function captureAttemptReplay() {
  return { target, rawTarget, events: attemptReplayEvents.map(event => ({ ...event })),
    durationMs: Math.max(sampleTimes.length ? sampleTimes[sampleTimes.length - 1] * 1000 : 0,
      attemptReplayEvents.length ? attemptReplayEvents[attemptReplayEvents.length - 1].time : 0),
    references: [...testReferences], sourceRanges: testSourceRanges.map(source => ({ ...source })) };
}
function currentReplayResult() {
  const replay = captureAttemptReplay();
  return { mode, limit, punctuation, capitalization, date: new Date(start + replay.durationMs).toLocaleString(), replay };
}
function replayValueAt(events, time) {
  let value = '';
  for (const event of events) {
    if (event.time > time) break;
    value = value.slice(0, event.at) + event.text + value.slice(event.at + event.remove);
  }
  return value;
}
// Precompute edit readings once; playback and scrubbing share the live WPM rules.
function buildReplayReadings(data) {
  let value = '', previousLength = 0, hits = [];
  return data.events.map(event => {
    value = value.slice(0, event.at) + event.text + value.slice(event.at + event.remove);
    const parsed = parseTyping(value, false, data.target);
    const entered = parsed.text.slice(0, data.target.length);
    hits = hits.filter(hit => hit.position < entered.length && event.time - hit.time < 3000);
    for (let index = previousLength; index < entered.length; index++) {
      if (entered[index] === data.target[index]) hits.push({ time: event.time, position: index });
    }
    previousLength = entered.length;
    return { time: event.time, length: entered.length,
      correct: averageCorrectCharacters(data.target, entered, parsed.spaceTypos),
      hitTimes: hits.map(hit => hit.time) };
  });
}
function replaySpeedsAt(readings, time) {
  let low = 0, high = readings.length - 1, reading;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (readings[middle].time <= time) { reading = readings[middle]; low = middle + 1; }
    else high = middle - 1;
  }
  if (!reading || time <= 0 || reading.length < 2) return { average: 0, instant: 0 };
  const hits = reading.hitTimes.filter(hit => time - hit < 3000).length;
  return { average: Math.round(reading.correct / 5 * 60000 / time),
    instant: Math.round(hits / 5 * 60000 / Math.min(3000, time)) };
}
function openRaceReplay(result, index) {
  if (result?.raceReplay) openAttemptReplay(result, index, validateRaceReplay(result.raceReplay).participants);
}
function openAttemptReplay(result, index, racers = null) {
  if (!result?.replay && !racers) return;
  const participants = racers || [{ name: '', replay: result.replay }];
  const sessions = participants.map((player, index) => ({ ...player, index,
    readings: player.replay ? buildReplayReadings(player.replay) : [] }));
  const durationMs = sessions.reduce((max, player) => Math.max(max, player.replay?.durationMs || 0), 0);
  const suffix = index => index ? String(index) : '';
  const content = $('#modalContent');
  content.innerHTML = (Number.isInteger(index)
    ? '<button class="option" data-history-index="' + index + '">← typing result</button>'
    : '<button class="option" id="closeAttemptReplay">← results</button>') +
    '<h2>' + (racers ? 'race replay · all participants' : 'attempt replay') + '</h2>' +
    sessions.map(player => {
      const key = suffix(player.index);
      const heading = racers ? '<h3>' + escapeHtml(player.name) + (player.gaveUp ? ' · gave up' : player.completed && player.place ? ' · #' + player.place : ' · unfinished') + '</h3>' : '';
      if (!player.replay) return '<section class="race-replay-participant">' + heading + '<p>Recording unavailable for this participant.</p></section>';
      return '<section class="race-replay-participant">' + heading +
        '<div class="replay-live-stats" aria-live="off"><div>average WPM <strong id="attemptReplayAverage' + key + '">0</strong></div><div>instant WPM (last 3s) <strong id="attemptReplayInstant' + key + '">0</strong></div></div>' +
        (racers ? '<div class="race-track"><i id="attemptReplayProgress' + key + '"></i></div>' : '') +
        '<div class="words attempt-replay-words" id="attemptReplayWords' + key + '" aria-label="Recorded typing attempt' + (racers ? ': ' + escapeHtml(player.name) : '') + '"></div></section>';
    }).join('') +
    '<label for="attemptReplaySeek">replay position</label><input id="attemptReplaySeek" type="range" min="0" step="any" max="' + durationMs + '" value="0">' +
    '<p id="attemptReplayTime" aria-live="off"></p><div class="records-controls"><button class="option" id="attemptReplayPlay">pause</button>' +
    '<button class="option" id="attemptReplayRestart">replay from start</button></div>';
  if (!$('#modal').open) $('#modal').showModal();
  const seek = $('#attemptReplaySeek'), play = $('#attemptReplayPlay');
  let position = 0, playing = true, previous = performance.now();
  function paint() {
    for (const player of sessions) {
      if (!player.replay) continue;
      const data = player.replay, key = suffix(player.index), words = $('#attemptReplayWords' + key);
      const time = Math.min(position, data.durationMs);
      const parsed = parseTyping(replayValueAt(data.events, time), false, data.target);
      words.innerHTML = typingPassageMarkup(data.target, parsed.text, parsed.spaceTypos);
      const cursor = words.querySelector('.cursor');
      if (cursor) words.scrollTop = Math.max(0, cursor.offsetTop - words.clientHeight / 2);
      const speeds = replaySpeedsAt(player.readings, time);
      $('#attemptReplayAverage' + key).textContent = speeds.average;
      $('#attemptReplayInstant' + key).textContent = speeds.instant;
      if (racers) {
        $('#attemptReplayProgress' + key).style.width = Math.min(parsed.text.length / data.target.length * 100, 100) + '%';
      }
    }
    seek.value = position;
    $('#attemptReplayTime').textContent = (position / 1000).toFixed(2) + 's / ' + (durationMs / 1000).toFixed(2) + 's';
    play.textContent = playing ? 'pause' : 'play';
  }
  play.onclick = () => {
    if (position >= durationMs) position = 0;
    playing = !playing;
    previous = performance.now();
    paint();
  };
  $('#attemptReplayRestart').onclick = () => { position = 0; playing = true; previous = performance.now(); paint(); };
  seek.oninput = () => { position = Number(seek.value); previous = performance.now(); paint(); };
  if ($('#closeAttemptReplay')) $('#closeAttemptReplay').onclick = () => $('#modal').close();
  paint();
  play.focus();
  const playback = setInterval(() => {
    if (!seek.isConnected || !$('#modal').open) { clearInterval(playback); return; }
    const now = performance.now();
    if (playing) {
      position = Math.min(durationMs, position + now - previous);
      if (position >= durationMs) playing = false;
      paint();
    }
    previous = now;
  }, 50);
}
function retrySavedAttempt(result) {
  if (!result?.replay) return;
  if (window.friendRace?.active) {
    window.friendRace.requestLeave(() => retrySavedAttempt(result));
    return;
  }
  const data = result.replay;
  // Journey retries are independent verse tests and do not rewind journey progress.
  switchTypingMenu('typing');
  mode = result.mode === 'book' ? 'quote' : result.mode;
  lastTypingMode = mode;
  limit = result.limit;
  capitalization = result.mode === 'book' || result.capitalization === true;
  punctuation = result.mode === 'book' || result.punctuation === true;
  rawTarget = data.rawTarget;
  testReferences = [...data.references];
  if (result.reference) testReferences = [result.reference];
  testSourceRanges = data.sourceRanges.map(source => ({ ...source }));
  // reset(true) normally regenerates a completed journey; this is a separate test.
  reset(true);
  target = data.target;
  input.disabled = !target.length;
  $('#modes').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  $('#punct').classList.toggle('active', punctuation);
  $('#punct').setAttribute('aria-pressed', String(punctuation));
  render(false);
  $('#modal').close();
  input.focus();
}
$('#replayResult').onclick = () => openAttemptReplay(currentReplayResult());
$('#retryResult').onclick = () => retrySavedAttempt(currentReplayResult());

$('#raceAgainstResult').onclick = () => window.friendRace.raceReplay(currentReplayResult());

$('#replayAllResult').onclick = () => {
  const result = history.find(result => result.id === lastResultId);
  openRaceReplay(result?.raceReplay ? result : { raceReplay: window.friendRace?.getReplay?.() });
};
