import { ALL_CARDS, DECK_GROUPS, DEFAULT_DECK_ID, isDeckId, getDeck } from './decks.js';
import { createDeck, current, isDone, total, markCorrect, markIncorrect, reshuffle, reset } from './deck.js';
import {
  CAP_OPTIONS, normalizeSettings, startStopwatch, pauseStopwatch, resumeStopwatch, isRunning, elapsedMs, isCapped, formatElapsed,
} from './stopwatch.js';

const STORAGE_KEY = 'jvf.deck';
const SETTINGS_KEY = 'jvf.settings';
const byId = new Map(ALL_CARDS.map((c) => [c.id, c]));
const $ = (id) => document.getElementById(id);

const el = {
  deckSelect: $('deck-select'),
  completedText: $('completed-text'),
  remainingText: $('remaining-text'),
  progressBar: $('progress-bar'),
  progressFill: $('progress-fill'),
  shuffleBtn: $('shuffle-btn'),
  resetBtn: $('reset-btn'),
  study: $('study'),
  card: $('card'),
  cardInner: $('card-inner'),
  front: $('front'),
  back: $('back'),
  dict: $('dict'),
  polite: $('polite'),
  english: $('english'),
  backJa: $('back-ja'),
  done: $('done'),
  doneText: $('done-text'),
  resetDeckBtn: $('reset-deck-btn'),
  answers: $('answers'),
  correctBtn: $('correct-btn'),
  incorrectBtn: $('incorrect-btn'),
  stopwatch: $('stopwatch'),
  settingsBtn: $('settings-btn'),
  settings: $('settings'),
  settingsClose: $('settings-close'),
  stopwatchToggle: $('stopwatch-toggle'),
  stopwatchCap: $('stopwatch-cap'),
  capOptions: $('cap-options'),
};

let deckId = loadDeckId();
let state = createDeck(getDeck(deckId).cards.map((c) => c.id));
let flipped = false;
let settings = loadSettings();
let sw = null;
let tickId = 0;

function loadDeckId() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isDeckId(saved)) return saved;
  } catch {}
  return DEFAULT_DECK_ID;
}

function saveDeckId(id) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

function loadSettings() {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY))); } catch {}
  return normalizeSettings(null);
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

// Paused while the settings sheet is open or the tab is in the background.
const held = () => el.settings.open || document.hidden;

function drawStopwatch() {
  cancelAnimationFrame(tickId);
  const show = settings.stopwatch && sw !== null && !isDone(state);
  el.stopwatch.hidden = !show;
  if (!show) return;
  const now = performance.now();
  el.stopwatch.textContent = formatElapsed(elapsedMs(sw, now, settings.stopwatchCap), settings.stopwatchCap);
  if (isRunning(sw) && !isCapped(sw, now, settings.stopwatchCap)) tickId = requestAnimationFrame(drawStopwatch);
}

function restartStopwatch() {
  sw = startStopwatch(performance.now());
  if (held()) sw = pauseStopwatch(sw, performance.now());
  drawStopwatch();
}

function holdStopwatch() {
  if (sw) sw = pauseStopwatch(sw, performance.now());
  drawStopwatch();
}

function releaseStopwatch() {
  if (sw && !flipped && !held()) sw = resumeStopwatch(sw, performance.now());
  drawStopwatch();
}

function buildSettings() {
  for (const cap of CAP_OPTIONS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'stopwatch-cap';
    input.value = String(cap);
    const text = document.createElement('span');
    text.textContent = `${cap}s`;
    label.append(input, text);
    el.capOptions.append(label);
  }
  renderSettings();
}

function renderSettings() {
  el.stopwatchToggle.checked = settings.stopwatch;
  el.stopwatchCap.disabled = !settings.stopwatch;
  for (const input of el.capOptions.querySelectorAll('input')) {
    input.checked = Number(input.value) === settings.stopwatchCap;
  }
}

function updateSettings(patch) {
  const wasOn = settings.stopwatch;
  settings = normalizeSettings({ ...settings, ...patch });
  saveSettings();
  renderSettings();
  if (settings.stopwatch && !wasOn) {
    sw = null;
    if (!flipped) restartStopwatch();
  }
  drawStopwatch();
}

function buildDeckOptions() {
  for (const group of DECK_GROUPS) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const d of group.decks) optgroup.append(new Option(d.label, d.id));
    el.deckSelect.append(optgroup);
  }
  el.deckSelect.value = deckId;
}

function dictionaryLine(card) {
  const seg = (text) => {
    const s = document.createElement('span');
    s.className = 'seg';
    s.textContent = text;
    return s;
  };
  if (!card.kanji) return [seg(card.kana)];
  const first = seg(card.kanji);
  const sep = document.createElement('span');
  sep.className = 'sep';
  sep.textContent = '｜';
  first.append(sep);
  return [first, document.createElement('wbr'), seg(card.kana)];
}

function setFlipped(value) {
  flipped = value;
  if (flipped && sw) {
    sw = pauseStopwatch(sw, performance.now());
    drawStopwatch();
  }
  el.card.classList.toggle('is-flipped', flipped);
  el.front.setAttribute('aria-hidden', String(flipped));
  el.back.setAttribute('aria-hidden', String(!flipped));
}

// Swap content with the flip transition off so the next card's English never shows mid-animation.
function showCurrentCard() {
  const card = byId.get(current(state));
  if (!card) return;
  el.cardInner.classList.add('no-anim');
  setFlipped(false);
  el.dict.replaceChildren(...dictionaryLine(card));
  el.polite.textContent = card.polite ?? '';
  el.polite.hidden = !card.polite;
  el.english.textContent = card.english;
  el.backJa.textContent = card.kanji ? `${card.kanji}（${card.kana}）` : card.kana;
  el.card.classList.add('entering');
  void el.card.offsetWidth;
  el.card.classList.remove('entering');
  el.cardInner.classList.remove('no-anim');
  restartStopwatch();
}

function renderProgress() {
  const n = total(state);
  el.completedText.textContent = `${state.completed} / ${n} completed`;
  el.remainingText.textContent = `${n - state.completed} remaining`;
  el.progressBar.setAttribute('aria-valuemax', String(n));
  el.progressBar.setAttribute('aria-valuenow', String(state.completed));
  el.progressFill.style.width = `${n ? (state.completed / n) * 100 : 0}%`;
}

function render() {
  renderProgress();
  const done = isDone(state);
  el.study.hidden = done;
  el.answers.hidden = done;
  el.done.hidden = !done;
  el.shuffleBtn.disabled = done;
  if (done) {
    sw = null;
    drawStopwatch();
    el.doneText.textContent = `🎉 All ${total(state)} ${getDeck(deckId).unit} completed!`;
    el.resetDeckBtn.focus({ preventScroll: true });
  } else {
    showCurrentCard();
  }
}

function startDeck(id) {
  deckId = id;
  saveDeckId(id);
  state = createDeck(getDeck(id).cards.map((c) => c.id));
  render();
}

const inProgress = () => state.completed > 0 && !isDone(state);

function onCorrect() {
  if (isDone(state)) return;
  state = markCorrect(state);
  render();
}

function onIncorrect() {
  if (isDone(state)) return;
  state = markIncorrect(state);
  render();
}

function onShuffle() {
  state = reshuffle(state);
  render();
}

function onReset({ confirmFirst }) {
  if (confirmFirst && inProgress() && !confirm('Reset this deck? Your progress for this round will be cleared.')) return;
  state = reset(state);
  render();
}

function onDeckChange() {
  const next = el.deckSelect.value;
  if (inProgress() && !confirm('Switch decks? Your progress for this round will be cleared.')) {
    el.deckSelect.value = deckId;
    return;
  }
  startDeck(next);
}

el.card.addEventListener('click', () => setFlipped(!flipped));
el.correctBtn.addEventListener('click', onCorrect);
el.incorrectBtn.addEventListener('click', onIncorrect);
el.shuffleBtn.addEventListener('click', onShuffle);
el.resetBtn.addEventListener('click', () => onReset({ confirmFirst: true }));
el.resetDeckBtn.addEventListener('click', () => onReset({ confirmFirst: false }));
el.deckSelect.addEventListener('change', onDeckChange);

el.settingsBtn.addEventListener('click', () => {
  el.settings.showModal();
  holdStopwatch();
});
el.settingsClose.addEventListener('click', () => el.settings.close());
el.settings.addEventListener('close', releaseStopwatch);
el.settings.addEventListener('click', (e) => { if (e.target === el.settings) el.settings.close(); });
el.stopwatchToggle.addEventListener('change', () => updateSettings({ stopwatch: el.stopwatchToggle.checked }));
el.capOptions.addEventListener('change', (e) => updateSettings({ stopwatchCap: Number(e.target.value) }));
document.addEventListener('visibilitychange', () => (document.hidden ? holdStopwatch() : releaseStopwatch()));

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target === el.deckSelect || el.settings.open) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); onCorrect(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); onIncorrect(); }
  else if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement) && !isDone(state)) {
    e.preventDefault();
    setFlipped(!flipped);
  }
});

buildDeckOptions();
buildSettings();
render();
