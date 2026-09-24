import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CARDS, DECK_GROUPS, DEFAULT_DECK_ID, isDeckId, getDeck } from '../decks.js';

const decks = DECK_GROUPS.flatMap((g) => g.decks);

test('picker has verbs, nouns and mixed groups', () => {
  assert.deepEqual(DECK_GROUPS.map((g) => g.label), ['Verbs', 'Nouns', 'Mixed']);
  assert.equal(decks.length, 11);
  assert.equal(new Set(decks.map((d) => d.id)).size, decks.length);
});

test('deck sizes and units', () => {
  assert.equal(getDeck('core').cards.length, 50);
  assert.equal(getDeck('people').cards.length, 50);
  assert.equal(getDeck('all-verbs').cards.length, 200);
  assert.equal(getDeck('all-nouns').cards.length, 200);
  assert.equal(getDeck('all').cards.length, 400);
  assert.equal(getDeck('core').unit, 'verbs');
  assert.equal(getDeck('school').unit, 'nouns');
  assert.equal(getDeck('all').unit, 'words');
  for (const d of decks) assert.ok(d.label.endsWith(`(${d.cards.length})`), d.label);
});

test('card ids are unique across verbs and nouns', () => {
  assert.equal(ALL_CARDS.length, 400);
  assert.equal(new Set(ALL_CARDS.map((c) => c.id)).size, 400);
});

test('unknown deck ids fall back to the default', () => {
  assert.equal(isDeckId('nope'), false);
  assert.equal(isDeckId(null), false);
  assert.equal(getDeck('nope').id, DEFAULT_DECK_ID);
});
