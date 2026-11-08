const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
function element() {
  return { children: [], dataset: {}, style: {}, parentElement: {}, value: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    append(...children) { this.children.push(...children);for(const child of children)child.parentElement=this; },
    remove(){if(this.parentElement?.children)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);},
    replaceChildren() { this.children = []; }, setAttribute() {},
    querySelectorAll: () => [], addEventListener() {}, focus() {}, blur() {},
    close() { this.open = false; }, showModal() { this.open = true; } };
}
let now = 1000, nextTimer = 0, celebrations = 0, peerCalls = 0;
const timers = new Map();
const context = vm.createContext({
  $: selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  },
  document: { createElement: element, querySelectorAll: () => [], body: { classList: { add() {}, remove() {}, toggle() {} } } },
  window: { addEventListener() {}, history: { replaceState() {} } },
  location: { href: 'http://localhost/', origin: 'http://localhost', pathname: '/' }, URL,
  Date: class extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} },
  Peer: function() { peerCalls++; throw new Error('Ghost races must not connect to a server'); },
  setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; },
  clearInterval: id => timers.delete(id), setTimeout: () => 0, clearTimeout() {},
  getProfileName: () => 'Player', setReadingView() {}, syncNavigation() {}, updateBookProgress() {}, renderBookContext() {},
  pauseMenu() {}, currentMenu: 'typing', mode: 'words', limit: 25, punctuation: false, capitalization: false,
  target: '', rawTarget: '', typed: '', done: true, start: 0, timer: null,
  total: 0, errors: 0, history: [], lastResultId: 'local-result', scriptureReferences: [], scriptureLines: [], input: element(),
  localStorage: {setItem() {}},saveTypingHistory(){return true;},
  reset() { context.typed = ''; context.done = false; context.input.value = ''; context.start = 0; },
  render() {}, drawChart() {}, sampleWpm() {}, speed: () => 36,
  enterTyping() {}, enterBook() {}, switchTypingMenu: destination => { context.currentMenu = destination; },
  celebrateJourney: () => { celebrations++; },
});
context.finish = (saveResult = true) => {
  context.done = true;
  if (saveResult) {
    context.history.unshift({ id: 'local-result', date: 'new saved attempt', mode: context.mode, limit: context.limit, wpm: 36, accuracy: 100, replay: context.captureAttemptReplay() });
    context.lastResultId = 'local-result';
  } else context.lastResultId = '';
  context.window.friendRace.report(true, now - context.start);
};
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(app.slice(app.indexOf('function parseTyping('), app.indexOf('function render(smooth')), context);
vm.runInContext(app.slice(app.indexOf('function averageCorrectCharacters('), app.indexOf('function speed()')), context);
const replay = fs.readFileSync(path.join(root, 'replay.js'), 'utf8');
vm.runInContext(replay.slice(replay.indexOf('function buildReplayReadings('), replay.indexOf('function openAttemptReplay(')), context);
vm.runInContext(fs.readFileSync(path.join(root, 'race.js'), 'utf8'), context);
const result = { mode: 'words', limit: 10, date: 'saved attempt', wpm: 18, accuracy: 100,
  replay: { target: 'cat', rawTarget: 'cat', durationMs: 2000,
    events: [{ time: 0, at: 0, remove: 0, text: 'c' },
      { time: 500, at: 1, remove: 0, text: 'a' }, { time: 2000, at: 2, remove: 0, text: 't' }] } };
context.captureAttemptReplay = () => ({target:context.target,rawTarget:context.rawTarget,
  durationMs:now-context.start,events:[{time:0,at:0,remove:0,text:context.input.value}],references:[],sourceRanges:[]});
const data = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
vm.runInContext(data.slice(data.indexOf('function validateAttemptReplay('),data.indexOf('function getProfileName(')),context);
result.replay.references=[];
result.replay.sourceRanges=[];
const api = context.window.friendRace;
api.raceReplay(result);
assert(api.active);
assert(!api.running);
assert.equal(peerCalls, 0);
assert.equal(elements.get('#raceTitle').textContent, 'race against replay');
assert.equal(elements.get('#raceInvite').hidden, true);
assert.equal(elements.get('#raceDurationForm').hidden, true);
assert.equal(elements.get('#raceCountdownValue').textContent, 3);
assert.equal(context.target, 'cat');
function tick(time) { now = time; for (const callback of [...timers.values()]) callback(); }
function ghostRow() { return elements.get('#racers').children.find(row => row.children[0].textContent.startsWith('replay ·')); }
tick(4000);
assert(api.running, 'countdown must automatically start the race');
assert(Math.abs(parseFloat(ghostRow().children[1].children[0].style.width) - 100 / 3) < 0.001);
tick(4500);
assert(Math.abs(parseFloat(ghostRow().children[1].children[0].style.width) - 200 / 3) < 0.001);
now = 5000;
context.typed = context.input.value = 'cat';
context.finish();
assert.equal(celebrations, 0, 'wait for replay to finish before declaring a winner');
tick(6000);
assert(!api.running);
assert.equal(celebrations, 1);
assert.equal(ghostRow().children[1].children[1].textContent, '2nd');
assert.equal(context.history.length, 1, 'the replay opponent must not create a history entry');
assert.equal(context.history[0].raceReplay.participants.length, 2, 'save both race participants');
assert.equal(elements.get('#replayAllResult').hidden, false);
elements.get('#startRace').onclick();
assert.equal(context.done, false);
assert.equal(elements.get('#raceCountdownValue').textContent, 3);
assert.equal(ghostRow().children[1].children[0].style.width, '0%');
api.requestLeave();
elements.get('#confirmLeaveRace').onclick();
assert(!api.active);
assert.equal(timers.size, 0, 'leaving must clear the race clock');
assert.equal(context.currentMenu, 'raceLobby');
assert.equal(elements.get('#raceLobby').hidden,false,'leaving returns to the race room browser');
api.raceReplay({ ...result, mode: 'time', limit: 2 });
tick(9000);
tick(11000);
assert(context.done, 'timed replay races end at the original time limit');
assert(!api.running);
assert.equal(peerCalls, 0);
console.log('Ghost race checks passed: offline auto-start, timed progress, finish order, winner, rematch, leave, and fixed time limits.');
// Exercise the same collection path with a remote human participant.
api.requestLeave();
elements.get('#confirmLeaveRace').onclick();
let hostPeer;
context.Peer = function() {
  hostPeer = this;
  this.handlers = {};
  this.on = (type, callback) => { this.handlers[type] = callback; };
  this.destroy = () => {};
};
context.crypto = { getRandomValues: array => array.fill(1) };
context.localStorage.getItem = () => 'Host';
context.updateProfileLabel = () => {};
context.scriptureLines = ['cat'];
context.scriptureReferences = ['John 1:1'];
let lobbyRoomsCallback;
context.window.raceRooms={start:callback=>{lobbyRoomsCallback=callback;},setRoom(){}};
elements.get('#friends').onclick();
assert.equal(elements.get('#raceLobby').hidden,false);
assert.equal(context.currentMenu,'raceLobby');
assert.equal(elements.get('#modal').open,false,'room browser is inline, not a popup');
lobbyRoomsCallback([
 {code:'11112222',name:'Open room',count:2,phase:'lobby'},
 {code:'33334444',name:'Full room',count:8,phase:'lobby'},
 {code:'55556666',name:'Racing room',count:3,phase:'racing'}
],'ready');
const roomRows=elements.get('#availableRooms').children;
assert.equal(roomRows.length,3);
assert.equal(roomRows[0].children[1].children[0].disabled,false);
assert.equal(roomRows[0].children[1].children[1].textContent,'watch');
assert.equal(roomRows[0].children[1].children[1].disabled,false);
assert.equal(roomRows[1].children[1].children[0].disabled,true);
assert.equal(roomRows[1].children[1].children[1].disabled,false,'full idle rooms still allow watching');
assert.equal(roomRows[2].children[1].children[0].disabled,false);
assert.equal(roomRows[2].children[1].children[0].textContent,'queue');
assert.equal(roomRows[2].children[1].children[1].textContent,'watch');
lobbyRoomsCallback([],'unavailable');
assert.equal(elements.get('#createRoom').disabled,false);
assert.equal(elements.get('#joinRoom').disabled,false);
assert(elements.get('#roomDirectoryStatus').textContent.includes('join by code'));
elements.get('#createRoom').onclick();
hostPeer.handlers.open('host-player');
const messages = [], callbacks = {};
const connection = { peer: 'remote-player', open: true, metadata: { name: 'Friend' },
  on: (type, callback) => { callbacks[type] = callback; }, send: message => messages.push(message) };
hostPeer.handlers.connection(connection);
callbacks.open();
elements.get('#startRace').onclick();
const raceStart = messages.find(message => message.type === 'start');
assert(raceStart, 'host starts and broadcasts a normal friend race');
tick(14000);
callbacks.data({ type: 'attemptReplay', round: raceStart.round, replay: result.replay });
callbacks.data({ type: 'progress', round: raceStart.round, progress: 100, finished: true,
  finishMs: 2000, wpm: 18, accuracy: 100, passageComplete: true });
now = 16000;
context.typed = context.input.value = 'cat';
context.finish();
const recording = messages.find(message => message.type === 'roundReplay');
assert(recording, 'host shares the completed race recording');
assert.equal(recording.replay.participants.length, 2);
assert(recording.replay.participants.every(player => player.replay));
assert.equal(context.history[0].raceReplay.participants.length, 2);
assert.equal(recording.replay.participants.find(player => player.name === 'Friend').replay.events.length, 3);
console.log('Multiplayer recording checks passed: receive participant edits, persist all racers, and broadcast synchronized race replay.');
api.requestLeave();
elements.get('#confirmLeaveRace').onclick();
const guestMessages = [], guestCallbacks = {};
const guestConnection = {open:true,on:(type,callback)=>{guestCallbacks[type]=callback;},send:message=>guestMessages.push(message)};
context.Peer = function() {
  hostPeer=this;this.handlers={};this.on=(type,callback)=>{this.handlers[type]=callback;};
  this.destroy=()=>{};this.connect=()=>guestConnection;
};
elements.get('#friends').onclick();
elements.get('#roomCode').value='01010101';
elements.get('#joinRoom').onclick();elements.get('#confirmJoinRoom').onclick();
hostPeer.handlers.open('guest-player');
guestCallbacks.data({type:'roster',round:0,phase:'lobby',players:{
  'guest-player':{name:'Guest',connected:true,finished:false,wpm:0,progress:0},
  'other-player':{name:'Other',connected:true,finished:false,wpm:0,progress:0}
},preview:{text:'cat',custom:false,duration:10,formatting:false}});
guestCallbacks.data({type:'start',round:1,text:'cat',duration:10,custom:false,formatting:false});
tick(19000);
now=21000;context.typed=context.input.value='cat';context.finish();
const sentReplayIndex=guestMessages.findIndex(message=>message.type==='attemptReplay');
const sentFinishIndex=guestMessages.findIndex(message=>message.type==='progress'&&message.finished);
assert(sentReplayIndex>=0&&sentFinishIndex>sentReplayIndex, 'send recording before terminal progress');
const guestRaceReplay={participants:recording.replay.participants.map((player,index)=>({...player,id:index?'other-player':'guest-player'}))};
guestCallbacks.data({type:'roundReplay',round:1,replay:guestRaceReplay});
assert.equal(context.history[0].raceReplay.participants.length,2,'guest saves full shared replay');
guestCallbacks.data({type:'roster',round:1,phase:'finished',players:{
 'guest-player':{name:'Guest',connected:true,finished:true,progress:100,wpm:36},
 'other-player':{name:'Other',connected:true,finished:true,progress:100,wpm:18}
}});
assert.equal(elements.get('#replayAllResult').hidden,false);
console.log('Guest recording checks passed: upload once before finishing and save the shared round replay.');

api.requestLeave();
elements.get('#confirmLeaveRace').onclick();
api.raceReplay(result);
tick(24000);
tick(24500);
const historyBeforeRestart=context.history.length;
assert(api.running);
api.restartReplay();
assert.equal(elements.get('#restartReplayDialog').open,true);
assert(api.running,'opening confirmation must not restart the race');
elements.get('#cancelRestartReplay').onclick();
assert.equal(elements.get('#restartReplayDialog').open,false);
assert(api.running,'cancel keeps the same race running');
api.restartReplay();
elements.get('#confirmRestartReplay').onclick();
assert.equal(elements.get('#restartReplayDialog').open,false);
assert(!api.running);
assert.equal(elements.get('#raceCountdownValue').textContent,3);
assert.equal(ghostRow().children[1].children[0].style.width,'0%');
assert.equal(context.typed,'');
assert.equal(context.history.length,historyBeforeRestart,'restart does not save an incomplete attempt');
assert.equal(timers.size,1,'restart replaces the old race clock');
tick(27500);
assert(api.running);
console.log('Replay race restart checks passed: both racers reset, fresh countdown, one clock, no extra history.');

tick(29500);
assert.equal(elements.get('#giveUpRace').hidden,false);
const historyBeforeGiveUp=context.history.length;
const previousRaceRecording=context.history[0].raceReplay;
context.history[0].wpm=999;
elements.get('#giveUpRace').onclick();
assert.equal(context.history.length,historyBeforeGiveUp);
assert.equal(context.history[0].raceReplay,previousRaceRecording,'give up must not attach recordings to an older score');
let giveUpRecording;
context.openRaceReplay=result=>{giveUpRecording=result.raceReplay;};
context.openRaceReplay({raceReplay:api.getReplay()});
const gaveUpParticipant=giveUpRecording.participants.find(player=>player.gaveUp);
assert(gaveUpParticipant,'give up remains in race standings and replay');
assert.equal(gaveUpParticipant.wpm,36,'give up must not use an older saved WPM');
console.log('Give-up race checks passed: no history entry or old-score mutation, accurate standings, and shared replay retained.');

assert.equal(elements.get('#raceNewAttempt').hidden,true,'no new-attempt race after giving up');
api.requestLeave();
elements.get('#confirmLeaveRace').onclick();
api.raceReplay({...result,mode:'time',limit:2});
tick(32500);
now=33000;context.typed=context.input.value='cat';context.finish();
tick(34500);
assert.equal(elements.get('#raceNewAttempt').hidden,false);
const newAttempt=context.history[0];
elements.get('#raceNewAttempt').onclick();
assert.equal(elements.get('#raceCountdownValue').textContent,3);
assert.equal(elements.get('#raceNewAttempt').hidden,true);
assert(ghostRow().children[0].textContent.includes(newAttempt.date));
tick(37500);
assert(elements.get('#counter').textContent.startsWith('2s'),'show the fixed time remaining');
tick(38000);
assert(ghostRow().children[2].textContent.includes('finished'),'new ghost finishes at the latest attempt timing');
tick(39500);
assert(context.done,'new-attempt race retains the previous time limit');
console.log('New-attempt opponent checks passed: saved attempt selection, automatic countdown, new timing, fixed time limit, give-up exclusion.');
// Joining a running room can watch or queue without entering its active race.
api.requestLeave();elements.get('#confirmLeaveRace').onclick();
context.Peer=function(){hostPeer=this;this.handlers={};this.on=(type,callback)=>{this.handlers[type]=callback;};this.destroy=()=>{};};
elements.get('#friends').onclick();elements.get('#createRoom').onclick();hostPeer.handlers.open('watch-host');
function addGuest(id,intent){
 const handlers={},messages=[];
 const link={peer:id,open:true,metadata:{name:id,intent},on:(type,callback)=>{handlers[type]=callback;},send:message=>messages.push(JSON.parse(JSON.stringify(message)))};
 hostPeer.handlers.connection(link);handlers.open();return {handlers,messages};
}
const activeRacer=addGuest('active-racer','join');
elements.get('#startRace').onclick();tick(42500);
const waiting=addGuest('waiting-racer','queue');
const viewer=addGuest('view-only','watch');
let roster=waiting.messages.filter(message=>message.type==='roster').at(-1);
assert.equal(roster.players['waiting-racer'].role,'queued');
assert.equal(roster.players['view-only']?.role,'watcher');
assert.equal(elements.get('#racers').children.length,2,'spectators are not competing racers');
viewer.handlers.data({type:'progress',round:roster.round,progress:100,finished:true,wpm:500});
assert.equal(elements.get('#racers').children.length,2,'spectator progress cannot enter standings');
activeRacer.handlers.data({type:'progress',round:roster.round,progress:100,position:3,finished:true,finishMs:2000,wpm:18,accuracy:100,passageComplete:true});
now=44500;context.typed=context.input.value='cat';context.finish();
assert(!api.running,'viewers and queued racers do not delay round completion');
elements.get('#startRace').onclick();
roster=waiting.messages.filter(message=>message.type==='roster').at(-1);
assert.equal(roster.players['waiting-racer'].role,'racer','queued racer is promoted before rematch');
assert.equal(roster.players['view-only'].role,'watcher','watching alone never auto-queues');
assert.equal(elements.get('#racers').children.length,3);
viewer.handlers.data({type:'queue'});
roster=waiting.messages.filter(message=>message.type==='roster').at(-1);
assert.equal(roster.players['view-only'].role,'queued','viewer can opt into the queue');
console.log('Watch and queue host checks passed: live admission, spectator isolation, nonblocking finish, ordered rematch promotion, opt-in queue.');
// A watcher client stays read-only, then participates after host promotion.
api.requestLeave();elements.get('#confirmLeaveRace').onclick();
const watchMessages=[],watchHandlers={};
const watchConnection={open:true,on:(type,callback)=>{watchHandlers[type]=callback;},send:message=>watchMessages.push(message)};
context.Peer=function(){hostPeer=this;this.handlers={};this.on=(type,callback)=>{this.handlers[type]=callback;};this.destroy=()=>{};this.connect=()=>watchConnection;};
elements.get('#friends').onclick();elements.get('#roomCode').value='01010101';elements.get('#joinRoom').onclick();elements.get('#confirmJoinRoom').onclick();hostPeer.handlers.open('watch-self');
const watchedPlayers={
 'watch-self':{name:'Viewer',role:'watcher',connected:true,finished:false,progress:0,wpm:0},
 'other-racer':{name:'Racer',role:'racer',connected:true,finished:false,progress:50,wpm:50}
};
const watchRoster={type:'roster',round:9,phase:'racing',players:watchedPlayers,
 preview:{text:'cat',custom:false,duration:10,formatting:false},clock:{untilStartMs:0,elapsedMs:1000,duration:10}};
const historyBeforeWatching=context.history.length;
watchHandlers.data(watchRoster);
assert(api.spectating);assert(!api.running);assert(context.input.disabled);
assert(elements.get('#counter').textContent.includes('watching'));
assert.equal(elements.get('#queueRace').hidden,false);
elements.get('#queueRace').onclick();
assert(watchMessages.some(message=>message.type==='queue'));
watchHandlers.data({...watchRoster,players:{...watchedPlayers,'watch-self':{...watchedPlayers['watch-self'],role:'queued'}}});
assert(elements.get('#raceStatus').textContent.includes('Queued'));
watchHandlers.data({type:'start',round:10,text:'cat',custom:false,duration:10,formatting:false});
tick(47500);
assert(!api.running);assert(context.input.disabled);
assert.equal(context.history.length,historyBeforeWatching,'watching must not save a typing result');
assert(!watchMessages.some(message=>message.type==='progress'),'watcher does not submit typing progress');
watchHandlers.data({...watchRoster,round:10,phase:'finished',players:{...watchedPlayers,'watch-self':{...watchedPlayers['watch-self'],role:'racer'}}});
watchHandlers.data({type:'start',round:11,text:'cat',custom:false,duration:10,formatting:false});
tick(50500);
assert(!api.spectating);assert(api.running);assert(!context.input.disabled);
console.log('Watch and queue guest checks passed: read-only live view, queue request, no scores/progress, and promoted racer countdown.');
api.requestLeave();elements.get('#confirmLeaveRace').onclick();
const peerBeforePopup=hostPeer;
elements.get('#joinRoom').onclick();
assert.equal(elements.get('#joinCodeDialog').open,true);
assert.equal(hostPeer,peerBeforePopup,'opening code popup must not connect yet');
elements.get('#roomCode').value='';elements.get('#confirmJoinRoom').onclick();
assert.equal(elements.get('#joinCodeDialog').open,true);
assert(elements.get('#roomCodeError').textContent.includes('8-character'));
elements.get('#roomCode').value='55556666';elements.get('#roomCode').oninput();
assert.equal(elements.get('#roomCodeError').textContent,'');
elements.get('#cancelJoinCode').onclick();
assert.equal(elements.get('#joinCodeDialog').open,false);
assert(!api.active);
console.log('Room-code popup checks passed: open without connecting, inline validation, error clearing, and cancel.');
// Hosts can keep rooms unlisted and remove a viewer after confirming.
context.Peer=function(){hostPeer=this;this.handlers={};this.on=(type,callback)=>{this.handlers[type]=callback;};this.destroy=()=>{};};
const listings=[];context.window.raceRooms={start(){},setRoom:value=>listings.push(value)};
elements.get('#createPrivateRoom').onclick();hostPeer.handlers.open('private-host');
assert.equal(elements.get('#createRoom').disabled,true);
assert.equal(elements.get('#createPrivateRoom').disabled,true);
assert(listings.length&&listings.every(value=>value===null),'private rooms never advertise');
assert(elements.get('#roomPrivacyStatus').textContent.includes('private'));
elements.get('#roomVisibility').onclick();assert(listings.at(-1)?.code,'host can make a room public');
elements.get('#roomVisibility').onclick();assert.equal(listings.at(-1),null);
const removedViewer=addGuest('remove-viewer','watch');
const audienceRow=elements.get('#raceAudience').children[0];audienceRow.children[1].onclick();
assert.equal(elements.get('#removeRacerDialog').open,true);
elements.get('#confirmRemoveRacer').onclick();
assert(removedViewer.messages.some(message=>message.type==='removed'));
assert.equal(elements.get('#raceAudience').children.length,0);
console.log('Room privacy and moderation checks passed: unlisted creation, visibility toggle, confirmed viewer removal.');

const roomGuest=addGuest('room-chatter','watch');
roomGuest.handlers.data({type:'chat-message',text:'<img src=x onerror=alert(1)>'});
const chat=elements.get('#roomChatLog').children;
assert.equal(chat.length,1);
assert.equal(chat[0].children[0].textContent,'room-chatter');
assert.equal(chat[0].children[2].textContent,' · <img src=x onerror=alert(1)>','chat uses literal text, not HTML');
assert(roomGuest.messages.some(message=>message.type==='roomChat'));
roomGuest.handlers.data({type:'chat-message',text:'too fast'});assert.equal(chat.length,1);
const lateRoomGuest=addGuest('late-room-viewer','watch');
assert.equal(lateRoomGuest.messages.find(message=>message.type==='roomChatHistory').messages.length,1);
now+=1100;
elements.get('#roomChatInput').value='host reply';elements.get('#roomChatForm').onsubmit({preventDefault(){}});
assert.equal(elements.get('#roomChatInput').value,'');assert.equal(elements.get('#roomChatLog').children.length,2);
assert(roomGuest.messages.some(message=>message.type==='roomChat'&&message.message.text==='host reply'));
console.log('Room chat checks passed: watcher sending, host relay, literal HTML text, throttling, late history, composer clearing.');

api.requestLeave();elements.get('#confirmLeaveRace').onclick();
assert.equal(elements.get('#roomChatLog').children.length,0,'room messages clear on leave');
console.log('Room chat cleanup passed: leaving clears the room transcript.');
elements.get('#createRoom').onclick();hostPeer.handlers.open('chat-lock-host');
const typingGuest=addGuest('typing-guest','join'),chatViewer=addGuest('chat-viewer','watch');
elements.get('#startRace').onclick();
assert.equal(elements.get('#roomChatInput').disabled,true);
assert.equal(elements.get('#roomChatSend').disabled,true);
elements.get('#roomChatInput').value='blocked during race';elements.get('#roomChatForm').onsubmit({preventDefault(){}});
assert.equal(elements.get('#roomChatLog').children.length,0);
typingGuest.handlers.data({type:'chat-message',text:'bypass attempt'});
assert.equal(elements.get('#roomChatLog').children.length,0,'host rejects racer chat during countdown');
chatViewer.handlers.data({type:'chat-message',text:'watchers can chat'});
assert.equal(elements.get('#roomChatLog').children.length,1);
assert(/\d+:\d{2}:\d{2}/.test(elements.get('#roomChatLog').children[0].children[1].textContent),'timestamps include seconds');
const chatRound=typingGuest.messages.filter(message=>message.type==='start').at(-1).round;
const chatStart=now+3000;tick(chatStart);
typingGuest.handlers.data({type:'chat-message',text:'still blocked'});
assert.equal(elements.get('#roomChatLog').children.length,1);
typingGuest.handlers.data({type:'progress',round:chatRound,progress:100,position:3,finished:true,finishMs:1000,wpm:36,accuracy:100,passageComplete:true});
now=chatStart+1000;context.typed=context.input.value='cat';context.finish();
assert.equal(elements.get('#roomChatInput').disabled,false);
assert.equal(elements.get('#roomChatSend').disabled,false);
elements.get('#roomChatForm').onsubmit({preventDefault(){}});
assert.equal(elements.get('#roomChatInput').value,'');
assert.equal(elements.get('#roomChatLog').children.length,2,'racers can send after the round ends');
console.log('Racer chat restriction checks passed: disabled UI, host enforcement, spectator access, seconds, and post-round recovery.');
