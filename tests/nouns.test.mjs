import test from 'node:test';
import assert from 'node:assert/strict';
import { NOUN_DECKS, NOUNS } from '../nouns.js';
import { VERBS } from '../verbs.js';

test('4 noun decks of exactly 50, 200 total', () => {
  assert.equal(NOUN_DECKS.length, 4);
  for (const d of NOUN_DECKS) assert.equal(d.cards.length, 50, d.id);
  assert.equal(NOUNS.length, 200);
});

test('every noun is unique and none repeat a verb', () => {
  const keys = NOUNS.map((n) => `${n.kanji ?? ''}|${n.kana}`);
  assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i), []);
  const verbKeys = new Set(VERBS.map((v) => `${v.kanji ?? ''}|${v.kana}`));
  assert.deepEqual(keys.filter((k) => verbKeys.has(k)), []);
});

test('all fields are present and well formed', () => {
  for (const n of NOUNS) {
    assert.equal(n.kind, 'noun');
    assert.ok(/^[ぁ-ゟ]+$/.test(n.kana), `${n.id}: kana must be hiragana (${n.kana})`);
    assert.ok(n.english.length > 0 && !n.english.startsWith('to '), `${n.id}: english`);
    assert.equal(n.polite, undefined);
    if (n.kanji) assert.ok(/[一-鿿]/.test(n.kanji), `${n.id}: kanji field has no kanji`);
  }
});

test('kana in the kanji spelling matches the reading', () => {
  for (const n of NOUNS.filter((x) => x.kanji)) {
    const head = n.kanji.match(/^[ぁ-ゟ]*/)[0];
    const tail = n.kanji.match(/[ぁ-ゟ]*$/)[0];
    assert.ok(n.kana.startsWith(head) && n.kana.endsWith(tail), `${n.id}: ${n.kanji} vs ${n.kana}`);
  }
});

test('no CJK radical lookalikes', () => {
  for (const n of NOUNS) assert.ok(!/[⺀-⿟]/.test((n.kanji ?? '') + n.kana), n.id);
});

test('hiragana-only nouns are the ones normally written in kana', () => {
  assert.deepEqual(NOUNS.filter((n) => !n.kanji).map((n) => n.kana).sort(), ['かばん']);
});
