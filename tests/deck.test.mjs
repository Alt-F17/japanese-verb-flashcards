import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, createDeck, current, isDone, total, markCorrect, markIncorrect, reshuffle, reset } from '../deck.js';

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = Array.from({ length: 50 }, (_, i) => `v${i}`);
const sorted = (a) => [...a].sort();

test('shuffle is a permutation and actually reorders', () => {
  const s = shuffle(ids, seeded(1));
  assert.deepEqual(sorted(s), sorted(ids));
  assert.notDeepEqual(s, ids);
});

test('new deck is shuffled with nothing completed', () => {
  const d = createDeck(ids, seeded(2));
  assert.equal(d.queue.length, 50);
  assert.equal(d.completed, 0);
  assert.equal(total(d), 50);
  assert.notDeepEqual(d.queue, ids);
});

test('correct removes the card for the round and updates progress', () => {
  const d = createDeck(ids, seeded(3));
  const card = current(d);
  const next = markCorrect(d);
  assert.equal(next.completed, 1);
  assert.equal(next.queue.length, 49);
  assert.ok(!next.queue.includes(card));
});

test('incorrect reinserts later, never immediately, at varied positions', () => {
  const positions = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const d = createDeck(ids, seeded(seed));
    const card = current(d);
    const next = markIncorrect(d, seeded(seed + 1000));
    assert.equal(next.queue.length, 50);
    assert.equal(next.completed, 0);
    const pos = next.queue.indexOf(card);
    assert.ok(pos >= 1, `card came back immediately (seed ${seed})`);
    positions.add(pos);
  }
  assert.ok(positions.size > 20, `only ${positions.size} distinct positions`);
});

test('incorrect on the last card keeps it', () => {
  let d = createDeck(['a', 'b']);
  d = markCorrect(d);
  const last = current(d);
  d = markIncorrect(d);
  assert.deepEqual(d.queue, [last]);
});

test('incorrect with two cards left puts it second', () => {
  let d = createDeck(['a', 'b', 'c'], seeded(4));
  d = markCorrect(d);
  const card = current(d);
  d = markIncorrect(d, seeded(5));
  assert.equal(d.queue[1], card);
});

test('shuffle gives a new order every press', () => {
  let d = createDeck(ids, seeded(6));
  for (let i = 0; i < 200; i++) {
    const next = reshuffle(d);
    assert.notDeepEqual(next.queue, d.queue);
    assert.deepEqual(sorted(next.queue), sorted(d.queue));
    d = next;
  }
  const two = createDeck(['a', 'b']);
  assert.notDeepEqual(reshuffle(two, () => 0).queue, two.queue);
});

test('shuffle keeps completed cards out', () => {
  let d = createDeck(ids, seeded(7));
  const gone = current(d);
  d = reshuffle(markCorrect(d), seeded(8));
  assert.ok(!d.queue.includes(gone));
  assert.equal(d.completed, 1);
});

test('a full session with misses always finishes at n/n', () => {
  for (let seed = 0; seed < 50; seed++) {
    const rng = seeded(seed);
    let d = createDeck(ids, rng);
    let steps = 0;
    while (!isDone(d)) {
      d = rng() < 0.35 ? markIncorrect(d, rng) : markCorrect(d);
      assert.ok(++steps < 10000);
    }
    assert.equal(d.completed, 50);
    assert.equal(current(d), null);
  }
});

test('reset restores every card in a new order', () => {
  let d = createDeck(ids, seeded(9));
  while (!isDone(d)) d = markCorrect(d);
  const fresh = reset(d, seeded(10));
  assert.equal(fresh.completed, 0);
  assert.equal(fresh.queue.length, 50);
  assert.deepEqual(sorted(fresh.queue), sorted(ids));
});
