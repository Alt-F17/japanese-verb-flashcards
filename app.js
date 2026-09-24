import { DECKS, VERBS, ALL_DECK_ID, verbsForDeck } from './verbs.js';
import { createDeck, current, isDone, total, markCorrect, markIncorrect, reshuffle, reset } from './deck.js';

const STORAGE_KEY = 'jvf.deck';
const byId = new Map(VERBS.map((v) => [v.id, v]));
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
};

let deckId = loadDeckId();
let state = createDeck(verbsForDeck(deckId).map((v) => v.id));
let flipped = false;

function loadDeckId() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === ALL_DECK_ID || DECKS.some((d) => d.id === saved)) return saved;
  } catch {}
  return DECKS[0].id;
}

function saveDeckId(id) {
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
}

function buildDeckOptions() {
  const options = DECKS.map((d, i) => [d.id, `Deck ${i + 1}: ${d.label} (${d.verbs.length})`]);
  options.push([ALL_DECK_ID, `All ${VERBS.length} verbs`]);
  for (const [value, label] of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    el.deckSelect.append(opt);
  }
  el.deckSelect.value = deckId;
}

function dictionaryLine(verb) {
  const seg = (text) => {
    const s = document.createElement('span');
    s.className = 'seg';
    s.textContent = text;
    return s;
  };
  if (!verb.kanji) return [seg(verb.kana)];
  const first = seg(verb.kanji);
  const sep = document.createElement('span');
  sep.className = 'sep';
  sep.textContent = '｜';
  first.append(sep);
  return [first, document.createElement('wbr'), seg(verb.kana)];
}

function setFlipped(value) {
  flipped = value;
  el.card.classList.toggle('is-flipped', flipped);
  el.front.setAttribute('aria-hidden', String(flipped));
  el.back.setAttribute('aria-hidden', String(!flipped));
}

// Swap content with the flip transition off so the next card's English never shows mid-animation.
function showCurrentCard() {
  const verb = byId.get(current(state));
  if (!verb) return;
  el.cardInner.classList.add('no-anim');
  setFlipped(false);
  el.dict.replaceChildren(...dictionaryLine(verb));
  el.polite.textContent = verb.polite;
  el.english.textContent = verb.english;
  el.backJa.textContent = verb.kanji ? `${verb.kanji}（${verb.kana}）` : verb.kana;
  el.card.classList.add('entering');
  void el.card.offsetWidth;
  el.card.classList.remove('entering');
  el.cardInner.classList.remove('no-anim');
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
    el.doneText.textContent = `🎉 All ${total(state)} verbs completed!`;
    el.resetDeckBtn.focus({ preventScroll: true });
  } else {
    showCurrentCard();
  }
}

function startDeck(id) {
  deckId = id;
  saveDeckId(id);
  state = createDeck(verbsForDeck(id).map((v) => v.id));
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

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target === el.deckSelect) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); onCorrect(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); onIncorrect(); }
  else if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement) && !isDone(state)) {
    e.preventDefault();
    setFlipped(!flipped);
  }
});

buildDeckOptions();
render();
